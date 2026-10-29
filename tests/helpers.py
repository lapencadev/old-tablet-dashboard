"""Shared test helpers: start the mock HA and the server on free ports."""
import json
import os
import tempfile
import threading
import urllib.request
from pathlib import Path

from server import settings
from server.serve import make_server
from tools import mock_ha

ROOT = Path(__file__).resolve().parent.parent


def start_stack(**mock_kw):
    ha_srv, ha = mock_ha.start(0, token="test-token", **mock_kw)
    cfg = settings.load(environ={}, env_file=os.devnull, options_file=os.devnull)
    tmp = tempfile.mkdtemp()
    cfg.update(HA_URL="http://127.0.0.1:%d" % ha_srv.server_address[1], HA_TOKEN="test-token",
               STATE_DIR=tmp, PANEL_DIR=str(ROOT / "panel"))
    srv = make_server(cfg, port=0)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d" % srv.server_address[1]
    return base, ha, (srv, ha_srv)


def stop_stack(servers):
    for s in servers:
        s.shutdown()
        s.server_close()


def get(url):
    with urllib.request.urlopen(url, timeout=5) as r:
        return r.status, dict(r.headers), r.read()


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")
