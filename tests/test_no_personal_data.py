"""The repository is public: fail if tracked files contain personal data.

Generic patterns are checked always. Extra private words (names, places…) can be given in the
PRIVATE_WORDS environment variable (comma-separated) so they are not published in the repo itself."""
import os
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PATTERNS = {
    "e-mail address": re.compile(r"[\w.+-]+@(?!users\.noreply\.github\.com|example\.(?:com|org))[\w-]+\.[\w.]+"),
    "Telegram group id": re.compile(r"-100\d{7,}"),
    "LAN address with port": re.compile(r"\b(?:192\.168|10\.\d{1,3})\.\d{1,3}\.\d{1,3}:\d{2,5}\b"),
    "Tailscale address": re.compile(r"\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b"),
    "Tailscale machine name": re.compile(r"\b[\w-]+\.tail[0-9a-f]{4,}\.ts\.net\b"),
    "Home Assistant token": re.compile(r"eyJ[\w-]{20,}\.[\w-]{20,}\.[\w-]{20,}"),
}
SKIP = {"package-lock.json"}
SKIP_DIRS = ("docs/img/", "panel/img/")


def tracked_files():
    try:
        out = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT, text=True)
        return [ROOT / p for p in out.splitlines() if p]
    except (OSError, subprocess.CalledProcessError):
        return [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts and "node_modules" not in p.parts]


def scan(files, words=()):
    problems = []
    word_res = [re.compile(r"\b%s\b" % re.escape(w), re.I) for w in words if w]
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        if rel in SKIP or rel.startswith(SKIP_DIRS) or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            for label, rx in PATTERNS.items():
                if rx.search(line):
                    problems.append("%s:%d %s" % (rel, n, label))
            for rx in word_res:
                if rx.search(line):
                    problems.append("%s:%d private word '%s'" % (rel, n, rx.pattern[2:-2].replace("\\", "")))
    return problems


class NoPersonalDataTest(unittest.TestCase):
    def test_tree_is_clean(self):
        words = [w.strip() for w in os.environ.get("PRIVATE_WORDS", "").split(",")]
        self.assertEqual(scan(tracked_files(), words), [])

    def test_detects_samples(self):
        tmp = ROOT / "state" / "leak-sample.txt"
        tmp.parent.mkdir(exist_ok=True)
        # Built by concatenation so this file does not match its own patterns.
        sample = ["chat -100" + "1234567890", "http://192.168" + ".1.40:8123", "mail someone" + "@gmail.com", "box.tail1a2b3c" + ".ts.net"]
        tmp.write_text("\n".join(sample), encoding="utf-8")
        try:
            found = " ".join(scan([tmp], ["Secretname"]))
            for label in ("Telegram group id", "LAN address with port", "e-mail address", "Tailscale machine name"):
                self.assertIn(label, found)
        finally:
            tmp.unlink()


if __name__ == "__main__":
    unittest.main()
