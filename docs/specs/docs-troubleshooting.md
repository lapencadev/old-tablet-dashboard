# Feature Implementation Spec: Known problems and fixes are documented

## Source Feature

- `id`: docs-troubleshooting · `area`: docs · `depends_on`: docs-guide-en · `source`: `feature_list.json`

## Goal

docs/troubleshooting.md (and docs/es/problemas.md) list every problem met while building the original setup with cause and fix.

## Non-Goals

- Generic Home Assistant support

## Acceptance Scenarios

### Scenario 1

Given a problem met during the original build  
When someone hits it  
Then they find symptom, cause and fix in EN or ES

## Technical Approach

- Tables by area; same number of rows in both languages (tested); scanned by the personal-data test

## Expected File Changes

- `docs/troubleshooting.md`
- `docs/es/problemas.md`

## Visual Design Impact

- UI involved: no

## Verification Plan

- No personal data (test greps the docs).

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
