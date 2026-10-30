# Feature Implementation Spec: The menu can be synced from a website through an adapter

## Source Feature

- `id`: menu-sync-adapter · `area`: menu · `depends_on`: menu-format-example, server-static-proxy · `source`: `feature_list.json`

## Goal

Keep the panel's menu in sync with an external meal-planning website without the panel knowing that site's format. Two adapters ship: `generic` downloads a file already in the panel format; `static-site` reads the format of the author's own meal-planning website (plain JS data files + recipe cards, optionally a password-protected `private.enc.json`). Both formats are documented in `docs/menu-sources.md` so others can publish the same way or copy an adapter.

## Non-Goals

- Writing back to the source site. Adapters for other apps (documented as an extension point).

## Acceptance Scenarios

1. Given MENU_URL and MENU_ADAPTER=static-site, when the sync runs, then `panel/data/menu.js` (generic, valid) and `panel/data/recipes.json` are written.
2. Given the source returns something invalid, when the sync runs, then the previous menu is kept and the error is logged.
3. Given a source week with `weeks: 2` and a title "2-15 noviembre 2026", then the generic week has `start: 2026-11-02, repeat: 2`.
4. Given shopping lines with several products, then `/menu` suggestions split them (shared `server/shopping.py`).
5. Given the site publishes `private.enc.json` and MENU_PASSWORD is right, then weeks and shopping come from the decrypted file; a wrong password keeps the previous menu.
6. Given a recipe card with `data-alias="A|B"`, then a dish named A or B shows that recipe.

## Technical Approach

- `server/adapters/static_site.py`: convert_menu (slots → meals with default end hours; R/J → people a/b with labels from MENU_PEOPLE), convert_recipes (HTML cards → JSON, with aliases), private_files (PBKDF2-SHA256 + AES-256-GCM).
- `server/sync.py`: build → validate → atomic write; loop every MENU_SYNC_MINUTES (default 60).
- Settings: MENU_URL, MENU_ADAPTER, MENU_PEOPLE, MENU_PASSWORD, RECIPES_URL (HA app options: menu_url, menu_adapter, menu_people, menu_password, recipes_url).

## Verification Plan

- `python -m unittest tests.test_sync` with synthetic static-site fixtures, including an encrypted one.
