"""Server settings from (lowest to highest priority): defaults, `.env` in the repo root,
environment variables, and `/data/options.json` when running as a Home Assistant OS app."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DEFAULTS = {
    "PORT": "8000",
    "PANEL_DIR": str(ROOT / "panel"),
    "STATE_DIR": "",
    "HA_URL": "",
    "HA_TOKEN": "",
    "HA_WS_URL": "",
    "MENU_URL": "",
    "MENU_ADAPTER": "generic",
    "MENU_SYNC_MINUTES": "60",
    "MENU_PEOPLE": "",
    "RECIPES_URL": "",
    "TELEGRAM_CHAT_ID": "",
    "PANEL_LANG": "en",   # not LANG: that one is the system locale
}

# options.json keys (HA app) → setting names
OPTION_KEYS = {"menu_url": "MENU_URL", "menu_adapter": "MENU_ADAPTER", "menu_people": "MENU_PEOPLE",
               "recipes_url": "RECIPES_URL", "telegram_chat_id": "TELEGRAM_CHAT_ID", "lang": "PANEL_LANG"}


def read_env_file(path):
    env = {}
    try:
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return env


def load(environ=None, env_file=None, options_file="/data/options.json"):
    environ = os.environ if environ is None else environ
    s = dict(DEFAULTS)
    s.update({k: v for k, v in read_env_file(env_file or ROOT / ".env").items() if k in DEFAULTS})
    s.update({k: v for k, v in environ.items() if k in DEFAULTS})

    try:
        opts = json.loads(Path(options_file).read_text(encoding="utf-8"))
        for k, name in OPTION_KEYS.items():
            if opts.get(k) not in (None, ""):
                s[name] = str(opts[k])
    except (OSError, ValueError):
        pass
    # Inside Home Assistant OS the supervisor gives the app its own token.
    if environ.get("SUPERVISOR_TOKEN"):
        s["HA_URL"] = "http://supervisor/core"
        s["HA_TOKEN"] = environ["SUPERVISOR_TOKEN"]
        s["HA_WS_URL"] = s["HA_WS_URL"] or "ws://supervisor/core/websocket"
    s["HA_URL"] = s["HA_URL"].rstrip("/")
    if not s["HA_WS_URL"] and s["HA_URL"]:
        s["HA_WS_URL"] = s["HA_URL"].replace("http", "ws", 1) + "/api/websocket"
    if not s["STATE_DIR"]:
        s["STATE_DIR"] = "/data" if os.path.isdir("/data") and os.access("/data", os.W_OK) else str(ROOT / "state")
    s["PORT"] = int(s["PORT"])
    s["MENU_SYNC_MINUTES"] = max(5, int(s["MENU_SYNC_MINUTES"]))
    return s
