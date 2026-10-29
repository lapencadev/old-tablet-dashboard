# Feature Implementation Spec: Configured alerts appear as banners

## Source Feature

- `id`: panel-alerts · `area`: panel · `depends_on`: demo-mode, panel-i18n · `source`: `feature_list.json`

## Goal

Toggle alerts show while their input_boolean is on (button turns it off); date alerts show N days before an input_datetime.

## Non-Goals

- Push notifications

## Acceptance Scenarios

### Scenario 1

Given input_boolean.laundry_waiting is on and input_datetime.vet_visit is in 3 days  
When the panel loads  
Then both banners show; 'Done' calls input_boolean.turn_off

## Technical Approach

- ALERTS and DATE_ALERTS in config; texts from config, wording around dates from i18n

## Expected File Changes

- `panel/app.js`
- `panel/config.example.js`

## Visual Design Impact

- UI involved: yes · DESIGN.md alert banner.

## Verification Plan

- Playwright on demo: banner visible, button press makes mock HA receive input_boolean.turn_off.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
