import json
from pathlib import Path
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

    def test_proxy_only_lets_through_what_the_panel_uses(self):
        for path in ("/ha/api/config", "/ha/api/services/lock/unlock", "/ha/api/states/../config", "/ha/api/hassio/info"):
            with self.assertRaises(urllib.error.HTTPError) as e:
                get(self.base + path)
            self.assertEqual(e.exception.code, 403, path)
        self.assertEqual(post(self.base + "/ha/api/services/lock/unlock", {"entity_id": "lock.front"})[0], 403)
        self.assertEqual(post(self.base + "/ha/api/services/homeassistant/restart", {})[0], 403)
        self.assertNotIn("/api/services/lock/unlock", [c.get("path") for c in self.ha.log])

    def test_other_web_pages_cannot_post(self):
        import urllib.request
        req = urllib.request.Request(self.base + "/ha/api/services/todo/update_item", method="POST",
                                     data=b'{"entity_id":"todo.shopping"}', headers={"Content-Type": "text/plain"})
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(req, timeout=5)
        self.assertEqual(e.exception.code, 403)

    def test_dns_rebinding_host_is_refused(self):
        import urllib.request
        req = urllib.request.Request(self.base + "/panel/week", headers={"Host": "evil.example.com"})
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(req, timeout=5)
        self.assertEqual(e.exception.code, 403)

    def test_host_rules(self):
        from server.serve import host_allowed
        for h in ("192.0.2.10:8000", "localhost:8000", "homeassistant.local:8000", "raspi.example.ts.net:8000", "[::1]:8000", "panel"):
            self.assertTrue(host_allowed(h), h)
        for h in ("evil.example.com", "192.0.2.10.nip.io:8000", ""):
            self.assertFalse(host_allowed(h), h)
        self.assertTrue(host_allowed("panel.example.org", ("panel.example.org",)))

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


class SettingsTest(unittest.TestCase):
    def test_priority_and_system_locale_is_ignored(self):
        import json as _json
        import os
        import tempfile
        from server import settings
        env_file = tempfile.mktemp()
        Path(env_file).write_text("HA_URL=http://from-file:8123/\nPANEL_LANG=es\n", encoding="utf-8")
        opts = tempfile.mktemp()
        Path(opts).write_text(_json.dumps({"menu_url": "https://m.example.org", "lang": "", "telegram_chat_id": "-42"}), encoding="utf-8")
        cfg = settings.load(environ={"LANG": "en_US.UTF-8", "PORT": "9000"}, env_file=env_file, options_file=opts)
        self.assertEqual(cfg["HA_URL"], "http://from-file:8123")
        self.assertEqual(cfg["PANEL_LANG"], "es")
        self.assertEqual(cfg["PORT"], 9000)
        self.assertEqual(cfg["MENU_URL"], "https://m.example.org")
        self.assertEqual(cfg["TELEGRAM_CHAT_ID"], "-42")
        self.assertEqual(cfg["HA_WS_URL"], "ws://from-file:8123/api/websocket")
        sup = settings.load(environ={"SUPERVISOR_TOKEN": "abc"}, env_file=os.devnull, options_file=os.devnull)
        self.assertEqual((sup["HA_URL"], sup["HA_TOKEN"], sup["HA_WS_URL"]), ("http://supervisor/core", "abc", "ws://supervisor/core/websocket"))
