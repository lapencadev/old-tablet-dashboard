# Feature Implementation Spec: Remote calendars refresh every 15 minutes

## Source Feature

- `id`: calendar-refresh · `area`: ha · `depends_on`: ha-config-deploy · `source`: `feature_list.json`

## Goal

An automation updates every calendar entity every 15 minutes so iCal changes show up quickly.

## Non-Goals

- Changing the Remote Calendar integration

## Acceptance Scenarios

### Scenario 1

Given calendars from Remote Calendar  
When 15 minutes pass  
Then homeassistant.update_entity runs on every calendar.* entity

## Technical Approach

- ha/templates/calendar.yaml time_pattern /15

## Expected File Changes

- `ha/templates/calendar.yaml`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test: rendered automation parses.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
