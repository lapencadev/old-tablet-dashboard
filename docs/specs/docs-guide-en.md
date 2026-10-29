# Feature Implementation Spec: A step-by-step guide in English

## Source Feature

- `id`: docs-guide-en · `area`: docs · `depends_on`: docs-readme · `source`: `feature_list.json`

## Goal

docs/guide.md walks from an old tablet and HA OS to a working panel and Telegram bot, with macOS and Windows commands side by side.

## Non-Goals

- Other Home Assistant install types

## Acceptance Scenarios

### Scenario 1

Given someone with HA OS and an old tablet  
When they follow docs/guide.md  
Then they reach a working panel and Telegram commands, with macOS and Windows commands side by side

## Technical Approach

- Sections 0-10; every `tools/panel.py` command checked by tests/test_docs.py

## Expected File Changes

- `docs/guide.md`
- `tests/test_docs.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Every command in the guide exists in tools/panel.py --help.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
