"""Small shared state kept on the server so every screen (and the Telegram bot) agrees:
the week picked by hand, the daily checklist ticks and the optional work timer."""
import json
import re
import threading
import time
from pathlib import Path

KEY_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KEEP_DAYS = 14
WORK_KEEP_DAYS = 400
WORK_ACTIONS = ("start", "pause", "resume", "stop")
# What may follow the last event of the day
WORK_NEXT = {None: ("start",), "stop": ("start",), "start": ("pause", "stop"),
             "resume": ("pause", "stop"), "pause": ("resume", "stop")}


class State:
    def __init__(self, directory):
        self.dir = Path(directory)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()

    def _read(self, name, default):
        try:
            return json.loads((self.dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return default

    def _write(self, name, data):
        tmp = self.dir / (name + ".tmp")
        tmp.write_text(json.dumps(data), encoding="utf-8")
        tmp.replace(self.dir / name)

    # Week chosen by hand (None = automatic by date)
    def get_week(self):
        return self._read("week.json", {}).get("week") or None

    def set_week(self, key):
        if key is not None and not KEY_RE.match(str(key)):
            raise ValueError("invalid week key")
        with self.lock:
            self._write("week.json", {"week": key})
        return key

    # Daily checklist: {"YYYY-MM-DD": {"item-id": true}}
    def get_checklist(self, date):
        if not DATE_RE.match(date or ""):
            raise ValueError("invalid date")
        return self._read("checklist.json", {}).get(date, {})

    def set_check(self, date, item, done):
        if not DATE_RE.match(date or "") or not KEY_RE.match(item or ""):
            raise ValueError("invalid date or item")
        with self.lock:
            data = self._read("checklist.json", {})
            day = data.setdefault(date, {})
            if done:
                day[item] = True
            else:
                day.pop(item, None)
            for old in sorted(data)[:-KEEP_DAYS]:
                del data[old]
            self._write("checklist.json", data)
        return data[date]

    # Work timer: {"YYYY-MM-DD": [{"a": "start", "ts": ms}, …]}; the day is the tablet's local date,
    # the time is the server's, so every screen agrees.
    def get_work(self, first, last):
        if not DATE_RE.match(first or "") or not DATE_RE.match(last or ""):
            raise ValueError("invalid date")
        data = self._read("work.json", {})
        return {d: ev for d, ev in data.items() if first <= d <= last}

    def add_work(self, day, action, now_ms=None):
        if not DATE_RE.match(day or "") or action not in WORK_ACTIONS:
            raise ValueError("invalid day or action")
        with self.lock:
            data = self._read("work.json", {})
            events = data.get(day, [])
            last = events[-1]["a"] if events else None
            if action not in WORK_NEXT[last]:
                raise ValueError("cannot %s after %s" % (action, last or "nothing"))
            events.append({"a": action, "ts": int(time.time() * 1000 if now_ms is None else now_ms)})
            data[day] = events
            for old in sorted(data)[:-WORK_KEEP_DAYS]:
                del data[old]
            self._write("work.json", data)
        return events

    def set_work_day(self, day, events):
        """Replace a day (correction by hand). Events must follow a valid order with rising
        times; an empty list deletes the day."""
        if not DATE_RE.match(day or "") or not isinstance(events, list) or len(events) > 40:
            raise ValueError("invalid day or events")
        clean, last, prev = [], None, None
        for e in events:
            a, ts = (e or {}).get("a"), (e or {}).get("ts")
            if a not in WORK_ACTIONS or not isinstance(ts, int) or isinstance(ts, bool):
                raise ValueError("invalid event")
            if a not in WORK_NEXT[last]:
                raise ValueError("cannot %s after %s" % (a, last or "nothing"))
            if prev is not None and ts <= prev:
                raise ValueError("times must go up")
            clean.append({"a": a, "ts": ts})
            last, prev = a, ts
        if clean and clean[-1]["ts"] - clean[0]["ts"] > 30 * 3600 * 1000:
            raise ValueError("too long for one day")
        with self.lock:
            data = self._read("work.json", {})
            if clean:
                data[day] = clean
            else:
                data.pop(day, None)
            self._write("work.json", data)
        return clean
