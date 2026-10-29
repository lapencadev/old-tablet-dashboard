# Feature Implementation Spec: Night mode dims the panel

## Source Feature

- `id`: panel-night-mode · `area`: panel · `depends_on`: panel-today-meals · `source`: `feature_list.json`

## Goal

Dark theme from 23:00 to 07:00 in Auto; the header button cycles Auto → Day → Night and is remembered by the tablet.

## Non-Goals

- Screen brightness control (Android-level)

## Acceptance Scenarios

### Scenario 1

Given Auto mode at 23:30  
When the panel loads  
Then html has class night and the mode chip reads 'Auto · night'

### Scenario 2

Given night mode  
When the chip is tapped  
Then mode changes to Day and is stored in localStorage

## Technical Approach

- PanelCore.isNight with NIGHT_FROM/NIGHT_TO wrapping midnight

## Expected File Changes

- `panel/core.js`
- `panel/app.js`
- `panel/styles.css`

## Visual Design Impact

- UI involved: yes · DESIGN.md night tokens.

## Verification Plan

- Screenshot with fake time 23:30 shows the dark theme.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
