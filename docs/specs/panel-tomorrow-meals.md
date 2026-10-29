# Feature Implementation Spec: The panel shows tomorrow's lunch and dinner

## Source Feature

- `id`: panel-tomorrow-meals · `area`: panel · `depends_on`: panel-today-meals · `source`: `feature_list.json`

## Goal

A 'Tomorrow' card lists the meals marked `tomorrow: true` for the next day, including when tomorrow falls in another week.

## Non-Goals

- Showing every meal of tomorrow

## Acceptance Scenarios

### Scenario 1

Given it is Sunday 2026-11-08  
When the panel loads  
Then the Tomorrow card shows Monday's lunch and dinner (Turkey curry) from the repeated week

## Technical Approach

- planFor(date + 1 day); meals with `tomorrow: true`

## Expected File Changes

- `panel/app.js`

## Visual Design Impact

- UI involved: yes · same meal row component.

## Verification Plan

- Screenshot with fake date on a Sunday shows Monday of the next week.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
