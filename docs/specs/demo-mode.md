# Feature Implementation Spec: A demo runs without Home Assistant

## Source Feature

- `id`: demo-mode · `area`: platform · `depends_on`: server-static-proxy, panel-today-meals · `source`: `feature_list.json`

## Goal

`python tools/panel.py demo` starts a mock HA with example calendars, lists and weather plus the server, and prints the URL to open.

## Non-Goals

- WebSocket API of HA (not needed by the panel)

## Acceptance Scenarios

### Scenario 1

Given nothing configured  
When `python tools/panel.py demo` runs  
Then a fake HA and the server start and the URL is printed; the panel shows meals, agenda, tasks, shopping, weather and alerts

## Technical Approach

- `tools/mock_ha.py`: REST endpoints and services used by the panel, data relative to a configurable date, request log at /mock/log
- `tools/panel.py demo [--date] [--extra] [--lang]`
- `tools/screenshot.js` for README images

## Expected File Changes

- `tools/mock_ha.py`
- `tools/panel.py`
- `tools/screenshot.js`

## Visual Design Impact

- UI involved: indirectly (screenshots for the README).

## Verification Plan

- Playwright screenshot of the demo URL shows meals, agenda, tasks and shopping.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
