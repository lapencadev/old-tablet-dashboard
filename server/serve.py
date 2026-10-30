#!/usr/bin/env python3
"""Serves the panel, proxies Home Assistant and keeps the shared state.

    python server/serve.py            # reads .env (HA_URL, HA_TOKEN …)

The Home Assistant token stays here: the tablet only talks to this server.
Inside Home Assistant OS (as a local app) it uses the supervisor token instead.

Endpoints
    /                      static files from panel/
    /ha/<path>             → HA_URL/<path> with the token (GET/POST)
    /panel/week            GET/POST the week chosen by hand
    /panel/checklist       GET ?date=YYYY-MM-DD / POST {date, id, done}
    /panel/recipe?q=dish   best matching recipe or null
"""
import http.server
import json
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import settings as settings_mod  # noqa: E402
from server.recipes import RecipeBook  # noqa: E402
from server.state import State  # noqa: E402

# Windows consoles and CI pipes default to a legacy code page; print UTF-8 so
# names with accents or emoji never crash a command.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def log(msg):
    sys.stderr.write(time.strftime("%H:%M:%S ") + msg + "\n")
    sys.stderr.flush()


DEMO_CONFIG_ES = """PANEL_CONFIG.LANG = 'es';
PANEL_CONFIG.ALERTS = [{ entity: 'input_boolean.laundry_waiting', text: '🧺 La lavadora ha terminado: ropa por tender', button: 'Ya está' }];
PANEL_CONFIG.DATE_ALERTS = [{ entity: 'input_datetime.vet_visit', text: '🐱 Veterinario', daysBefore: 7 }];
PANEL_CONFIG.CHECKLIST = [{ id: 'morning', icon: '☀️', label: 'Vitamina D', sub: 'con el desayuno', from: 7, to: 11 },
  { id: 'plants', icon: '🪴', label: 'Plantas', sub: 'regar', from: 18, to: 21 }];
PANEL_CONFIG.PHOTOS = [{ src: 'img/example-photo.svg', caption: 'Paseo del domingo' }];
"""


def make_handler(cfg, state, recipes):
    panel_dir = cfg["PANEL_DIR"]
    demo_lang = cfg.get("DEMO_LANG")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=panel_dir, **kw)

        def end_headers(self):
            # Old tablets cache aggressively; the panel must always be fresh.
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, fmt, *args):
            if self.path.startswith("/ha/") and len(args) > 1 and not str(args[1]).startswith("2"):
                log("HA %s → %s" % (self.path, args[1]))

        def send_json(self, obj, status=200):
            data = json.dumps(obj).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def read_json(self):
            length = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(length) or b"{}") if length else {}

        def proxy(self):
            if not cfg["HA_URL"] or not cfg["HA_TOKEN"]:
                return self.send_json({"error": "HA_URL / HA_TOKEN not configured"}, 503)
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else None
            req = urllib.request.Request(cfg["HA_URL"] + self.path[3:], data=body, method=self.command)
            req.add_header("Authorization", "Bearer " + cfg["HA_TOKEN"])
            req.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(req, timeout=15) as r:
                    status, data = r.status, r.read()
            except urllib.error.HTTPError as e:
                status, data = e.code, e.read()
            except Exception as e:  # HA down, DNS…
                status, data = 502, json.dumps({"error": str(e)}).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            url = urlparse(self.path)
            q = parse_qs(url.query)
            if url.path.startswith("/ha/"):
                return self.proxy()
            if url.path == "/panel/week":
                return self.send_json({"week": state.get_week()})
            if url.path == "/panel/checklist":
                try:
                    return self.send_json({"done": state.get_checklist((q.get("date") or [""])[0])})
                except ValueError as e:
                    return self.send_json({"error": str(e)}, 400)
            if url.path == "/panel/recipe":
                dish = (q.get("q") or [""])[0]
                try:
                    return self.send_json({"recipe": recipes.find(dish) if dish else None})
                except Exception as e:
                    log("Recipes: %s" % e)
                    return self.send_json({"recipe": None})
            if demo_lang == "es" and url.path in ("/config.js", "/data/menu.js"):
                data = (DEMO_CONFIG_ES if url.path == "/config.js" else
                        Path(panel_dir, "data", "menu.example.es.js").read_text(encoding="utf-8")).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                return self.wfile.write(data)
            if url.path in ("/config.js", "/data/menu.js") and not Path(panel_dir, url.path[1:]).exists():
                # Optional personal files: answer with an empty script instead of a 404.
                data = b"/* not configured: using the example file */\n"
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                return self.wfile.write(data)
            return super().do_GET()

        def do_POST(self):
            url = urlparse(self.path)
            if url.path.startswith("/ha/"):
                return self.proxy()
            try:
                body = self.read_json()
                if url.path == "/panel/week":
                    key = state.set_week(body.get("week") or None)
                    log("Week chosen: %s" % (key or "automatic"))
                    return self.send_json({"week": key})
                if url.path == "/panel/checklist":
                    return self.send_json({"done": state.set_check(str(body.get("date")), str(body.get("id")), bool(body.get("done")))})
            except (ValueError, TypeError) as e:
                return self.send_json({"error": str(e)}, 400)
            self.send_error(405)

    return Handler


def make_server(cfg, port=None):
    state = State(cfg["STATE_DIR"])
    recipes = RecipeBook(cfg["PANEL_DIR"], cfg.get("DEMO_LANG"))
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("", cfg["PORT"] if port is None else port), make_handler(cfg, state, recipes))
    srv.state = state
    return srv


def start_background_jobs(cfg, state):
    if cfg["MENU_URL"]:
        from server.sync import sync_forever
        threading.Thread(target=sync_forever, args=(cfg, log), daemon=True).start()
    if cfg["TELEGRAM_CHAT_ID"] and cfg["HA_WS_URL"] and cfg["HA_TOKEN"]:
        try:
            from server.menu_bot import MenuBot
        except ImportError as e:  # websockets not installed: the panel still works
            log("Telegram bot disabled (%s)" % e)
            return
        bot = MenuBot(cfg, state, log)
        threading.Thread(target=bot.run_forever, daemon=True).start()


def main():
    cfg = settings_mod.load()
    # Home Assistant stops apps with SIGTERM: exit cleanly (code 0).
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    srv = make_server(cfg)
    start_background_jobs(cfg, srv.state)
    log("Panel on http://0.0.0.0:%d · Home Assistant: %s" % (cfg["PORT"], cfg["HA_URL"] or "not configured"))
    srv.serve_forever()


if __name__ == "__main__":
    main()
