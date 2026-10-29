"""Shopping suggestions: turn the lines of a menu's shopping list into separate products."""
import re

SKIP_CATEGORY = re.compile(r"^(ya en casa|already at home|at home)", re.I)
DAYS = {"lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado", "domingo",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
BRANDS = re.compile(r"\s+(Mercadona|Hacendado|Lidl|Aldi|Tesco|Carrefour)\b", re.I)


def short_name(label):
    """'Lubina (~500g) — cocinar el lunes' → 'Lubina'"""
    name = re.split(r"\s+\(|\s+—\s+|\s+-\s+|:", label, maxsplit=1)[0].strip()
    name = BRANDS.sub("", name).strip()
    return name[:1].upper() + name[1:]


def split_products(label):
    """One line may list several products: 'Lettuce (1), tomatoes (1kg), garlic' → 3 products.
    Splits on commas, ' · ' and ') y ' / ') and ' outside parentheses; names that contain 'and'/'y'
    ('Crema de calabaza y zanahoria') are kept whole."""
    parts, buf, depth, i = [], "", 0, 0
    while i < len(label):
        c = label[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
            m = re.match(r"\)\s+(?:y|and)\s+", label[i:])
            if depth == 0 and m:
                parts.append(buf + ")")
                buf, i = "", i + m.end()
                continue
        if depth == 0 and (c == "," or label.startswith(" · ", i)):
            parts.append(buf)
            buf, i = "", i + (1 if c == "," else 3)
            continue
        buf += c
        i += 1
    parts.append(buf)
    names = []
    for part in parts:
        n = short_name(part.strip())
        if n and n.lower() not in DAYS:
            names.append(n)
    return names


def suggestions(categories):
    """{category: [line, …]} → [(category, [product, …])] without 'already at home' and duplicates."""
    out, seen = [], set()
    for cat, lines in (categories or {}).items():
        if SKIP_CATEGORY.match(cat):
            continue
        names = []
        for line in lines:
            for n in split_products(line if isinstance(line, str) else line.get("label", "")):
                if n.lower() not in seen:
                    seen.add(n.lower())
                    names.append(n)
        if names:
            cat = re.sub(r"^(por comprar|to buy)\s*[—-]\s*", "", cat, flags=re.I)
            out.append((cat[:1].upper() + cat[1:], names))
    return out
