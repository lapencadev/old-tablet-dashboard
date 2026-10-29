import os
import stat
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

from tools import panel

FAKE_ADB = r'''#!%(py)s
import sys, json
log = %(log)r
with open(log, "a") as f:
    f.write(json.dumps(sys.argv[1:]) + "\n")
a = sys.argv[1:]
if a == ["get-state"]:
    print("device")
elif a[:3] == ["shell", "pm", "disable-user"]:
    # Android 4.4: system apps cannot be disabled over adb
    print("Error: java.lang.SecurityException: Permission Denial" if a[3].startswith("com.google") else "Package %%s new state: disabled-user" %% a[3])
elif a[:3] == ["shell", "pm", "block"]:
    print("Package %%s new blocked state: true" %% a[3])
elif a[0] == "pull":
    open(a[2], "wb").write(b"png")
'''


class TabletToolsTest(unittest.TestCase):
    def setUp(self):
        if os.name == "nt":
            self.skipTest("fake adb is a POSIX script")
        self.dir = Path(tempfile.mkdtemp())
        self.log = self.dir / "adb.log"
        adb = self.dir / "adb"
        adb.write_text(FAKE_ADB % {"py": sys.executable, "log": str(self.log)})
        adb.chmod(adb.stat().st_mode | stat.S_IEXEC)
        self.old_path = os.environ["PATH"]
        os.environ["PATH"] = str(self.dir) + os.pathsep + self.old_path

    def tearDown(self):
        os.environ["PATH"] = self.old_path

    def calls(self):
        import json
        return [json.loads(l) for l in self.log.read_text().splitlines()]

    def test_debloat_falls_back_to_block(self):
        lst = self.dir / "list.txt"
        lst.write_text("# comment\ncom.google.android.youtube\ncom.android.email\n")
        panel.cmd_tablet_debloat(Namespace(list=str(lst), restore=False, dry_run=False))
        c = [x for x in self.calls() if x != ["get-state"]]
        self.assertEqual(c, [["shell", "pm", "disable-user", "com.google.android.youtube"],
                             ["shell", "pm", "block", "com.google.android.youtube"],
                             ["shell", "pm", "disable-user", "com.android.email"]])

    def test_restore_enables_and_unblocks(self):
        lst = self.dir / "list.txt"
        lst.write_text("com.android.email\n")
        panel.cmd_tablet_debloat(Namespace(list=str(lst), restore=True, dry_run=False))
        self.assertIn(["shell", "pm", "unblock", "com.android.email"], self.calls())

    def test_screenshot(self):
        self.assertEqual(panel.cmd_tablet_shot(Namespace(out=str(self.dir))), 0)
        c = self.calls()
        self.assertIn(["shell", "screencap", "-p", "/sdcard/panel.png"], c)
        self.assertEqual(len(list(self.dir.glob("panel-*.png"))), 1)
        self.assertEqual(c[-1], ["shell", "rm", "/sdcard/panel.png"])

    def test_default_list_has_no_comments(self):
        pkgs = panel.read_package_list(panel.ROOT / "config" / "debloat.txt")
        self.assertTrue(all("." in p and not p.startswith("#") for p in pkgs))
