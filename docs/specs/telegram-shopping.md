# Feature Implementation Spec: The group manages the shopping list from Telegram

## Source Feature

- `id`: telegram-shopping · `area`: telegram · `depends_on`: ha-config-deploy · `source`: `feature_list.json`

## Goal

'+ milk, eggs' adds (sorted by section, no duplicates), '- eggs' removes, /shopping (or /compra) lists with tap-to-tick buttons.

## Non-Goals

- Sharing with Google Keep or other list apps

## Acceptance Scenarios

### Scenario 1

Given the group chat  
When someone writes '+ milk, eggs and bread'  
Then the three products are added with their section; duplicates answered as 'already on the list'

### Scenario 2

Given 'Eggs' on the list  
When someone writes '- eggs'  
Then it is removed and the bot confirms

### Scenario 3

Given the list has items  
When someone sends /shopping (/compra in Spanish)  
Then the bot lists them by section with tap-to-tick buttons

## Technical Approach

- ha/templates/shopping.yaml (scripts otd_shopping_add/list, automations add/remove/show/buttons)
- Sections: ordered regex rules per language in config/ha.<lang>.json; first match wins

## Expected File Changes

- `ha/templates/shopping.yaml`
- `config/ha.en.json`
- `config/ha.es.json`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Unit test: rendered YAML has no unresolved placeholders and parses; manual in a real group.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
