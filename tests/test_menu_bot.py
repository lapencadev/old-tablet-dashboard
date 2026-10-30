import datetime
import json
import tempfile
import unittest
from pathlib import Path

from server.menu_bot import MenuBot, MenuSession, suggestions_for, load_current_menu
from server.state import State
from server import i18n

ROOT = Path(__file__).resolve().parent.parent


def bot(lang="en", day=datetime.date(2026, 11, 4)):
    cfg = {"TELEGRAM_CHAT_ID": "-42", "PANEL_LANG": lang, "PANEL_DIR": str(ROOT / "panel")}
    return MenuBot(cfg, State(tempfile.mkdtemp()), lambda *_: None, today=lambda: day)


class SessionTest(unittest.TestCase):
    def test_keyboard_layout_and_toggles(self):
        s = MenuSession("Week", [("Meat", ["Chicken", "Beef", "Pork"]), ("Veg", ["Onion"])], "es")
        kb = s.keyboard()
        self.assertEqual(kb[0], [["— Meat —", "/m_noop"]])
        self.assertEqual([b[1] for b in kb[1]], ["/m_t 0", "/m_t 1"])
        self.assertEqual(kb[2], [["☐ Pork", "/m_t 2"]])
        self.assertEqual(kb[-2], [["Todo", "/m_all"], ["Nada", "/m_none"]])
        s.toggle(2); s.toggle(3); s.toggle(2); s.toggle(99)
        self.assertEqual(s.chosen(), ["Onion"])
        self.assertEqual(s.keyboard()[-1][0], ["✅ Añadir (1)", "/m_add"])


class BotFlowTest(unittest.TestCase):
    def test_menu_flow_adds_selection_to_shopping_script(self):
        b = bot()
        b.handle("telegram_command", {"chat_id": -42, "command": "/menu"})
        domain, service, data = b.sent[-1]
        self.assertEqual((domain, service), ("telegram_bot", "send_message"))
        self.assertIn("Autumn week", data["message"])
        n_buttons = sum(1 for row in data["inline_keyboard"] for btn in row if btn[1].startswith("/m_t"))
        self.assertGreater(n_buttons, 20)
        b.handle("telegram_callback", {"chat_id": -42, "command": "/m_t", "args": ["0"], "id": "q", "message": {"message_id": 7}})
        b.handle("telegram_callback", {"chat_id": -42, "command": "/m_t", "args": ["1"], "id": "q", "message": {"message_id": 7}})
        b.handle("telegram_callback", {"chat_id": -42, "command": "/m_add", "id": "q", "message": {"message_id": 7}, "from_first": "Sam"})
        domain, service, data = b.sent[-1]
        self.assertEqual((domain, service), ("script", "otd_shopping_add"))
        self.assertEqual(data["lista"], ["Turkey breast", "Chicken breast"])
        self.assertEqual(data["quien"], "Sam")

    def test_other_chats_are_ignored_and_expired_sessions_say_so(self):
        b = bot()
        b.handle("telegram_command", {"chat_id": 123, "command": "/menu"})
        self.assertEqual(b.sent, [])
        b.handle("telegram_callback", {"chat_id": -42, "command": "/m_all", "id": "q", "message": {"message_id": 1}})
        self.assertIn("expired", b.sent[-1][2]["message"])

    def test_week_choice_is_honoured(self):
        b = bot(day=datetime.date(2027, 3, 1))
        b.state.set_week("autumn1")
        b.handle("telegram_command", {"chat_id": -42, "command": "/menu@my_bot"})
        self.assertIn("Autumn week", b.sent[-1][2]["message"])


class HelpTest(unittest.TestCase):
    def test_help_lists_every_package_command(self):
        for lang in ("en", "es"):
            cmds = json.loads((ROOT / "config" / ("ha.%s.json" % lang)).read_text(encoding="utf-8"))["commands"]
            text = i18n.help_text(lang)
            for c in list(cmds.values()) + ["/menu"]:
                self.assertIn(c, text)
            for marker in ("<code>+ ", "<code>- ", "<code>! "):
                self.assertIn(marker, text)
        b = bot("es")
        for cmd in ("/ayuda", "/help", "/start"):
            b.handle("telegram_command", {"chat_id": -42, "command": cmd})
            self.assertIn("/compra", b.sent[-1][2]["message"])

    def test_suggestions_skip_already_at_home(self):
        menu = load_current_menu(ROOT / "panel")
        title, groups, key = suggestions_for(menu, datetime.date(2026, 11, 4))
        self.assertEqual(key, "autumn1")
        self.assertNotIn("Already at home / check", [g[0] for g in groups])


class WebsocketTest(unittest.TestCase):
    def test_bot_authenticates_subscribes_and_answers_help(self):
        import threading
        from websockets.sync.server import serve
        got = []

        def handler(ws):
            ws.send(json.dumps({"type": "auth_required"}))
            got.append(json.loads(ws.recv()))
            ws.send(json.dumps({"type": "auth_ok"}))
            got.append(json.loads(ws.recv()))
            got.append(json.loads(ws.recv()))
            ws.send(json.dumps({"type": "event", "event": {"event_type": "telegram_command",
                                                            "data": {"chat_id": -42, "command": "/help"}}}))
            got.append(json.loads(ws.recv()))
            ws.close()

        server = serve(handler, "127.0.0.1", 0)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        port = server.socket.getsockname()[1]
        b = bot()
        b.cfg.update(HA_WS_URL="ws://127.0.0.1:%d" % port, HA_TOKEN="tok")
        threading.Thread(target=b.run_forever, daemon=True).start()
        import time
        for _ in range(50):
            if len(got) >= 4:
                break
            time.sleep(0.1)
        server.shutdown()
        self.assertEqual(got[0], {"type": "auth", "access_token": "tok"})
        self.assertEqual({g["event_type"] for g in got[1:3]}, {"telegram_command", "telegram_callback"})
        self.assertEqual((got[3]["type"], got[3]["domain"], got[3]["service"]), ("call_service", "telegram_bot", "send_message"))
        self.assertIn("/shopping", got[3]["service_data"]["message"])
