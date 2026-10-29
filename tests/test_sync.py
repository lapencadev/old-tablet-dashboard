import json
import tempfile
import unittest
from pathlib import Path

from server import menu as menu_mod
from server import shopping, sync
from server.adapters import static_site as static-site_

FIX = Path(__file__).resolve().parent / "fixtures" / "static-site"


def fake_fetch(url):
    name = url.rsplit("/", 1)[-1]
    return (FIX / name).read_text(encoding="utf-8")


class the author's siteAdapterTest(unittest.TestCase):
    def test_converted_menu_is_valid(self):
        menu = static-site.convert_menu(fake_fetch("weeks.data.js"), fake_fetch("shop.data.js"), ("Alex", "Sam"))
        self.assertEqual(menu_mod.validate(menu), [])
        self.assertEqual([m["label"] for m in menu["meals"]], ["Café", "Comida", "Merienda", "Cena"])
        self.assertTrue(next(m for m in menu["meals"] if m["id"] == "comida")["tomorrow"])
        week = menu["weeks"]["wB"]
        self.assertEqual((week["start"], week["repeat"]), ("2026-11-02", 2))
        self.assertEqual(menu["weeks"]["wA"]["start"], "2026-09-28")  # month range in the title
        self.assertIn("Pavo al curry", week["days"][0]["comida"]["a"])
        self.assertNotIn("b", week["days"][5]["merienda"])  # the author's site slots without j
        self.assertEqual(menu["people"][1]["label"], "Sam")

    def test_recipes(self):
        recipes = static-site.convert_recipes(fake_fetch("recipes-content.js"))
        self.assertEqual(recipes[0]["title"], "Pavo al curry rápido con leche evaporada")
        self.assertEqual(recipes[0]["ingredients"], ["200g pavo", "60ml leche evaporada & curry"])
        self.assertEqual(recipes[0]["badges"], ["15 min", "batch"])
        self.assertTrue(recipes[0]["tip"].startswith("Truco"))


class ShoppingSplitTest(unittest.TestCase):
    def test_lines_with_several_products(self):
        self.assertEqual(shopping.split_products("Canónigos (~750g), tomate (~1.8kg), zanahoria (~200g), ajo, limones (3)"),
                         ["Canónigos", "Tomate", "Zanahoria", "Ajo", "Limones"])
        self.assertEqual(shopping.split_products("Gazpacho comercial Mercadona (1L) y crema de calabaza y zanahoria (~700ml)"),
                         ["Gazpacho comercial", "Crema de calabaza y zanahoria"])
        self.assertEqual(shopping.split_products("Dorada (~600g, sábado) · hígado de cerdo (100g) y lomo de cerdo (~230g), sábado"),
                         ["Dorada", "Hígado de cerdo", "Lomo de cerdo"])
        self.assertEqual(shopping.split_products("Chicken (300g) and potatoes (1kg)"), ["Chicken", "Potatoes"])

    def test_suggestions_skip_at_home_and_duplicates(self):
        menu = static-site.convert_menu(fake_fetch("weeks.data.js"), fake_fetch("shop.data.js"))
        groups = shopping.suggestions(menu["shopping"]["wB"])
        self.assertEqual([g[0] for g in groups], ["Carne y pescado", "Verduras y despensa"])
        self.assertEqual(sum(len(g[1]) for g in groups), 4 + 7)


class SyncTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        (self.dir / "data").mkdir()
        self.cfg = {"PANEL_DIR": str(self.dir), "MENU_URL": "https://static-site.example.org", "MENU_ADAPTER": "static-site",
                    "MENU_PEOPLE": "Alex, Sam", "RECIPES_URL": ""}

    def test_sync_writes_menu_and_recipes(self):
        sync.sync_once(self.cfg, fetch=fake_fetch, log=lambda *_: None)
        menu = menu_mod.load_menu(self.dir / "data" / "menu.js")
        self.assertEqual(menu_mod.validate(menu), [])
        self.assertEqual(json.loads((self.dir / "data" / "recipes.json").read_text())[0]["steps"], ["Sofreír.", "Cocer 10 min."])

    def test_broken_source_keeps_previous_menu(self):
        sync.sync_once(self.cfg, fetch=fake_fetch, log=lambda *_: None)
        before = (self.dir / "data" / "menu.js").read_text()
        with self.assertRaises(Exception):
            sync.sync_once(self.cfg, fetch=lambda url: "var X = {weeks: {}};", log=lambda *_: None)
        self.assertEqual((self.dir / "data" / "menu.js").read_text(), before)

    def test_generic_adapter(self):
        example = (Path(__file__).resolve().parent.parent / "panel/data/menu.example.js").read_text()
        cfg = dict(self.cfg, MENU_ADAPTER="generic", MENU_URL="https://example.org/menu.js")
        menu = sync.sync_once(cfg, fetch=lambda url: example, log=lambda *_: None)
        self.assertIn("autumn1", menu["weeks"])
