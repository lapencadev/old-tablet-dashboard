# Feature Implementation Spec: /help explains every command

## Source Feature

- `id`: telegram-help · `area`: telegram · `depends_on`: telegram-menu-bot · `source`: `feature_list.json`

## Goal

/help (also /ayuda and /start) replies with every command and an example, in the configured language.

## Non-Goals

- Per-user help

## Acceptance Scenarios

### Scenario 1

Given the group  
When someone sends /help, /ayuda or /start  
Then the bot replies with every command and an example, in the configured language, using the command names of the HA packages

## Technical Approach

- `server/i18n.py` help text filled with config/ha.<lang>.json commands

## Expected File Changes

- `server/i18n.py`
- `server/menu_bot.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test: help text lists every command registered by the packages.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
