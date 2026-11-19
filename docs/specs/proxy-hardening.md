# Feature Implementation Spec: The Home Assistant proxy only forwards what the panel uses

## Source Feature

- `id`: proxy-hardening · `area`: server · `depends_on`: server-static-proxy · `source`: `feature_list.json`

## Goal

The server holds an admin-level Home Assistant token. It must not become an open door to the whole HA API for anyone on the Wi-Fi, or for a web page opened on a device of the house.

## Non-Goals

- A login for the panel (documented as a limit in `docs/security.md`). HTTPS on the LAN (old tablets cannot use it).

## Acceptance Scenarios

1. Calls the panel makes pass: `GET /api/states`, `/api/states/<entity>`, `/api/calendars/calendar.*`; `POST` `weather.get_forecasts`, `todo.get_items`, `todo.update_item`, `input_boolean.turn_off`.
2. Anything else under `/ha/` gets 403 and is logged (e.g. `lock.unlock`, `homeassistant.restart`, `/api/config`, path tricks with `..`).
3. A `POST` that is not `application/json` gets 403 (other pages cannot send one without a CORS preflight, which the server never grants).
4. A `Host` that is not an IP, a name without dots, a local domain (`.local`, `.lan`, `.home`, `.home.arpa`, `.internal`, `.ts.net`) or listed in `ALLOWED_HOSTS` gets 403 (DNS rebinding).
5. Request bodies are capped at 64 KB.

## Technical Approach

- `server/serve.py`: `HA_GET_ALLOWED`, `HA_POST_ALLOWED`, `host_allowed()`, `guard()` before every `GET`/`POST`, `MAX_BODY`.
- `ALLOWED_HOSTS` setting (`allowed_hosts` app option).

## Verification Plan

- `python -m unittest tests.test_server` (allowlist, non-JSON POST, rebinding host, host rules); e2e still green through the proxy.
