#!/usr/bin/env python3
"""Command-line helper for old-tablet-dashboard. Works the same on macOS, Linux and Windows.

    python tools/panel.py --help
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def run(cmd, **kw):
    print("$ " + " ".join(str(c) for c in cmd), flush=True)
    return subprocess.call([str(c) for c in cmd], cwd=kw.pop("cwd", ROOT), **kw)


# ───────── check ─────────
def cmd_check(args):
    """Run every automated check: Python tests, JS tests, ES5 syntax of the panel."""
    failed = []
    print("== Python tests")
    if run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", "."] + (["-v"] if args.verbose else [])):
        failed.append("python tests")

    node = shutil.which("node")
    if not node:
        print("== JavaScript checks skipped: Node.js is not installed (needed only for development).")
    else:
        print("== JavaScript tests")
        js_tests = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "tests" / "js").glob("*.test.js"))
        if js_tests and run([node, "--test", "--test-reporter=dot"] + js_tests):
            failed.append("js tests")
        print("== ES5 syntax (panel must run on Chrome 40)")
        if not (ROOT / "node_modules" / "acorn").exists():
            print("   acorn missing: run `npm install` once (dev dependency).")
            failed.append("es5 check (acorn not installed)")
        elif run([node, "tools/es5check.js"] + sorted(str(p.relative_to(ROOT)) for p in (ROOT / "panel").rglob("*.js"))):
            failed.append("es5 check")

    print()
    if failed:
        print("FAILED: " + ", ".join(failed))
        return 1
    print("All checks passed.")
    return 0


# ───────── validate-menu ─────────
def cmd_validate_menu(args):
    """Check a menu file against the generic format."""
    from server import menu as menu_mod
    path = Path(args.path) if args.path else (ROOT / "panel/data/menu.js" if (ROOT / "panel/data/menu.js").exists()
                                              else ROOT / "panel/data/menu.example.js")
    try:
        data = menu_mod.load_menu(path)
    except Exception as e:  # syntax errors in a hand-written file
        print("%s: cannot read the menu (%s)" % (path, e))
        return 1
    errors = menu_mod.validate(data)
    if errors:
        print("%s: %d problem(s)" % (path, len(errors)))
        for e in errors:
            print("  - " + e)
        return 1
    weeks = data["weeks"]
    print("%s: valid · %d people · %d meals · %d week(s): %s" % (
        path, len(data["people"]), len(data["meals"]), len(weeks), ", ".join(weeks)))
    return 0


def build_parser():
    p = argparse.ArgumentParser(prog="panel.py", description=__doc__.strip().splitlines()[0])
    sub = p.add_subparsers(dest="command", metavar="<command>")
    c = sub.add_parser("check", help="run every automated check (tests, ES5 syntax)")
    c.add_argument("-v", "--verbose", action="store_true")
    c.set_defaults(func=cmd_check)
    c = sub.add_parser("validate-menu", help="check a menu file (default: panel/data/menu.js or the example)")
    c.add_argument("path", nargs="?")
    c.set_defaults(func=cmd_validate_menu)
    return p, sub


def main(argv=None):
    parser, _ = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return 0
    return args.func(args) or 0


if __name__ == "__main__":
    sys.exit(main())
