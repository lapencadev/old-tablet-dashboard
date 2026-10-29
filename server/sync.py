"""Menu sync: download the menu from MENU_URL every MENU_SYNC_MINUTES and write panel/data/menu.js
(and panel/data/recipes.json) in the generic format. A broken download never replaces a good file."""
import json
import time
import urllib.request
from pathlib import Path

from server import menu as menu_mod
from server.adapters import static_site as static-site_


def fetch_text(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read().decode("utf-8")


def build(cfg, fetch=fetch_text, log=print):
    """Return (menu, recipes or None). Raises on download/parse errors."""
    base = cfg["MENU_URL"].rstrip("/")
    people = [p.strip() for p in (cfg.get("MENU_PEOPLE") or "").split(",") if p.strip()] or ["A", "B"]
    if cfg["MENU_ADAPTER"] == "static-site":
        weeks = fetch(base + "/" + static-site.FILES["weeks"])
        try:
            shop = fetch(base + "/" + static-site.FILES["shopping"])
        except Exception as e:
            log("Menu sync: no shopping lists (%s)" % e)
            shop = None
        menu = static-site.convert_menu(weeks, shop, people)
        try:
            recipes = static-site.convert_recipes(fetch(base + "/" + static-site.FILES["recipes"]))
        except Exception as e:
            log("Menu sync: no recipes (%s)" % e)
            recipes = None
        return menu, recipes
    if cfg["MENU_ADAPTER"] != "generic":
        raise ValueError("unknown MENU_ADAPTER %r (use 'generic' or 'static-site')" % cfg["MENU_ADAPTER"])
    menu = menu_mod.parse_js_object(fetch(cfg["MENU_URL"]))
    recipes = json.loads(fetch(cfg["RECIPES_URL"])) if cfg.get("RECIPES_URL") else None
    return menu, recipes


def sync_once(cfg, fetch=fetch_text, log=print):
    data_dir = Path(cfg["PANEL_DIR"]) / "data"
    menu, recipes = build(cfg, fetch, log)
    errors = menu_mod.validate(menu)
    if errors:
        raise ValueError("menu not valid, keeping the previous one: " + "; ".join(errors[:3]))
    menu_mod.dump_menu(menu, data_dir / "menu.js")
    if recipes is not None:
        tmp = data_dir / "recipes.json.tmp"
        tmp.write_text(json.dumps(recipes, ensure_ascii=False), encoding="utf-8")
        tmp.replace(data_dir / "recipes.json")
    log("Menu sync: %d week(s)%s" % (len(menu["weeks"]), ", %d recipes" % len(recipes) if recipes is not None else ""))
    return menu


def sync_forever(cfg, log):
    while True:
        try:
            sync_once(cfg, log=log)
        except Exception as e:
            log("Menu sync failed: %s" % e)
        time.sleep(cfg["MENU_SYNC_MINUTES"] * 60)
