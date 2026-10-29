# Feature Implementation Spec: The panel shows today's meals with the current one highlighted

## Source Feature

- `id`: panel-today-meals · `area`: panel · `depends_on`: menu-format-example · `source`: `feature_list.json`

## Goal

Opening panel/index.html with the example menu shows the weekday, date, clock and today's meals; meals already over are faded and the current one is highlighted.

## Non-Goals

- Recipes (recipe-lookup)
- Week picker (week-picker)

## Acceptance Scenarios

### Scenario 1

Given the example menu and a fake clock at 12:30 on 2026-11-04  
When the panel loads  
Then breakfast and mid-morning are faded, lunch is highlighted, dinner normal; the weekday reads Wednesday

## Technical Approach

- `panel/core.js` (pure, testable): planFor, currentMeal, mainDish
- `panel/app.js` renders rows from MENU.meals; secondary person shown only when the main dish differs
- `window.__NOW__` overrides the clock for tests

## Expected File Changes

- `panel/index.html`
- `panel/core.js`
- `panel/app.js`
- `panel/styles.css`
- `tests/js/core.test.js`
- `tests/e2e/panel.e2e.js`

## Visual Design Impact

- UI involved: yes · DESIGN.md meal row states (past/now).

## Verification Plan

- JS test: week resolution picks the right week/day for a date inside, before and after the menu.
- Screenshot of the demo at 12:30 shows lunch highlighted.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
