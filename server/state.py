"""Small shared state kept on the server so every screen (and the Telegram bot) agrees:
the week picked by hand and the daily checklist ticks."""
import json
import re
import threading
from pathlib import Path

KEY_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KEEP_DAYS = 14


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
