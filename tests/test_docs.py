import re
import unittest
from pathlib import Path

from tools import panel

ROOT = Path(__file__).resolve().parent.parent
DOCS = [ROOT / "README.md", ROOT / "docs/guide.md", ROOT / "docs/es/guia.md", ROOT / "docs/troubleshooting.md", ROOT / "docs/es/problemas.md"]


class DocsTest(unittest.TestCase):
    def test_relative_links_and_images_exist(self):
        for doc in DOCS:
            for target in re.findall(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", doc.read_text(encoding="utf-8")):
                if target.startswith(("http://", "https://", "mailto:")):
                    continue
                self.assertTrue((doc.parent / target).exists(), "%s → %s" % (doc.relative_to(ROOT), target))

    def test_every_documented_command_exists(self):
        _, sub = panel.build_parser()
        known = set(sub.choices)
        for doc in DOCS:
            for cmd in re.findall(r"tools[/\\]panel\.py ([a-z][a-z0-9-]*)", doc.read_text(encoding="utf-8")):
                self.assertIn(cmd, known, "%s mentions unknown command %s" % (doc.relative_to(ROOT), cmd))

    def test_spanish_guide_mirrors_the_english_one(self):
        heads = lambda p: [h for h in re.findall(r"(?m)^(##+) ", p.read_text(encoding="utf-8"))]
        self.assertEqual(heads(ROOT / "docs/guide.md"), heads(ROOT / "docs/es/guia.md"))
        rows = lambda p: len(re.findall(r"(?m)^\| [^-|]", p.read_text(encoding="utf-8")))
        self.assertEqual(rows(ROOT / "docs/troubleshooting.md"), rows(ROOT / "docs/es/problemas.md"))
