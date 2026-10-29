# Feature Implementation Spec: The server installs as a Home Assistant OS local app

## Source Feature

- `id`: ha-app-package · `area`: deploy · `depends_on`: server-static-proxy · `source`: `feature_list.json`

## Goal

One command, identical on macOS, Linux and Windows, uploads the server and the panel to Home Assistant OS and installs or updates them as a local app, so the panel keeps working with every personal computer switched off.

## Non-Goals

- Publishing an app repository (users install locally). Supervised/Container installs.

## Acceptance Scenarios

1. Given `.env` with `HA_SSH=root@<HA_IP>` and the Terminal & SSH app, when `python tools/panel.py deploy-app` runs, then the build is uploaded to `/local_apps/tablet_panel`, installed (or updated) and restarted, and `http://<HA_IP>:8000` serves the panel.
2. Given macOS, when the tarball is built, then it contains no `._*` resource-fork files (they break the HA build).
3. Given HA OS 2026, when `ha store reload` times out, then the script retries before installing.

## Technical Approach

- `ha-app/config.yaml` (slug `tablet_panel`, port 8000, `homeassistant_api: true`, options = server settings) and `ha-app/Dockerfile` (`python:3.12-alpine`, no BUILD_FROM).
- `tools/panel.py deploy-app`: build_app (fresh version) → tar in Python (0644/0755, root owner, skip `._*`) → `ssh … tar xzf -` → remote install script (`apps`/`addons` CLI names, store reload retry, install || update || rebuild, wait for version, restart).

## Verification Plan

- `python -m unittest tests.test_deploy`.
- Fake `ssh` on PATH: upload and install script are sent.
- Manual: run once against a real HA OS (owner).
