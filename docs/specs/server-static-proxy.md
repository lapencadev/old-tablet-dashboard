# Feature Implementation Spec: The server serves the panel and proxies Home Assistant

## Source Feature

- `id`: server-static-proxy · `area`: server · `depends_on`: quality-gate · `source`: `feature_list.json`

## Goal

`python server/serve.py` serves panel/ and forwards /ha/* to HA_URL adding the token; the browser never receives the token.

## Non-Goals

- Telegram bot and menu sync (separate features)
- Authentication of the panel itself (LAN-only by design)

## Acceptance Scenarios

### Scenario 1

Given the server runs with HA_URL and HA_TOKEN  
When the browser requests /ha/api/states  
Then HA receives the request with `Authorization: Bearer <token>` and the browser gets the JSON without the token

### Scenario 2

Given no personal config.js exists  
When the browser loads /config.js  
Then an empty script is returned instead of a 404

### Scenario 3

Given any static file  
When it is served  
Then the response has `Cache-Control: no-store`

## Technical Approach

- `server/serve.py` on `http.server.ThreadingHTTPServer`; `make_server(cfg)` for tests
- `server/settings.py`: defaults < .env < environment < /data/options.json; SUPERVISOR_TOKEN switches to http://supervisor/core
- `server/state.py` and `server/recipes.py` used by the /panel/* endpoints

## Expected File Changes

- `server/serve.py`
- `server/settings.py`
- `server/state.py`
- `server/recipes.py`
- `tests/test_server.py`
- `tests/helpers.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test with the mock HA: GET /ha/api/states returns states and the mock saw the Authorization header.
- Responses carry Cache-Control: no-store.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
