# Feature Implementation Spec: /menu suggests the week's shopping as checkboxes

## Source Feature

- `id`: telegram-menu-bot · `area`: telegram · `depends_on`: menu-format-example, telegram-shopping, ha-app-package · `source`: `feature_list.json`

## Goal

/menu answers with the week's shopping suggestions as toggle buttons (All, None, Add, Close); Add sends the selection to the shopping script.

## Non-Goals

- AI suggestions (future idea)
- Editing the menu from Telegram

## Acceptance Scenarios

### Scenario 1

Given the menu has shopping suggestions for this week  
When someone sends /menu  
Then the bot answers with one toggle button per product grouped by category, plus All/None/Add/Close

### Scenario 2

Given products ticked  
When Add is pressed  
Then script.otd_shopping_add receives exactly the ticked products and the message is replaced by a summary

### Scenario 3

Given a week chosen by hand on the panel  
When /menu is sent  
Then the suggestions are those of the chosen week

### Scenario 4

Given a message from another chat  
When it arrives  
Then it is ignored

## Technical Approach

- `server/menu_bot.py`: websocket client (auth, subscribe telegram_command/telegram_callback), MenuSession, suggestions via `server/shopping.py`
- Runs inside the server when TELEGRAM_CHAT_ID is set

## Expected File Changes

- `server/menu_bot.py`
- `server/i18n.py`
- `tests/test_menu_bot.py`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test: session toggling and keyboard layout; multi-product lines split correctly.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
