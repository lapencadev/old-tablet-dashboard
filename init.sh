#!/usr/bin/env bash
# Standard startup and verification path. Windows: python tools/panel.py check
set -euo pipefail
cd "$(dirname "$0")"
echo "Repository: $(pwd)"
if [ ! -f tools/panel.py ]; then
  echo "Harness status: pre-bootstrap (tools/panel.py not created yet)."
  echo "Next step: implement feature 'quality-gate' from feature_list.json."
  python3 -m json.tool feature_list.json >/dev/null && echo "feature_list.json: valid JSON"
  exit 0
fi
exec python3 tools/panel.py check "$@"
