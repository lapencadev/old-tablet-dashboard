# Feature Implementation Spec: A daily checklist is shared between screens

## Source Feature

- `id`: panel-checklist · `area`: panel · `depends_on`: server-static-proxy, panel-today-meals · `source`: `feature_list.json`

## Goal

Configured items show as chips in the header (due, late, done); tapping toggles and the state is stored on the server for that date.

## Non-Goals

- History of past days (kept 14 days, not shown)

## Acceptance Scenarios

### Scenario 1

Given the checklist has 'plants' 18-21h  
When the chip is tapped  
Then POST /panel/checklist stores it for today's date and the chip shows done

## Technical Approach

- `server/state.py` set_check/get_checklist with date validation
- PanelCore.checklistState (due/late/done)

## Expected File Changes

- `server/state.py`
- `server/serve.py`
- `panel/app.js`

## Visual Design Impact

- UI involved: yes · DESIGN.md checklist chip.

## Verification Plan

- Unit test: POST /panel/checklist then GET returns the tick for that date only.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
