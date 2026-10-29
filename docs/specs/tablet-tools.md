# Feature Implementation Spec: Tablet helpers work from any OS

## Source Feature

- `id`: tablet-tools · `area`: tablet · `depends_on`: quality-gate · `source`: `feature_list.json`

## Goal

`python tools/panel.py tablet-shot` saves a screenshot from the tablet; `tablet-debloat` disables listed packages (with --restore).

## Non-Goals

- Kiosk/launcher apps
- Rooting the tablet

## Acceptance Scenarios

### Scenario 1

Given the tablet connected with USB debugging  
When `tablet-shot` runs  
Then a PNG lands on the Desktop (or --out) and the temporary file on the tablet is removed

### Scenario 2

Given an Android 4.4 tablet that refuses `pm disable-user` for system apps  
When `tablet-debloat` runs  
Then each refused package is hidden with `pm block` instead; `--restore` enables and unblocks them

## Technical Approach

- `tools/panel.py tablet-shot|tablet-debloat|tablet-open` via `adb` (works from macOS, Linux and Windows)
- Package list in config/debloat.txt (comments allowed)

## Expected File Changes

- `tools/panel.py`
- `config/debloat.txt`
- `tests/test_tablet_tools.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test with a fake adb: commands issued in the right order.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
