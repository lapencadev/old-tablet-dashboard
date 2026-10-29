import datetime
import unittest

from server.ha_templates import render_all, validate_values
from tests.ha_jinja import render

VALUES = {"CHAT_ID": "-42", "SHOPPING": "todo.shopping", "TASKS": "todo.tasks"}
TODAY = datetime.date(2026, 11, 4)  # Wednesday


class RenderTest(unittest.TestCase):
    def test_every_template_renders_in_every_language(self):
        for lang in ("en", "es"):
            r = render_all(VALUES, lang)
            self.assertEqual(set(r), {"calendar", "shopping", "tasks"})
            text = repr(r)
            self.assertNotIn("@@", text)
            self.assertIn("todo.shopping", text)
            self.assertIn("-42", text)

    def test_bad_values_are_rejected(self):
        with self.assertRaises(ValueError):
            validate_values(dict(VALUES, CHAT_ID="my group"))
        with self.assertRaises(ValueError):
            validate_values(dict(VALUES, SHOPPING="shopping"))


class ShoppingJinjaTest(unittest.TestCase):
    def setUp(self):
        self.es = render_all(VALUES, "es")["shopping"]
        self.en = render_all(VALUES, "en")["shopping"]

    def section(self, pack, item):
        seq = pack["scripts"]["otd_shopping_add"]["sequence"]
        variables = seq[1]["variables"]
        tpl = seq[3]["repeat"]["sequence"][0]["data"]["description"]
        return render(tpl, TODAY, rules=variables["rules"], other=variables["other"], repeat={"item": item})

    def test_sections(self):
        self.assertEqual(self.section(self.es, "Pechuga de pollo"), "🥩 Carne")
        self.assertEqual(self.section(self.es, "Crema de calabaza"), "🥫 Despensa")
        self.assertEqual(self.section(self.es, "Pan integral"), "🥖 Panadería")
        self.assertEqual(self.section(self.es, "Panceta"), "🧀 Charcutería y quesos")
        self.assertEqual(self.section(self.es, "Cosa rara"), "📦 Otros")
        self.assertEqual(self.section(self.en, "Bin bags"), "🧽 Cleaning & home")
        self.assertEqual(self.section(self.en, "Greek yogurt"), "🥛 Dairy & eggs")

    def test_split_and_dedupe(self):
        seq = self.es["scripts"]["otd_shopping_add"]["sequence"]
        wanted = render(seq[1]["variables"]["wanted"], TODAY, texto="leche, huevos y pan; Leche")
        self.assertEqual(wanted, "['Leche', 'Huevos', 'Pan']")
        wanted = render(self.en["scripts"]["otd_shopping_add"]["sequence"][1]["variables"]["wanted"], TODAY, texto="milk and eggs")
        self.assertEqual(wanted, "['Milk', 'Eggs']")

    def test_confirmation_message(self):
        tpl = self.en["scripts"]["otd_shopping_add"]["sequence"][4]["data"]["message"]
        msg = render(tpl, TODAY, new_items=["Milk", "Eggs"], repeated=["Bread"], quien="Sam")
        self.assertEqual(msg, "🛒 Sam added: Milk, Eggs\n👌 Already on the list: Bread")


class TasksJinjaTest(unittest.TestCase):
    def due(self, lang, mark):
        acts = render_all(VALUES, lang)["tasks"]["automations"]["otd_tasks_add"]["actions"][0]["variables"]
        return render(acts["due"], TODAY, words=acts["words"], mark=mark)

    def test_date_words(self):
        self.assertEqual(self.due("es", "hoy"), "2026-11-04")
        self.assertEqual(self.due("es", "mañana"), "2026-11-05")
        self.assertEqual(self.due("es", "viernes"), "2026-11-06")
        self.assertEqual(self.due("es", "miércoles"), "2026-11-11")  # same weekday = next week
        self.assertEqual(self.due("en", "friday"), "2026-11-06")
        self.assertEqual(self.due("en", "fri"), "2026-11-06")
        self.assertEqual(self.due("en", "30/10"), "2027-10-30")  # past date → next year
        self.assertEqual(self.due("en", "nonsense"), "")

    def test_title(self):
        acts = render_all(VALUES, "en")["tasks"]["automations"]["otd_tasks_add"]["actions"][0]["variables"]
        self.assertEqual(render(acts["title"], TODAY, raw="call the plumber @friday"), "Call the plumber")


if __name__ == "__main__":
    unittest.main()
