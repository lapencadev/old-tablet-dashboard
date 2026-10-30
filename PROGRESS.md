# Progress Log

## Current Verified State

- Repository root: `old-tablet-dashboard/`
- Standard startup path: `./init.sh` (Windows: `python tools/panel.py check`)
- Standard verification path: `./init.sh` (55 Python tests, 11 JS logic tests, ES5 gate) + `python tools/panel.py e2e` (14 Playwright scenarios, needs `npm i -D playwright`)
- Features: 29 `passing`, 3 `blocked`, 0 `accepted` (no independent validation yet)
- Current next step: run `feature-validator` in a fresh session, feature by feature in list order, starting with `quality-gate`
- Current blockers (need the owner's real setup):
  - `ha-app-package` — one real `deploy-app` against Home Assistant OS.
  - `telegram-shopping`, `telegram-tasks` — try `+`, `-`, `/compra`, `!` and `/tareas` in the real group after `deploy-ha`.
- Last verified at: 2026-10-30

## Session Log

### Session 001

- Date: 2026-10-30
- Goal: Discovery docs and minimal startup harness, derived from the working private setup.
- Completed: `CONTEXT.md`, `docs/build-brief.md`, `docs/domain-model.md`, `docs/technical-discovery.md`, `docs/risks-and-open-questions.md`, `DESIGN.md`, `AGENTS.md`, `init.sh`, `PROGRESS.md`, `feature_list.json` (32 features).
- Verification run: feature list schema, ids, dependencies and cycles checked.
- Note: build-brief was written from decisions the owner made while building the original system (no new interview); open questions are in `docs/risks-and-open-questions.md`.

### Session 002

- Date: 2026-10-30 (same night, unattended)
- Goal: Implement the MVP and the rest of the list by porting and generalising the private system.
- Completed: every feature implemented with a spec in `docs/specs/` and evidence in `feature_list.json`.
- Deviation from the harness: features were implemented ahead of their dependencies' independent acceptance, because the behaviour already existed and was being ported, not designed. Nothing is `accepted`; validation must happen in fresh sessions.
- Verification run: `./init.sh` green (also with the owner's private word list for the personal-data scan); `python tools/panel.py e2e --shots docs/img` → 14/14 scenarios.
- Things found and fixed by the gates: a placeholder chat id shaped like a real one (caught by the personal-data scan); `LANG` clashed with the system locale (renamed to `PANEL_LANG`); "Todo el día" overlapped in the Spanish agenda (screenshot review).
- Known risks: Home Assistant UI names in the guides come from HA 2026 and may differ slightly by version; the Telegram integration setup steps are described generically.
- Next best step: owner reviews the README and guides, decides the repository name and git identity, runs the three blocked checks on the real setup; then `feature-validator` sessions.

### Session 003

- Date: 2026-10-30
- Goal: Support the author's menu website after it gained a password-protected part, and stop naming that site in public.
- Completed: adapter renamed to `static-site` (`server/adapters/static_site.py`, feature `menu-sync-adapter`); optional `menu_password` decrypts `private.enc.json` (PBKDF2-SHA256 + AES-256-GCM); recipe aliases (`data-alias`); source formats documented in `docs/menu-sources.md` and `docs/es/fuentes-de-menu.md`; troubleshooting row for a wrong password.
- Verification run: `./init.sh` green with the private word list; decryption checked against a real build of the site with a test password.
- Next best step: unchanged — the three blocked checks on the real setup, then `feature-validator` sessions.
