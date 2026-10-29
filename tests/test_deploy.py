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
