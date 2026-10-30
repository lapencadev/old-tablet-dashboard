# Project Agent Instructions

This repository turns an old tablet into an always-on family panel (meals, agenda, tasks, shopping, weather) served by a small Python server that runs inside Home Assistant OS, plus Telegram commands to edit the lists.

## Read First

- `CONTEXT.md` — domain language.
- `docs/build-brief.md` — goals, non-goals and MVP.
- `docs/domain-model.md` — menu format, week resolution, checklist, alerts.
- `docs/risks-and-open-questions.md` — risks and open questions.
- `docs/technical-discovery.md` — runtime constraints (ES5 panel!), data flow, security.
- `DESIGN.md` — before touching anything visual.

## Startup Workflow

1. Confirm the working directory with `pwd`.
2. Read `PROGRESS.md` for the current verified state and next step.
3. Read `feature_list.json` and pick the first unfinished feature in list order whose `depends_on` features are all `accepted`.
4. Run `./init.sh` (Windows: `python tools/panel.py check`).
5. If the baseline fails, fix it before adding feature work.

## Hard Rules

- `panel/*.js` is **ES5 only** (Chrome 40): no `let`/`const`, arrow functions, template literals, `fetch`, Promises, classes, spread, `Array.prototype.includes`. CSS: no variables, grid or flex `gap`; add `-webkit-` flexbox prefixes.
- No personal data in tracked files: example names, example entities, `192.168.1.x` only in placeholders like `<HA_IP>`.
- User-facing commands go through `tools/panel.py` so they work on macOS, Linux and Windows. No bash-only steps in the guides.
- Server code: Python 3.9+ standard library; only `json5` and `websockets` as dependencies, plus `cryptography` used only by the `static-site` adapter for password-protected sites (imported lazily).
- Every user-visible string goes through the i18n tables (`panel/i18n.js`, `server/i18n.py`) in English and Spanish.

## Working Rules

- Work on one feature at a time; stay inside its spec (`docs/specs/<id>.md`).
- Do not mark a feature complete just because code was added.
- Do not silently change verification rules during implementation.
- Update durable repo artifacts instead of relying on chat summaries.

## Definition Of Done

- Target behaviour implemented.
- Verification in the spec actually ran; evidence recorded in `feature_list.json`.
- `./init.sh` still passes.
- Docs updated when behaviour, config or commands changed (README, guides in both languages).

## End Of Session

1. Update `PROGRESS.md` and `feature_list.json`.
2. Record unresolved risks or blockers.
3. Leave the repo so the next session can run `./init.sh` immediately.
