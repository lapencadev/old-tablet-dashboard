# Feature Implementation Spec: Photos fill the free space

## Source Feature

- `id`: panel-photos · `area`: panel · `depends_on`: panel-fit · `source`: `feature_list.json`

## Goal

Configured photos rotate every N minutes in the free space under the agenda and the lists; they hide instead of becoming tiny.

## Non-Goals

- Photo albums from HA or the cloud

## Acceptance Scenarios

### Scenario 1

Given PHOTOS has the example image  
When the panel loads  
Then the image fills the free space with its caption

### Scenario 2

Given PHOTOS and PHOTOS_SIDE are empty  
When the panel loads  
Then both photo cards are hidden

## Technical Approach

- CSS background-size: contain on a flex:1 card with 150px minimum; rotation by PHOTO_MINUTES

## Expected File Changes

- `panel/app.js`
- `panel/img/example-photo.svg`

## Visual Design Impact

- UI involved: yes.

## Verification Plan

- Demo screenshot shows the example photo; with no photos configured the cards are hidden.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
