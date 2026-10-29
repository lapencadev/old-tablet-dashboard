import json
import unittest
import urllib.error

from tests.helpers import get, post, start_stack, stop_stack


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base, cls.ha, cls.servers = start_stack()

    @classmethod
    def tearDownClass(cls):
        stop_stack(cls.servers)

    def test_static_panel_is_never_cached(self):
        status, headers, body = get(self.base + "/")
        self.assertEqual(status, 200)
        self.assertIn(b'id="today"', body)
        self.assertEqual(headers.get("Cache-Control"), "no-store")

    def test_missing_personal_files_answer_empty_script(self):
        status, headers, body = get(self.base + "/config.js")
        self.assertEqual(status, 200)
        self.assertTrue(body.startswith(b"/*"))

    def test_proxy_adds_the_token_and_browser_never_sees_it(self):
        status, headers, body = get(self.base + "/ha/api/states")
        self.assertEqual(status, 200)
        self.assertTrue(any(s["entity_id"] == "calendar.family" for s in json.loads(body)))
        self.assertEqual(self.ha.log[-1]["auth"], "Bearer test-token")
        self.assertNotIn(b"test-token", body)
        _, _, page = get(self.base + "/")
        self.assertNotIn(b"test-token", page)

    def test_proxy_post_service_with_response(self):
        status, data = post(self.base + "/ha/api/services/todo/get_items?return_response",
                            {"entity_id": "todo.shopping", "status": "needs_action"})
        self.assertEqual(status, 200)
        self.assertGreater(len(data["service_response"]["todo.shopping"]["items"]), 3)

    def test_week_choice_round_trip(self):
        self.assertEqual(json.loads(get(self.base + "/panel/week")[2]), {"week": None})
        self.assertEqual(post(self.base + "/panel/week", {"week": "autumn1"}), (200, {"week": "autumn1"}))
        self.assertEqual(json.loads(get(self.base + "/panel/week")[2]), {"week": "autumn1"})
        self.assertEqual(post(self.base + "/panel/week", {"week": "../etc"})[0], 400)
        post(self.base + "/panel/week", {"week": None})

    def test_checklist_is_per_date(self):
        post(self.base + "/panel/checklist", {"date": "2026-11-04", "id": "morning", "done": True})
        self.assertEqual(json.loads(get(self.base + "/panel/checklist?date=2026-11-04")[2]), {"done": {"morning": True}})
        self.assertEqual(json.loads(get(self.base + "/panel/checklist?date=2026-11-05")[2]), {"done": {}})
        post(self.base + "/panel/checklist", {"date": "2026-11-04", "id": "morning", "done": False})
        self.assertEqual(json.loads(get(self.base + "/panel/checklist?date=2026-11-04")[2]), {"done": {}})
        with self.assertRaises(urllib.error.HTTPError):
            get(self.base + "/panel/checklist?date=yesterday")

    def test_recipe_endpoint(self):
        data = json.loads(get(self.base + "/panel/recipe?q=Turkey%20curry")[2])
        self.assertEqual(data["recipe"]["title"], "Turkey curry with onion and courgette")
        self.assertIsNone(json.loads(get(self.base + "/panel/recipe?q=Spaghetti%20carbonara")[2])["recipe"])


class RecipeMatchTest(unittest.TestCase):
    def test_accents_plurals_and_threshold(self):
        from server.recipes import best_match
        recipes = [{"title": "Lentejas estofadas con pollo"}, {"title": "Pollo al horno con verduras"}, {"title": "Garlic prawns with spinach"}]
        self.assertEqual(best_match(recipes, "Lentéjas estofadas con pollo")["title"], "Lentejas estofadas con pollo")
        self.assertEqual(best_match(recipes, "Garlic prawn with spinach")["title"], "Garlic prawns with spinach")
        self.assertIsNone(best_match(recipes, "Pollo a la plancha con patatas y ensalada"))  # 1 of 4 words
        self.assertIsNone(best_match(recipes, "Tortilla de patata"))


if __name__ == "__main__":
    unittest.main()
