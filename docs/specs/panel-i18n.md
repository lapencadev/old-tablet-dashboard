# Feature Implementation Spec: The panel speaks English or Spanish

## Source Feature

- `id`: panel-i18n · `area`: panel · `depends_on`: panel-today-meals · `source`: `feature_list.json`

## Goal

With `LANG: 'es'` in config every fixed text, weekday, month and weather condition is Spanish; with `'en'` English.

## Non-Goals

- Languages other than English and Spanish

## Acceptance Scenarios

### Scenario 1

Given config LANG 'es'  
When the panel loads on Wednesday 4 November  
Then headings, weekday, date line, agenda labels and weather conditions are in Spanish

### Scenario 2

Given a new key is added to English only  
When JS tests run  
Then they fail naming the missing key

## Technical Approach

- `panel/i18n.js` tables; `PanelCore.translator` with {placeholders}
- Test checks keys and placeholders of every language

## Expected File Changes

- `panel/i18n.js`
- `panel/core.js`
- `tests/js/core.test.js`

## Visual Design Impact

- UI involved: no

## Verification Plan

- JS test: every key in the English table exists in the Spanish table.
- Screenshots in both languages.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
