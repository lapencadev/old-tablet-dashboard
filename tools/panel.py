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


# ───────── demo / serve ─────────
def cmd_demo(args):
    """Fake Home Assistant + server with the example data. No configuration needed."""
    import time
    from tools import mock_ha
    from server import settings as settings_mod
    from server.serve import make_server
    import datetime
    today = datetime.date.fromisoformat(args.date) if args.date else None
    ha_srv, _ = mock_ha.start(0, lang=args.lang, token="demo-token", extra_shopping=args.extra, today=today)
    cfg = settings_mod.load(environ={}, env_file=os.devnull, options_file=os.devnull)
    cfg.update(HA_URL="http://127.0.0.1:%d" % ha_srv.server_address[1], HA_TOKEN="demo-token",
               STATE_DIR=str(ROOT / "state" / "demo"), PANEL_DIR=str(ROOT / "panel"))
    srv = make_server(cfg, port=args.port)
    import threading
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://localhost:%d/" % srv.server_address[1]
    print("Demo running: open %s  (Ctrl+C to stop)" % url)
    print("Fake Home Assistant on %s" % cfg["HA_URL"])
    if args.lang != "en":
        print("Tip: the panel language comes from panel/config.js (LANG). Example data is in English.")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        return 0


def cmd_serve(args):
    """Run the server against your real Home Assistant (reads .env)."""
    from server import serve
    serve.main()


# ───────── e2e ─────────
def _demo_stack(port=0, **mock_kw):
    import threading
    import tempfile
    from tools import mock_ha
    from server import settings as settings_mod
    from server.serve import make_server
    ha_srv, ha = mock_ha.start(0, token="demo-token", **mock_kw)
    cfg = settings_mod.load(environ={}, env_file=os.devnull, options_file=os.devnull)
    cfg.update(HA_URL="http://127.0.0.1:%d" % ha_srv.server_address[1], HA_TOKEN="demo-token",
               STATE_DIR=tempfile.mkdtemp(), PANEL_DIR=str(ROOT / "panel"))
    srv = make_server(cfg, port=port)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d" % srv.server_address[1], cfg["HA_URL"]


def cmd_e2e(args):
    """Browser scenarios with Playwright against two demo stacks (needs `npm i -D playwright`)."""
    import datetime
    node = shutil.which("node")
    if not node:
        print("Node.js is required for the browser tests.")
        return 1
    day = datetime.date(2026, 11, 4)
    base, ha_url = _demo_stack(today=day)
    base_long, _ = _demo_stack(today=day, extra_shopping=15)
    env = dict(os.environ, BASE=base, BASE_LONG=base_long, HA=ha_url)
    if args.shots:
        Path(args.shots).mkdir(parents=True, exist_ok=True)
        env["SHOTS"] = str(Path(args.shots).resolve())
    return run([node, "tests/e2e/panel.e2e.js"], env=env)


# ───────── deploy-app ─────────
APP_SLUG = "tablet_panel"
REMOTE_DIR = "/local_apps/" + APP_SLUG
SKIP_NAMES = {"__pycache__", ".DS_Store", "node_modules"}


def load_env():
    from server.settings import read_env_file
    env = read_env_file(ROOT / ".env")
    env.update({k: v for k, v in os.environ.items() if k.startswith(("HA_", "TELEGRAM_", "PANEL_", "LANG_"))})
    return env


def build_app(dest, version=None):
    """Copy ha-app/, server/ and panel/ into `dest` with a fresh version so HA sees an update."""
    import datetime
    dest = Path(dest)
    if dest.exists():
        shutil.rmtree(dest)
    ignore = lambda d, names: [n for n in names if n in SKIP_NAMES or n.startswith("._") or n.endswith((".pyc", ".tmp"))]
    shutil.copytree(ROOT / "ha-app", dest, ignore=ignore)
    shutil.copytree(ROOT / "server", dest / "server", ignore=ignore)
    shutil.copytree(ROOT / "panel", dest / "panel", ignore=ignore)
    version = version or "1.0." + datetime.datetime.now().strftime("%Y%m%d%H%M")
    cfg = (dest / "config.yaml").read_text(encoding="utf-8")
    import re
    (dest / "config.yaml").write_text(re.sub(r'(?m)^version: .*$', 'version: "%s"' % version, cfg), encoding="utf-8")
    return version


def tar_bytes(folder):
    import io
    import tarfile
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in sorted(Path(folder).rglob("*")):
            if path.name.startswith("._"):
                continue
            info = tar.gettarinfo(str(path), arcname=path.relative_to(folder).as_posix())
            info.uid = info.gid = 0
            info.uname = info.gname = "root"
            info.mode = 0o755 if path.is_dir() else 0o644  # readable by the HA builder
            if path.is_dir():
                tar.addfile(info)
            else:
                with open(path, "rb") as f:
                    tar.addfile(info, f)
    return buf.getvalue()


REMOTE_INSTALL = r"""
S=apps; ha apps --help >/dev/null 2>&1 || S=addons
for i in 1 2 3 4 5 6; do
  ha store reload >/dev/null 2>&1 && break
  echo "  waiting for the app store ($i)…"; sleep 10
done
if ha $S install local_%(slug)s >/dev/null 2>&1; then
  echo "Installed."
else
  ha $S update local_%(slug)s >/dev/null 2>&1 || ha $S rebuild local_%(slug)s
  echo "Updated."
fi
for i in $(seq 1 30); do
  ha $S info local_%(slug)s 2>/dev/null | grep -q '^version: %(version)s' && break; sleep 5
done
ha $S restart local_%(slug)s >/dev/null 2>&1 || ha $S start local_%(slug)s
sleep 3; ha $S info local_%(slug)s | grep -E '^(state|version):'
"""


def ssh_base(env):
    host = env.get("HA_SSH")
    if not host:
        raise SystemExit("Set HA_SSH=root@<HA_IP> in .env (and HA_SSH_KEY if your key is not the default one).")
    cmd = ["ssh", "-o", "StrictHostKeyChecking=accept-new"]
    if env.get("HA_SSH_PORT"):
        cmd += ["-p", env["HA_SSH_PORT"]]
    if env.get("HA_SSH_KEY"):
        cmd += ["-i", os.path.expanduser(env["HA_SSH_KEY"])]
    return cmd + [host]


def cmd_deploy_app(args):
    """Install or update the server as a Home Assistant OS local app over SSH."""
    env = load_env()
    build = ROOT / "build" / "ha-app"
    version = build_app(build)
    print("Built version %s in %s" % (version, build.relative_to(ROOT)))
    if args.build_only:
        return 0
    if not shutil.which("ssh"):
        raise SystemExit("ssh not found. On Windows 10/11 enable 'OpenSSH Client' in Optional features.")
    base = ssh_base(env)
    print("Uploading to %s:%s …" % (base[-1], REMOTE_DIR))
    up = subprocess.run(base + ["rm -rf %s && mkdir -p %s && tar xzf - -C %s" % (REMOTE_DIR, REMOTE_DIR, REMOTE_DIR)],
                        input=tar_bytes(build))
    if up.returncode:
        return up.returncode
    print("Installing (the first build can take a few minutes on a Raspberry Pi)…")
    return subprocess.call(base + [REMOTE_INSTALL % {"slug": APP_SLUG, "version": version}])


def build_parser():
    p = argparse.ArgumentParser(prog="panel.py", description=__doc__.strip().splitlines()[0])
    sub = p.add_subparsers(dest="command", metavar="<command>")
    c = sub.add_parser("check", help="run every automated check (tests, ES5 syntax)")
    c.add_argument("-v", "--verbose", action="store_true")
    c.set_defaults(func=cmd_check)
    c = sub.add_parser("validate-menu", help="check a menu file (default: panel/data/menu.js or the example)")
    c.add_argument("path", nargs="?")
    c.set_defaults(func=cmd_validate_menu)
    c = sub.add_parser("demo", help="run the panel with a fake Home Assistant and example data")
    c.add_argument("--port", type=int, default=8000)
    c.add_argument("--lang", default="en", choices=["en", "es"], help="language of the fake calendar and lists")
    c.add_argument("--extra", type=int, default=0, help="add N extra shopping items (to test long lists)")
    c.add_argument("--date", help="pretend today is YYYY-MM-DD for the fake calendar (screenshots)")
    c.set_defaults(func=cmd_demo)
    c = sub.add_parser("e2e", help="browser scenarios with Playwright (development)")
    c.add_argument("--shots", help="also save screenshots to this folder")
    c.set_defaults(func=cmd_e2e)
    c = sub.add_parser("deploy-app", help="install/update the server as a Home Assistant OS local app (SSH)")
    c.add_argument("--build-only", action="store_true", help="only build ./build/ha-app, do not upload")
    c.set_defaults(func=cmd_deploy_app)
    c = sub.add_parser("serve", help="run the server against your Home Assistant (settings in .env)")
    c.set_defaults(func=cmd_serve)
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
