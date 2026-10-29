# Feature Implementation Spec: One command runs every automated check

## Source Feature

- `id`: quality-gate · `area`: platform · `depends_on`: [] · `status`: not_started · `source`: `feature_list.json`

## Goal

A single, cross-platform entry point (`python tools/panel.py check`, wrapped by `./init.sh`) runs every automated check so agents and contributors share one definition of "green".

## Non-Goals

- Writing the product tests themselves (each feature adds its own).
- Linting style (no flake8/eslint): only correctness gates.

## Acceptance Scenarios

### Scenario 1: clean tree
Given a clean checkout with Python 3.9+ (and Node 18+ optional)
When `./init.sh` runs
Then Python unit tests, JS tests and the ES5 check run and the exit code is 0.

### Scenario 2: modern syntax slips in
Given `let x = 1;` is added to `panel/app.js`
When the check runs
Then it fails naming `panel/app.js` and the line.

### Scenario 3: no Node installed
Given `node` is not on PATH
When the check runs
Then Python tests run, JS checks are reported as skipped, exit code reflects Python results only.

## Technical Approach

- `tools/panel.py`: argparse CLI with sub-commands; `check` runs `python -m unittest discover -s tests -t .`, then `node --test tests/js/` and `node tools/es5check.js panel/*.js`.
- `tools/es5check.js`: uses `acorn` (devDependency in `package.json`) with `ecmaVersion: 5`; prints `file:line:col message`.
- `package.json` only for dev tooling (acorn, playwright optional).
- CI: `.github/workflows/ci.yml` runs `npm ci` + `python tools/panel.py check` on ubuntu and windows.

## Expected File Changes

- `tools/panel.py`, `tools/es5check.js`, `package.json`, `tests/__init__.py`, `tests/test_smoke.py`, `tests/js/smoke.test.js`, `.github/workflows/ci.yml`, `init.sh` (already delegates).

## Verification Plan

- `./init.sh` → exit 0.
- Temporarily append `let x = 1;` to a panel file → non-zero with location; revert.

## Evidence To Capture

- Output lines of both runs.
