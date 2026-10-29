"""Telegram /menu and /help, served by the panel server through Home Assistant's websocket API.

Listens to the events of HA's telegram_bot integration (telegram_command /menu, /help and
telegram_callback /m_*) and answers by calling HA services. Products chosen in /menu are sent to
script.otd_shopping_add (from the shopping package), which sorts them and skips duplicates."""
import datetime
import itertools
import json
import threading
import time
from pathlib import Path

from server import i18n
from server import menu as menu_mod
from server import shopping


def load_current_menu(panel_dir):
    data = Path(panel_dir) / "data"
    path = data / "menu.js" if (data / "menu.js").exists() else data / "menu.example.js"
    return menu_mod.load_menu(path)


def suggestions_for(menu, today, chosen=None):
    """(week title, [(category, [products])] or None, week key)"""
    key, _, _ = menu_mod.resolve_week(menu, today, chosen)
    if not key:
        return None, None, None
    title = menu["weeks"][key]["title"].split("·")[0].strip()
    lists = (menu.get("shopping") or {}).get(key)
    return title, (shopping.suggestions(lists) if lists else None), key


class MenuSession:
    """Checkbox state of one /menu message."""

    def __init__(self, title, groups, lang="en"):
        self.title, self.lang = title, lang
        self.items = [(cat, n) for cat, names in groups for n in names]
        self.selected = set()

    def toggle(self, i):
        if 0 <= i < len(self.items):
            self.selected ^= {i}

    def text(self):
        return i18n.t(self.lang, "menu_intro", week=self.title, n=len(self.items))

    def keyboard(self):
        rows, row, last_cat = [], [], None
        for i, (cat, name) in enumerate(self.items):
            if cat != last_cat:
                if row:
                    rows.append(row)
                    row = []
                rows.append([["— %s —" % cat[:40], "/m_noop"]])
                last_cat = cat
            row.append([("☑ " if i in self.selected else "☐ ") + name[:30], "/m_t %d" % i])
            if len(row) == 2:
                rows.append(row)
                row = []
        if row:
            rows.append(row)
        rows.append([[i18n.t(self.lang, "all"), "/m_all"], [i18n.t(self.lang, "none"), "/m_none"]])
        rows.append([[i18n.t(self.lang, "add", n=len(self.selected)), "/m_add"], [i18n.t(self.lang, "close"), "/m_x"]])
        return rows

    def chosen(self):
        return [self.items[i][1] for i in sorted(self.selected)]


class MenuBot:
    def __init__(self, cfg, state, log, today=None):
        self.cfg, self.state, self.log = cfg, state, log
        self.chat_id = int(cfg["TELEGRAM_CHAT_ID"])
        self.lang = (cfg.get("PANEL_LANG") or "en")[:2]
        self.today = today or datetime.date.today
        self.ids = itertools.count(1)
        self.sessions = {}
        self.ws = None
        self.lock = threading.Lock()
        self.sent = []  # (domain, service, data) — handy for tests

    # ── HA calls
    def call(self, domain, service, data):
        self.sent.append((domain, service, data))
        if self.ws is None:
            return
        with self.lock:
            self.ws.send(json.dumps({"id": next(self.ids), "type": "call_service",
                                     "domain": domain, "service": service, "service_data": data}))

    def send(self, text, keyboard=None):
        data = {"chat_id": self.chat_id, "message": text, "parse_mode": "html", "disable_notification": True}
        if keyboard is not None:
            data["inline_keyboard"] = keyboard
        self.call("telegram_bot", "send_message", data)

    def edit(self, message_id, text, keyboard=None):
        self.call("telegram_bot", "edit_message", {"chat_id": self.chat_id, "message_id": message_id, "message": text,
                                                   "parse_mode": "html", "inline_keyboard": keyboard or []})

    # ── Events
    def handle(self, event_type, d):
        if int(d.get("chat_id") or 0) != self.chat_id:
            return  # only the household group
        cmd = (d.get("command") or "").split("@")[0]
        if event_type == "telegram_command" and cmd in i18n.HELP_COMMANDS:
            return self.send(i18n.help_text(self.lang))
        if event_type == "telegram_command" and cmd == "/menu":
            title, groups, _ = suggestions_for(load_current_menu(self.cfg["PANEL_DIR"]), self.today(), self.state.get_week())
            if title is None:
                return self.send(i18n.t(self.lang, "no_week"))
            if not groups:
                return self.send(i18n.t(self.lang, "no_list", week=title))
            s = MenuSession(title, groups, self.lang)
            self.sessions[self.chat_id] = s
            return self.send(s.text(), s.keyboard())
        if event_type != "telegram_callback" or not cmd.startswith("/m_"):
            return
        self.call("telegram_bot", "answer_callback_query", {"callback_query_id": d.get("id"), "message": ""})
        msg_id = (d.get("message") or {}).get("message_id")
        s = self.sessions.get(self.chat_id)
        if s is None:
            return self.edit(msg_id, i18n.t(self.lang, "expired"))
        args = d.get("args") or []
        if cmd == "/m_noop":
            return
        if cmd == "/m_t" and args:
            s.toggle(int(args[0]))
        elif cmd == "/m_all":
            s.selected = set(range(len(s.items)))
        elif cmd == "/m_none":
            s.selected = set()
        elif cmd == "/m_x":
            self.sessions.pop(self.chat_id, None)
            return self.edit(msg_id, i18n.t(self.lang, "closed"))
        elif cmd == "/m_add":
            chosen = s.chosen()
            if not chosen:
                return
            self.sessions.pop(self.chat_id, None)
            self.edit(msg_id, i18n.t(self.lang, "added", week=s.title, n=len(chosen)))
            return self.call("script", "otd_shopping_add", {"lista": chosen, "texto": "", "chat_id": self.chat_id,
                                                            "quien": d.get("from_first") or "Menu"})
        self.edit(msg_id, s.text(), s.keyboard())

    def run_forever(self):
        from websockets.sync.client import connect
        while True:
            try:
                with connect(self.cfg["HA_WS_URL"], max_size=None) as ws:
                    self.ws = ws
                    json.loads(ws.recv())  # auth_required
                    ws.send(json.dumps({"type": "auth", "access_token": self.cfg["HA_TOKEN"]}))
                    if json.loads(ws.recv()).get("type") != "auth_ok":
                        raise RuntimeError("authentication rejected")
                    for ev in ("telegram_command", "telegram_callback"):
                        ws.send(json.dumps({"id": next(self.ids), "type": "subscribe_events", "event_type": ev}))
                    self.log("Telegram /menu: listening")
                    for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("type") == "event":
                            ev = msg["event"]
                            try:
                                self.handle(ev["event_type"], ev.get("data") or {})
                            except Exception as e:
                                self.log("Telegram /menu: error with %s (%s)" % (ev.get("event_type"), e))
                        elif msg.get("type") == "result" and not msg.get("success"):
                            self.log("Telegram /menu: HA error: %s" % msg.get("error"))
            except Exception as e:
                self.ws = None
                self.log("Telegram /menu: connection lost (%s); retrying in 15 s" % e)
                time.sleep(15)
