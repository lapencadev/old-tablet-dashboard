# Feature Implementation Spec: The header shows current weather and today's range

## Source Feature

- `id`: panel-weather · `area`: panel · `depends_on`: demo-mode, panel-i18n · `source`: `feature_list.json`

## Goal

Temperature, condition text and max/min (plus rain mm when > 0) from an HA weather entity.

## Non-Goals

- Hourly forecast

## Acceptance Scenarios

### Scenario 1

Given weather.home exists  
When the panel loads  
Then current temperature, translated condition and max/min/rain are shown in the header

## Technical Approach

- /api/states/<weather> + weather.get_forecasts (daily)

## Expected File Changes

- `panel/app.js`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Demo screenshot shows the weather block.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
