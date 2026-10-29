"""Recipe book: find the recipe whose title best matches a dish name.

Recipes live in panel/data/recipes.json (or recipes.example.json):
[{"title", "subtitle"?, "badges"?: [], "ingredients": [], "steps": [], "tip"?}]"""
import json
import re
import unicodedata
from pathlib import Path

STOP_WORDS = {
    # English
    "and", "with", "the", "of", "in", "on", "a", "an", "for", "to", "or", "without",
    # Spanish
    "con", "de", "del", "la", "las", "el", "los", "y", "al", "en", "o", "u", "un", "una", "para", "sin", "por",
}
THRESHOLD = 0.55


def words(text):
    text = unicodedata.normalize("NFD", (text or "").lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return [w for w in re.findall(r"[a-zñ]+", text) if w not in STOP_WORDS and len(w) > 2]


def stem(w):
    """Very small plural stripper that works for English and Spanish dish names."""
    if w.endswith("es") and len(w) > 5:
        return w[:-2]
    if w.endswith("s") and len(w) > 4:
        return w[:-1]
    return w


def best_match(recipes, dish):
    want = {stem(w) for w in words(dish)}
    if not want:
        return None
    best, score = None, 0.0
    for r in recipes:
        have = {stem(w) for w in words(r.get("title", ""))}
        if not have:
            continue
        common = len(want & have)
        s = common / len(want) * 0.7 + common / len(have) * 0.3
        if s > score:
            best, score = r, s
    return best if score >= THRESHOLD else None


class RecipeBook:
    """Reloads the JSON file when it changes."""

    def __init__(self, panel_dir, example_lang=None):
        data = Path(panel_dir) / "data"
        self.paths = [data / "recipes.json"]
        if example_lang and example_lang != "en":
            self.paths.append(data / ("recipes.example.%s.json" % example_lang))
        self.paths.append(data / "recipes.example.json")
        self.cache = (None, None, [])

    def recipes(self):
        path = next((p for p in self.paths if p.exists()), None)
        if not path:
            return []
        mtime = path.stat().st_mtime
        if self.cache[:2] != (path, mtime):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except ValueError:
                data = []
            self.cache = (path, mtime, data if isinstance(data, list) else [])
        return self.cache[2]

    def find(self, dish):
        return best_match(self.recipes(), dish)
