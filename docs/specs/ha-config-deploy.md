# Feature Implementation Spec: HA automations are rendered from templates and deployed

## Source Feature

- `id`: ha-config-deploy · `area`: deploy · `depends_on`: quality-gate · `source`: `feature_list.json`

## Goal

`python tools/panel.py deploy-ha` fills ha/templates with values from .env and creates or updates the automations and scripts through the HA REST API.

## Non-Goals

- Editing configuration.yaml
- HA packages folder (alternative documented later)

## Acceptance Scenarios

### Scenario 1

Given `.env` with HA_URL, HA_TOKEN, TELEGRAM_CHAT_ID  
When `python tools/panel.py deploy-ha` runs  
Then every script and automation of ha/templates is rendered and POSTed once to /api/config/<kind>/config/<id>

### Scenario 2

Given a non-numeric chat id  
When deploy-ha runs  
Then it stops with a message explaining the expected value

### Scenario 3

Given --dry-run  
When deploy-ha runs  
Then it lists what would be sent without contacting HA

## Technical Approach

- `server/ha_templates.py`: @@CHAT_ID@@/@@SHOPPING@@/@@TASKS@@/@@CMD:x@@/@@J:path@@ placeholders; texts from config/ha.<lang>.json; PyYAML to parse
- `tools/panel.py deploy-ha [--lang] [--only] [--dry-run]` and `ha-check`

## Expected File Changes

- `server/ha_templates.py`
- `tools/panel.py`
- `config/ha.en.json`
- `config/ha.es.json`
- `tests/test_deploy.py`
- `tests/test_ha_templates.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test against the mock HA: every automation and script id is POSTed once.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
