# Feature Implementation Spec: The meal detail shows the matching recipe

## Source Feature

- `id`: recipe-lookup · `area`: menu · `depends_on`: panel-meal-detail, server-static-proxy · `source`: `feature_list.json`

## Goal

When the main dish matches a recipe in panel/data/recipes.json the modal shows ingredients, steps and tip; otherwise it says there is no recipe.

## Non-Goals

- Editing recipes on the panel

## Acceptance Scenarios

### Scenario 1

Given the lunch is 'Beef and courgette ragù'  
When the meal is tapped  
Then the modal shows 'Wholewheat pasta with beef and courgette ragù' with ingredients and steps in two columns

### Scenario 2

Given an unrelated dish  
When it is looked up  
Then no recipe is returned

## Technical Approach

- `server/recipes.py`: accent/plural-insensitive word overlap, EN+ES stop words, threshold 0.55
- RecipeBook reloads panel/data/recipes.json (or the example) when it changes

## Expected File Changes

- `server/recipes.py`
- `panel/data/recipes.example.json`
- `tests/test_server.py`

## Visual Design Impact

- UI involved: yes · modal.

## Verification Plan

- Unit tests: accent/plural-insensitive match, threshold rejects unrelated dishes.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
