# Feature Implementation Spec: A week can be chosen by hand and is shared

## Source Feature

- `id`: week-picker · `area`: panel · `depends_on`: server-static-proxy, panel-today-meals · `source`: `feature_list.json`

## Goal

Tapping the week label opens a list of weeks plus 'Automatic'; the choice is stored on the server so every screen and /menu use it.

## Non-Goals

- Editing weeks

## Acceptance Scenarios

### Scenario 1

Given two screens show the panel  
When a week is chosen on one  
Then GET /panel/week returns it and the label turns green (manual) on both after the 30 s poll

### Scenario 2

Given a manual week  
When 'Automatic' is chosen  
Then the choice is cleared

## Technical Approach

- State.set_week with key validation; panel polls /panel/week every 30 s

## Expected File Changes

- `server/state.py`
- `server/serve.py`
- `panel/app.js`

## Visual Design Impact

- UI involved: yes · modal list.

## Verification Plan

- Unit test: POST /panel/week then GET returns it; JS test: planFor honours the choice.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
