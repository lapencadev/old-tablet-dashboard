# Feature Implementation Spec: The menu can be synced from the author's site through an adapter

## Source Feature

- `id`: menu-sync-adapter · `area`: menu · `depends_on`: menu-format-example, server-static-proxy · `source`: `feature_list.json`

## Goal

Keep the panel's menu in sync with an external meal-planning app without the panel knowing that app's format. the author's site (the author's app) is the first adapter and the template for others; a `generic` adapter downloads a file already in the generic format.

## Non-Goals

- Writing back to the source app. Adapters for other apps (documented as an extension point).

## Acceptance Scenarios

1. Given MENU_URL and MENU_ADAPTER=static-site, when the sync runs, then `panel/data/menu.js` (generic, valid) and `panel/data/recipes.json` are written.
2. Given the source returns something invalid, when the sync runs, then the previous menu is kept and the error is logged.
3. Given a the author's site week with `weeks: 2` and a title "2-15 noviembre 2026", then the generic week has `start: 2026-11-02, repeat: 2`.
4. Given shopping lines with several products, then `/menu` suggestions split them (shared `server/shopping.py`).

## Technical Approach

- `server/adapters/static_site.py`: convert_menu (slots → meals with default end hours; R/J → people a/b with labels from MENU_PEOPLE), convert_recipes (HTML cards → JSON).
- `server/sync.py`: build → validate → atomic write; loop every MENU_SYNC_MINUTES (default 60).
- Settings: MENU_URL, MENU_ADAPTER, MENU_PEOPLE, RECIPES_URL (HA app options: menu_url, menu_adapter, menu_people, recipes_url).

## Verification Plan

- `python -m unittest tests.test_sync` with synthetic the author's site fixtures.
