# Feature Implementation Spec: The generic menu format is documented and has a valid example

## Source Feature

- `id`: menu-format-example · `area`: menu · `depends_on`: quality-gate · `source`: `feature_list.json`

## Goal

Fix one menu format that every other part (panel, `/menu`, adapters) reads, ship a realistic example, and let users check their own file.

## Non-Goals

- Syncing from other apps (menu-sync-adapter). Rendering (panel-today-meals).

## Acceptance Scenarios

1. Given the example menu, when `python tools/panel.py validate-menu` runs, then it prints "valid" with people, meals and weeks.
2. Given a week with 6 days or a non-Monday start, when validated, then each problem is listed naming the week and the exit code is 1.
3. Given a hand-written file with comments and trailing commas, when loaded, then it parses (json5).

## Technical Approach

- `server/menu.py`: `parse_js_object`, `load_menu`, `dump_menu`, `validate`, `resolve_week` (same rules as the panel; reused by `/menu`).
- `panel/data/menu.example.js`: 2 people, 5 meals, one week (`repeat: 2`) with shopping suggestions.
- `tools/panel.py validate-menu [path]`.

## Verification Plan

- `python -m unittest tests.test_menu` (validation + week resolution cases).
- Manual: CLI on the example and on a broken copy.
