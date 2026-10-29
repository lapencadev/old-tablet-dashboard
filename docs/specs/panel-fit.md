# Feature Implementation Spec: Everything fits one screen without scrolling

## Source Feature

- `id`: panel-fit · `area`: panel · `depends_on`: panel-agenda, panel-todo-lists · `source`: `feature_list.json`

## Goal

With long lists the panel shows '+N more · see all' (opening the full list) before shrinking text; nothing is clipped at 1280×672.

## Non-Goals

- Scrolling

## Acceptance Scenarios

### Scenario 1

Given 22 shopping items at 1280×672  
When the panel loads  
Then every column ends inside the viewport and Shopping shows '+N more · see all'; tapping it opens the full list

## Technical Approach

- fit(): reset limits → trim lists of the overflowing column down to minimums → fit-0…fit-7 text levels → hide photos under 130px

## Expected File Changes

- `panel/app.js`
- `panel/styles.css`

## Visual Design Impact

- UI involved: yes · DESIGN.md principle 1.

## Verification Plan

- Playwright with 15 shopping items at 1280×672: last card bottom ≤ viewport height and a '+N more' row exists.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
