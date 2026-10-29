import copy
import datetime
import unittest
from pathlib import Path

from server import menu

ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = ROOT / "panel" / "data" / "menu.example.js"


class MenuFormatTest(unittest.TestCase):
    def setUp(self):
        self.menu = menu.load_menu(EXAMPLE)

    def test_example_is_valid(self):
        self.assertEqual(menu.validate(self.menu), [])
        self.assertEqual(len(self.menu["people"]), 2)
        self.assertEqual(len(self.menu["meals"]), 5)

    def test_week_with_six_days_is_rejected(self):
        broken = copy.deepcopy(self.menu)
        broken["weeks"]["autumn1"]["days"].pop()
        errors = menu.validate(broken)
        self.assertTrue(any("week `autumn1`" in e and "exactly 7 days" in e for e in errors), errors)

    def test_start_must_be_monday(self):
        broken = copy.deepcopy(self.menu)
        broken["weeks"]["autumn1"]["start"] = "2026-11-03"
        self.assertTrue(any("not a Monday" in e for e in menu.validate(broken)))

    def test_unknown_meal_and_person(self):
        broken = copy.deepcopy(self.menu)
        broken["weeks"]["autumn1"]["days"][0]["brunch"] = {"a": "x"}
        broken["weeks"]["autumn1"]["days"][1]["lunch"]["zz"] = "x"
        errors = menu.validate(broken)
        self.assertTrue(any("unknown meal `brunch`" in e for e in errors))
        self.assertTrue(any("unknown person `zz`" in e for e in errors))

    def test_js_file_with_comments_and_trailing_commas(self):
        data = menu.parse_js_object("/* hi */ var MENU = {people: [{id: 'a', label: 'A'},], // c\n};")
        self.assertEqual(data["people"][0]["id"], "a")


class ResolveWeekTest(unittest.TestCase):
    def setUp(self):
        self.menu = menu.load_menu(EXAMPLE)  # autumn1: start 2026-11-02, repeat 2

    def test_inside_first_and_second_week(self):
        self.assertEqual(menu.resolve_week(self.menu, datetime.date(2026, 11, 4)), ("autumn1", 2, True))
        self.assertEqual(menu.resolve_week(self.menu, datetime.date(2026, 11, 15)), ("autumn1", 6, True))

    def test_after_the_plan_uses_last_started_week(self):
        self.assertEqual(menu.resolve_week(self.menu, datetime.date(2026, 11, 20)), ("autumn1", 4, False))

    def test_before_the_plan_uses_first_week(self):
        self.assertEqual(menu.resolve_week(self.menu, datetime.date(2026, 10, 29)), ("autumn1", 3, False))

    def test_manual_choice_wins(self):
        m = copy.deepcopy(self.menu)
        m["weeks"]["other"] = copy.deepcopy(m["weeks"]["autumn1"])
        self.assertEqual(menu.resolve_week(m, datetime.date(2026, 11, 4), chosen="other"), ("other", 2, True))
