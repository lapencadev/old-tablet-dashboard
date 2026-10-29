"""Texts of the server-side Telegram bot (the panel has its own table in panel/i18n.js)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TEXTS = {
    "en": {
        "menu_intro": "🍽 <b>Menu shopping · {week}</b>\n{n} products suggested by the menu. Tick what you need and press <b>Add</b>.",
        "no_week": "🍽 There is no dated week in the menu.",
        "no_list": "🍽 The menu has no shopping list for <b>{week}</b>.",
        "expired": "🍽 This list has expired. Send /menu to open a new one.",
        "closed": "🍽 Menu list closed.",
        "added": "🍽 From the menu ({week}): {n} products added to the shopping list.",
        "all": "All", "none": "None", "add": "✅ Add ({n})", "close": "✖ Close",
        "help": (
            "🏠 <b>What you can ask the bot</b>\n\n"
            "🛒 <b>Shopping</b>\n"
            "<code>+ milk, eggs and bread</code> → adds them (separate with commas or “and”)\n"
            "<code>- eggs</code> → removes it\n"
            "{shopping} → the list by section; tap a product to tick it off\n\n"
            "✅ <b>Tasks</b>\n"
            "<code>! call the plumber</code> → adds a task\n"
            "<code>! pay the bill @friday</code> → with a date: <code>@today</code>, <code>@tomorrow</code>, <code>@monday</code>… or <code>@15/11</code>\n"
            "{tasks} → pending tasks; tap one to mark it done\n\n"
            "🍽 <b>Menu</b>\n"
            "/menu → what this week's menu needs; tick what is missing and press <b>Add</b>\n\n"
            "/help → this message"
        ),
    },
    "es": {
        "menu_intro": "🍽 <b>Compra del menú · {week}</b>\n{n} productos sugeridos por el menú. Marca lo que haga falta y pulsa <b>Añadir</b>.",
        "no_week": "🍽 No encuentro ninguna semana con fechas en el menú.",
        "no_list": "🍽 El menú no tiene lista de la compra para la <b>{week}</b>.",
        "expired": "🍽 Esta lista ha caducado. Escribe /menu para abrir otra.",
        "closed": "🍽 Lista del menú cerrada.",
        "added": "🍽 Del menú ({week}): {n} productos a la compra.",
        "all": "Todo", "none": "Nada", "add": "✅ Añadir ({n})", "close": "✖ Cerrar",
        "help": (
            "🏠 <b>Qué le puedes pedir al bot</b>\n\n"
            "🛒 <b>Compra</b>\n"
            "<code>+ leche, huevos y pan</code> → lo añade (separa con comas o «y»)\n"
            "<code>- huevos</code> → lo quita\n"
            "{shopping} → la lista por secciones; toca un producto para tacharlo\n\n"
            "✅ <b>Tareas</b>\n"
            "<code>! llamar al fontanero</code> → apunta una tarea\n"
            "<code>! pagar el recibo @viernes</code> → con fecha: <code>@hoy</code>, <code>@mañana</code>, <code>@lunes</code>… o <code>@15/11</code>\n"
            "{tasks} → las pendientes; toca una para marcarla hecha\n\n"
            "🍽 <b>Menú</b>\n"
            "/menu → lo que pide el menú de la semana; marca lo que falte y pulsa <b>Añadir</b>\n\n"
            "/ayuda → este mensaje"
        ),
    },
}
HELP_COMMANDS = ("/help", "/ayuda", "/start")


def t(lang, key, **kw):
    s = TEXTS.get(lang, TEXTS["en"]).get(key) or TEXTS["en"][key]
    return s.format(**kw) if kw else s


def help_text(lang):
    cmds = json.loads((ROOT / "config" / ("ha.%s.json" % (lang if lang in TEXTS else "en"))).read_text(encoding="utf-8"))["commands"]
    return t(lang, "help", shopping=cmds["shopping"], tasks=cmds["tasks"])
