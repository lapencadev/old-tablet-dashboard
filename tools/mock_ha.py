#!/usr/bin/env python3
"""A tiny fake Home Assistant for the demo and the tests (REST only).

Implements the calls the panel makes: /api/states, /api/states/<id>, /api/calendars/<id>,
and the services todo.get_items, todo.update_item, weather.get_forecasts, input_boolean.turn_off.
Every request is recorded and can be read at GET /mock/log (used by tests)."""
import datetime
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

TEXTS = {
    "en": {
        "family": "Family", "school": "School",
        "events": [
            (0, None, "Bins out"), (0, "17:30", "Swimming lesson"), (1, "09:00", "Dentist"),
            (2, "19:00", "Choir rehearsal"), (3, None, "School trip"), (3, "18:30", "Pilates"),
            (4, "20:00", "Dinner with friends"), (5, None, "Market day"), (6, "11:00", "Grandma's birthday"),
        ],
        "school_events": [(1, "16:00", "Parents' meeting"), (4, None, "No school")],
        "tasks": [("Book the car service", 2), ("Call the plumber", 0), ("Renew library books", -1),
                  ("Order printer ink", None), ("Plan the weekend", None)],
        "shopping": ["Milk", "Eggs", "Courgettes", "Bananas", "Coffee", "Olive oil", "Bin bags"],
    },
    "es": {
        "family": "Familia", "school": "Cole",
        "events": [
            (0, None, "Sacar la basura"), (0, "17:30", "Natación"), (1, "09:00", "Dentista"),
            (2, "19:00", "Ensayo del coro"), (3, None, "Excursión del cole"), (3, "18:30", "Pilates"),
            (4, "20:00", "Cena con amigos"), (5, None, "Mercadillo"), (6, "11:00", "Cumpleaños de la abuela"),
        ],
        "school_events": [(1, "16:00", "Reunión de padres"), (4, None, "No hay cole")],
        "tasks": [("Pedir cita del coche", 2), ("Llamar al fontanero", 0), ("Renovar libros de la biblioteca", -1),
                  ("Comprar tinta de la impresora", None), ("Planear el finde", None)],
        "shopping": ["Leche", "Huevos", "Calabacines", "Plátanos", "Café", "Aceite de oliva", "Bolsas de basura"],
    },
}


class MockHA:
    def __init__(self, lang="en", today=None, extra_shopping=0, token=None):
        self.lang = lang if lang in TEXTS else "en"
        self.today = today or datetime.date.today()
        self.token = token
        self.log = []
        t = TEXTS[self.lang]
        self.todo = {
            "todo.tasks": [{"uid": "t%d" % i, "summary": s, "status": "needs_action",
                            **({"due": (self.today + datetime.timedelta(days=d)).isoformat()} if d is not None else {})}
                           for i, (s, d) in enumerate(t["tasks"])],
            "todo.shopping": [{"uid": "s%d" % i, "summary": s, "status": "needs_action"}
                              for i, s in enumerate(t["shopping"] + ["Item %d" % n for n in range(extra_shopping)])],
        }
        self.booleans = {"input_boolean.laundry_waiting": "on"}

    def states(self):
        t = TEXTS[self.lang]
        vet = (self.today + datetime.timedelta(days=3)).isoformat() + " 10:00:00"
        out = [
            {"entity_id": "calendar.family", "state": "off", "attributes": {"friendly_name": t["family"]}},
            {"entity_id": "calendar.school", "state": "off", "attributes": {"friendly_name": t["school"]}},
            {"entity_id": "weather.home", "state": "partlycloudy", "attributes": {"temperature": 17.4, "friendly_name": "Home"}},
            {"entity_id": "input_datetime.vet_visit", "state": vet, "attributes": {}},
            {"entity_id": "todo.tasks", "state": str(len(self.pending("todo.tasks"))), "attributes": {}},
            {"entity_id": "todo.shopping", "state": str(len(self.pending("todo.shopping"))), "attributes": {}},
        ]
        out += [{"entity_id": k, "state": v, "attributes": {}} for k, v in self.booleans.items()]
        return out

    def pending(self, entity):
        return [i for i in self.todo.get(entity, []) if i["status"] == "needs_action"]

    def events(self, cal):
        t = TEXTS[self.lang]
        src = t["events"] if cal == "calendar.family" else t["school_events"] if cal == "calendar.school" else []
        out = []
        for day, time, title in src:
            d = self.today + datetime.timedelta(days=day)
            if time:
                start = datetime.datetime.combine(d, datetime.time.fromisoformat(time))
                out.append({"summary": title, "start": {"dateTime": start.isoformat()},
                            "end": {"dateTime": (start + datetime.timedelta(hours=1)).isoformat()}})
            else:
                out.append({"summary": title, "start": {"date": d.isoformat()},
                            "end": {"date": (d + datetime.timedelta(days=1)).isoformat()}})
        return out

    def service(self, domain, name, data):
        if domain == "todo" and name == "get_items":
            e = data.get("entity_id")
            return {e: {"items": self.pending(e)}}
        if domain == "todo" and name == "update_item":
            for it in self.todo.get(data.get("entity_id"), []):
                if it["uid"] == data.get("item") or it["summary"] == data.get("item"):
                    it["status"] = data.get("status", it["status"])
            return {}
        if domain == "weather" and name == "get_forecasts":
            e = data.get("entity_id")
            return {e: {"forecast": [{"datetime": self.today.isoformat(), "temperature": 21, "templow": 11, "precipitation": 1.2}]}}
        if domain == "input_boolean" and name == "turn_off":
            self.booleans[data.get("entity_id")] = "off"
            return {}
        return {}


def make_handler(ha):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def reply(self, obj, status=200):
            data = json.dumps(obj).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def record(self, body=None):
            ha.log.append({"method": self.command, "path": self.path, "auth": self.headers.get("Authorization"), "body": body})

        def authorized(self):
            return not ha.token or self.headers.get("Authorization") == "Bearer " + ha.token

        def do_GET(self):
            url = urlparse(self.path)
            if url.path == "/mock/log":
                return self.reply(ha.log)
            if url.path == "/":
                # Someone opened this address in a browser: point them to the panel.
                data = ("Fake Home Assistant for the demo. Nothing to see here: "
                        "the panel uses it behind the scenes. Open the panel instead (the other address).").encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                return self.wfile.write(data)
            self.record()
            if not self.authorized():
                return self.reply({"message": "unauthorized"}, 401)
            if url.path == "/api/states":
                return self.reply(ha.states())
            if url.path.startswith("/api/states/"):
                st = next((s for s in ha.states() if s["entity_id"] == url.path[12:]), None)
                return self.reply(st) if st else self.reply({"message": "not found"}, 404)
            if url.path.startswith("/api/calendars/"):
                return self.reply(ha.events(url.path[15:]))
            if url.path == "/api/":
                return self.reply({"message": "API running."})
            self.reply({"message": "not found"}, 404)

        def do_POST(self):
            url = urlparse(self.path)
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}") if length else {}
            self.record(body)
            if not self.authorized():
                return self.reply({"message": "unauthorized"}, 401)
            parts = url.path.split("/")
            if url.path.startswith("/api/services/") and len(parts) == 5:
                resp = ha.service(parts[3], parts[4], body)
                return self.reply({"changed_states": [], "service_response": resp} if "return_response" in parse_qs(url.query, keep_blank_values=True) else [])
            if url.path.startswith("/api/config/"):
                return self.reply({"result": "ok"})
            self.reply({"message": "not found"}, 404)

    return Handler


def start(port=0, **kw):
    """Start in a background thread. Returns (server, MockHA). port=0 picks a free port."""
    ha = MockHA(**kw)
    srv = ThreadingHTTPServer(("127.0.0.1", port), make_handler(ha))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, ha


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--port", type=int, default=8123)
    p.add_argument("--lang", default="en")
    a = p.parse_args()
    srv, _ = start(a.port, lang=a.lang)
    print("Mock Home Assistant on http://127.0.0.1:%d" % srv.server_address[1])
    threading.Event().wait()
