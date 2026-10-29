"""Render ha/templates/*.yaml with the household's values (chat id, to-do entities, language).

Placeholders: @@CHAT_ID@@, @@SHOPPING@@, @@TASKS@@, @@CMD:<name>@@ (bare command for comments and
aliases) and @@J:<path>@@ (value from config/ha.<lang>.json as JSON, valid in both YAML and Jinja)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "ha" / "templates"
PLACEHOLDER = re.compile(r"@@([A-Z_]+)(?::([\w.]+))?@@")


def texts(lang):
    path = ROOT / "config" / ("ha.%s.json" % lang)
    if not path.exists():
        raise ValueError("no HA texts for language %r (config/ha.<lang>.json)" % lang)
    return json.loads(path.read_text(encoding="utf-8"))


def _lookup(data, path):
    for part in path.split("."):
        data = data[part]
    return data


def render(text, values, lang):
    t = texts(lang)

    def sub(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "J":
            return json.dumps(_lookup(t, arg), ensure_ascii=False)
        if kind == "CMD":
            return t["commands"][arg]
        if kind in values:
            return str(values[kind])
        raise KeyError("missing value for @@%s@@" % kind)

    return PLACEHOLDER.sub(sub, text)


def validate_values(values):
    chat = str(values.get("CHAT_ID", ""))
    if not re.match(r"^-?\d+$", chat):
        raise ValueError("TELEGRAM_CHAT_ID must be the numeric chat id (groups start with -100…)")
    for key in ("SHOPPING", "TASKS"):
        if not re.match(r"^todo\.\w+$", str(values.get(key, ""))):
            raise ValueError("%s must be a to-do entity like todo.shopping" % key)


def render_all(values, lang, names=None):
    """{template name: parsed dict with 'scripts'/'automations'}"""
    import yaml
    validate_values(values)
    out = {}
    for path in sorted(TEMPLATES.glob("*.yaml")):
        if names and path.stem not in names:
            continue
        out[path.stem] = yaml.safe_load(render(path.read_text(encoding="utf-8"), values, lang)) or {}
    return out
