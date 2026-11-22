# Progress Log

## Current Verified State

- Repository root: `old-tablet-dashboard/`
- Standard startup path: `./init.sh` (Windows: `python tools/panel.py check`)
- Standard verification path: `./init.sh` (62 Python tests, 12 JS logic tests, ES5 gate, personal-data scan) + `python tools/panel.py e2e` (18 Playwright scenarios, needs `npm i -D playwright`)
- Features: 32 `passing`, 3 `blocked`, 0 `accepted` (no independent validation yet)
- Current next step: run `feature-validator` in a fresh session, feature by feature in list order, starting with `quality-gate`
- Current blockers (need the owner's real setup):
  - `ha-app-package` — one real `deploy-app` against Home Assistant OS.
  - `telegram-shopping`, `telegram-tasks` — try `+`, `-`, `/compra`, `!` and `/tareas` in the real group after `deploy-ha`.
- Last verified at: 2026-11-19

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

### Session 004

- Date: 2026-10-30
- Goal: First GitHub push failed on Windows CI; owner asked whether the project is secure.
- Completed: explicit UTF-8 everywhere (Windows code page), LF line endings, CI actions off Node 20 plus a non-UTF-8 locale step; security review → `proxy-hardening` (allowlist, JSON-only POST, host check, body cap) and `docs/security.md`.
- Verification run: `./init.sh` green (also with `LC_ALL=C PYTHONUTF8=0`), e2e 14/14.

### Session 005

- Date: 2026-11-17 → 2026-11-18
- Goal: fix ticking items on a real HA; add the owner's "clock in" idea as an optional feature.
- Completed: `?return_response` only for actions that return data (HA answered 400 to `todo.update_item`); the fake HA now behaves the same. New `work-timer` (off by default, hours set by each user) with week modal and manual corrections; docs in both guides.
- Verification run: `./init.sh` green, e2e 17/17.
- Also: `panel-calendar` (tap the agenda → week/month calendar), e2e 18/18.

### Session 006

- Date: 2026-11-19
- Goal: full review before sharing the repo.
- Completed: screenshots refreshed (work timer, big calendar), photo next to the timer shown whole; stale details fixed (`PANEL_LANG` in technical discovery, missing `proxy-hardening` spec, `.env.example` with `MENU_PASSWORD` and `ALLOWED_HOSTS`, work day in the domain model, security link in both guides, cryptography in credits).
- Verification run: `./init.sh` green with the private word list, e2e 18/18, CI green on Linux, Windows and Python 3.9; no open PRs, issues or Dependabot alerts.
- Next best step: unchanged — the three blocked checks on the real setup, then `feature-validator` sessions.

## Session
- Date: 2026-11-22
- Goal: work timer counts holidays and vacation.
- Completed: all-day calendar events whose title matches `WORK_TIMER.OFF_WORDS` are days off (only on workdays): week target drops, bar hatched, tag in the week modal; guides EN/ES and spec updated.
- Verification run: `./init.sh` green, e2e 20/20 (also `OFF_CALENDARS` to skip public holiday calendars).
- Next best step: unchanged.
