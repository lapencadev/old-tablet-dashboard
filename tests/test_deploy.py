import io
import tarfile
import tempfile
import unittest
from pathlib import Path

from tools import panel


class BuildAppTest(unittest.TestCase):
    def test_build_contains_app_server_and_panel_without_junk(self):
        dest = Path(tempfile.mkdtemp()) / "app"
        (panel.ROOT / "panel" / "._junk").write_text("x")
        try:
            version = panel.build_app(dest, version="1.0.test")
        finally:
            (panel.ROOT / "panel" / "._junk").unlink()
        for rel in ("config.yaml", "Dockerfile", "server/serve.py", "server/menu.py", "panel/index.html", "panel/app.js"):
            self.assertTrue((dest / rel).exists(), rel)
        self.assertIn('version: "1.0.test"', (dest / "config.yaml").read_text())
        names = tarfile.open(fileobj=io.BytesIO(panel.tar_bytes(dest))).getnames()
        self.assertFalse([n for n in names if "/._" in n or n.startswith("._") or "__pycache__" in n])
        self.assertIn("server/serve.py", names)
        modes = {m.name: m.mode for m in tarfile.open(fileobj=io.BytesIO(panel.tar_bytes(dest)))}
        self.assertEqual(modes["Dockerfile"], 0o644)
        self.assertEqual(version, "1.0.test")

    def test_dockerfile_copies_what_it_runs(self):
        docker = (panel.ROOT / "ha-app" / "Dockerfile").read_text()
        self.assertIn("COPY server /app/server", docker)
        self.assertIn("/app/server/serve.py", docker)

    def test_config_options_match_settings(self):
        import yaml
        from server.settings import OPTION_KEYS
        cfg = yaml.safe_load((panel.ROOT / "ha-app" / "config.yaml").read_text())
        self.assertEqual(set(cfg["options"]), set(OPTION_KEYS))
        self.assertEqual(set(cfg["schema"]), set(OPTION_KEYS))
        self.assertTrue(cfg["homeassistant_api"])


class DeployHATest(unittest.TestCase):
    def test_every_script_and_automation_is_posted_once(self):
        import os
        from tools import mock_ha
        srv, ha = mock_ha.start(0, token="t0k")
        url = "http://127.0.0.1:%d" % srv.server_address[1]
        env = {"HA_URL": url, "HA_TOKEN": "t0k", "TELEGRAM_CHAT_ID": "-42", "PANEL_LANG": "es"}
        old = dict(os.environ)
        os.environ.update(env)
        try:
            from argparse import Namespace
            rc = panel.cmd_deploy_ha(Namespace(lang=None, only=None, dry_run=False))
        finally:
            os.environ.clear()
            os.environ.update(old)
            srv.shutdown()
        self.assertEqual(rc, 0)
        paths = [r["path"] for r in ha.log if r["path"].startswith("/api/config/")]
        expected = {"/api/config/script/config/otd_shopping_add", "/api/config/script/config/otd_shopping_list",
                    "/api/config/script/config/otd_tasks_list", "/api/config/automation/config/otd_shopping_add",
                    "/api/config/automation/config/otd_shopping_remove", "/api/config/automation/config/otd_shopping_show",
                    "/api/config/automation/config/otd_shopping_buttons", "/api/config/automation/config/otd_tasks_add",
                    "/api/config/automation/config/otd_tasks_show", "/api/config/automation/config/otd_tasks_buttons",
                    "/api/config/automation/config/otd_calendar_refresh"}
        self.assertEqual(sorted(paths), sorted(expected))
        show = next(r for r in ha.log if r["path"].endswith("otd_shopping_show"))
        self.assertEqual(show["body"]["triggers"][0]["event_data"]["command"], "/compra")
        self.assertEqual(show["auth"], "Bearer t0k")
