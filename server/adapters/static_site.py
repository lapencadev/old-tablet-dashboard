"""Adapter `static-site`: a personal meal-planning website made of static files (the author's own).

The site publishes js/data/weeks.data.js (WEEKS_DATA), js/data/shop.data.js (SHOP_LISTS) and
js/recipes-content.js (recipe cards as HTML). When part of the site is password-protected, the first
two travel encrypted in private.enc.json (see `private_files`). The format is documented in
docs/menu-sources.md. This module converts it into the generic menu format (docs/domain-model.md)
and the recipes.json list; use it as a template for other sources."""
import html
import re
import unicodedata

from server.menu import parse_js_object

FILES = {"weeks": "js/data/weeks.data.js", "shopping": "js/data/shop.data.js", "recipes": "js/recipes-content.js"}

# Slot names (Spanish) → when each meal is over (hour) and whether "Tomorrow" shows it
MEAL_HOURS = {"café": 9, "desayuno": 12, "media mañana": 12, "comida": 16, "merienda": 19, "cena": 24}
TOMORROW = {"comida", "cena"}
MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def slug(text):
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_") or "meal"


def slot_name(time_label):
    """'Comida · 14h — hierro' → 'Comida'"""
    return re.split(r"\s*[·—]\s*", time_label or "", maxsplit=1)[0].strip()


def week_start(week):
    """ISO date of the Monday: `start` if present, else read from a title like '2-15 noviembre 2026'."""
    if week.get("start"):
        return week["start"]
    m = re.search(r"(\d{1,2})(?:\s+([a-záéíóú]+))?\s*[-–]\s*\d{1,2}\s+([a-záéíóú]+)\s+(\d{4})", week.get("title", ""), re.I)
    if not m:
        return None
    first, second = (m.group(2) or "").lower(), m.group(3).lower()
    if (first or second) not in MONTHS:
        return None
    month = MONTHS.index(first or second) + 1
    year = int(m.group(4))
    if first and second in MONTHS and MONTHS.index(first) > MONTHS.index(second):
        year -= 1
    return "%04d-%02d-%02d" % (year, month, int(m.group(1)))


def convert_menu(weeks_js, shop_js=None, people=("R", "J")):
    weeks_data = parse_js_object(weeks_js)
    meals, order = {}, []
    out_weeks = {}
    for key, w in weeks_data.items():
        days = []
        for day in (w.get("days") or [])[:7]:
            d = {}
            for slot in day.get("slots", []):
                name = slot_name(slot.get("time", ""))
                mid = slug(name)
                if mid not in meals:
                    meals[mid] = {"id": mid, "label": name, "until": MEAL_HOURS.get(name.lower(), 24)}
                    if name.lower() in TOMORROW:
                        meals[mid]["tomorrow"] = True
                    order.append(mid)
                dishes = {"a": slot.get("r", "")}
                if slot.get("j") is not None:
                    dishes["b"] = slot["j"]
                d[mid] = dishes
            days.append(d)
        if len(days) != 7:
            continue  # incomplete weeks cannot be shown by date
        week = {"title": w.get("title", key), "days": days}
        start = week_start(w)
        if start:
            week["start"] = start
        if w.get("weeks"):
            week["repeat"] = int(w["weeks"])
        out_weeks[key] = week
    meal_list = sorted((meals[m] for m in order), key=lambda m: (m["until"], order.index(m["id"])))
    menu = {
        "people": [{"id": "a", "label": people[0]}] + ([{"id": "b", "label": people[1]}] if len(people) > 1 else []),
        "meals": meal_list,
        "weeks": out_weeks,
    }
    if shop_js:
        shops = parse_js_object(shop_js)
        menu["shopping"] = {k: {cat: [it["label"] if isinstance(it, dict) else it for it in items] for cat, items in v.items()}
                            for k, v in shops.items() if k in out_weeks}
    return menu


def _text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def convert_recipes(recipes_js):
    out = []
    for block in re.split(r'<div class="card"', recipes_js)[1:]:
        title = re.search(r'<div class="ctitle">(.*?)</div>', block, re.S)
        if not title:
            continue
        sub = re.search(r'<div class="csub">(.*?)</div>', block, re.S)
        ing = re.search(r'<ul class="ing">(.*?)</ul>', block, re.S)
        steps = re.search(r'<ol class="steps">(.*?)</ol>', block, re.S)
        tip = re.search(r'<div class="tip">(.*?)</div>', block, re.S)
        items = lambda m: [_text(x) for x in re.findall(r"<li>(.*?)</li>", m.group(1), re.S)] if m else []
        alias = re.match(r'[^>]*data-alias="([^"]*)"', block)
        out.append({
            "title": _text(title.group(1)),
            "aliases": [_text(a) for a in alias.group(1).split("|") if a.strip()] if alias else [],
            "subtitle": _text(sub.group(1)) if sub else "",
            "badges": [_text(b) for b in re.findall(r'<span class="badge[^"]*">(.*?)</span>', block)],
            "ingredients": items(ing),
            "steps": items(steps),
            "tip": _text(tip.group(1)) if tip else "",
        })
    return out


# ───────── Password-protected sites ─────────
# private.enc.json = {"v": 1, "iterations": N, "salt": b64, "iv": b64, "data": b64}
# key = PBKDF2-HMAC-SHA256(password, salt, iterations, 32 bytes); data = AES-256-GCM(JSON list of HTML blocks)
# The blocks contain the private <script>s inline; the ones that define WEEKS_DATA / SHOP_LISTS are used.
PRIVATE_FILE = "private.enc.json"
PRIVATE_VARS = {"weeks": "WEEKS_DATA", "shopping": "SHOP_LISTS"}
_KEYS = {}


def _derive(password, salt_b64, iterations):
    import base64
    import hashlib
    k = (password, salt_b64, iterations)
    if k not in _KEYS:  # PBKDF2 with many iterations takes a second or two on a Raspberry Pi
        _KEYS.clear()
        _KEYS[k] = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), iterations, 32)
    return _KEYS[k]


def private_files(payload_json, password):
    """{'weeks': js text, 'shopping': js text} from an encrypted private.enc.json. Wrong password → ValueError."""
    import base64
    import json
    try:
        from cryptography.exceptions import InvalidTag
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        raise ValueError("the site is password-protected: install the 'cryptography' package")
    p = json.loads(payload_json)
    key = _derive(password, p["salt"], int(p["iterations"]))
    try:
        plain = AESGCM(key).decrypt(base64.b64decode(p["iv"]), base64.b64decode(p["data"]), None)
    except InvalidTag:
        raise ValueError("wrong MENU_PASSWORD: private.enc.json cannot be decrypted")
    out = {}
    for block in json.loads(plain.decode("utf-8")):
        for code in re.findall(r"<script>([\s\S]*?)</script>", block):
            code = code.replace("<\\/script", "</script")
            for name, var in PRIVATE_VARS.items():
                if name not in out and re.search(r"(?m)^\s*(?:const|var|let)\s+%s\s*=" % var, code):
                    out[name] = code
    return out
