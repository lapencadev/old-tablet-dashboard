# Feature Implementation Spec: The panel shows tasks and shopping and ticks them on tap

## Source Feature

- `id`: panel-todo-lists · `area`: panel · `depends_on`: demo-mode · `source`: `feature_list.json`

## Goal

Pending items of two HA to-do lists are shown with due chips; tapping one marks it completed in HA and it disappears.

## Non-Goals

- Adding items from the panel (done from Telegram)

## Acceptance Scenarios

### Scenario 1

Given the shopping list has Milk  
When Milk is tapped  
Then HA receives todo.update_item with status completed and the item disappears after the refresh

## Technical Approach

- todo.get_items with return_response; due chips via PanelCore.dueLabel

## Expected File Changes

- `panel/app.js`

## Visual Design Impact

- UI involved: yes · DESIGN.md to-do row.

## Verification Plan

- Playwright on demo: click a shopping item, the mock HA receives todo.update_item with status completed.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
