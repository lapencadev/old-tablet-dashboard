# Feature Implementation Spec: The group manages tasks from Telegram

## Source Feature

- `id`: telegram-tasks · `area`: telegram · `depends_on`: ha-config-deploy · `source`: `feature_list.json`

## Goal

'! call plumber @friday' adds a task with a due date; /tasks lists them with buttons to complete.

## Non-Goals

- Recurring tasks

## Acceptance Scenarios

### Scenario 1

Given the group chat  
When someone writes '! call the plumber @friday'  
Then a task with Friday's date is created and confirmed

### Scenario 2

Given an unknown date word  
When the task is added  
Then it is saved without a date and the bot says it did not understand the date

## Technical Approach

- ha/templates/tasks.yaml; date words per language (today/tomorrow/weekdays incl. short forms, d/m)

## Expected File Changes

- `ha/templates/tasks.yaml`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test: rendered YAML parses; manual in a real group.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
