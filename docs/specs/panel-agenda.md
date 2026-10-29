# Feature Implementation Spec: The panel shows the next seven days of calendar events

## Source Feature

- `id`: panel-agenda · `area`: panel · `depends_on`: demo-mode · `source`: `feature_list.json`

## Goal

Events from all HA calendars (or a configured list) appear grouped by day for 7 days; non-main calendars get a chip; multi-day events repeat on each day.

## Non-Goals

- Creating events from the panel

## Acceptance Scenarios

### Scenario 1

Given two calendars in HA  
When the panel loads  
Then 7 day blocks with all-day and timed events; the non-main calendar shows a chip; tapping opens the full week

## Technical Approach

- CALENDARS 'auto' lists calendar.* from /api/states; MAIN_CALENDAR first
- Multi-day events repeat each day; all-day end date is exclusive

## Expected File Changes

- `panel/app.js`

## Visual Design Impact

- UI involved: yes · DESIGN.md agenda block.

## Verification Plan

- Demo screenshot shows an all-day event, a timed event and a second-calendar chip.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
