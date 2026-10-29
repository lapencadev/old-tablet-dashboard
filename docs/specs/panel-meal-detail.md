# Feature Implementation Spec: Tapping a meal opens its full detail

## Source Feature

- `id`: panel-meal-detail · `area`: panel · `depends_on`: panel-today-meals · `source`: `feature_list.json`

## Goal

Tapping a meal row opens a modal with every person's full dish text; tapping outside or 'Close' closes it.

## Non-Goals

- Editing meals from the tablet

## Acceptance Scenarios

### Scenario 1

Given the panel shows today's meals  
When a meal row is tapped  
Then a modal shows each person's full text (without the 'see recipe book' suffix)

### Scenario 2

Given the modal is open  
When the scrim outside the card is tapped  
Then the modal closes

## Technical Approach

- Generic modal (`#modal`) reused by meal detail, full lists, agenda and week picker

## Expected File Changes

- `panel/app.js`
- `panel/styles.css`

## Visual Design Impact

- UI involved: yes · DESIGN.md modal.

## Verification Plan

- Playwright: click a meal, modal shows both people's text, click outside closes it.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
