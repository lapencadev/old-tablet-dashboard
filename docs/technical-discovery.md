# Technical Discovery

## Runtime surfaces

| Surface | Tech | Constraints |
|---|---|---|
| Panel | One static HTML page, ES5 JavaScript, plain CSS | Chrome 40 / Android 4.4: no `let/const`, arrow functions, template literals, `fetch`, Promises, CSS variables, grid or flex `gap`; `-webkit-` prefixes for flexbox; plain HTTP on the LAN; must fit one screen without scrolling. |
| Server | Python 3.9+ standard library (`http.server`) + `json5` (menu adapter) + `websockets` (Telegram bot) | Runs as HA OS local app (Docker, Alpine) or on any computer. Holds the HA token so the tablet never sees it. |
| Home Assistant packages | YAML automations and scripts, deployed through the HA REST API | HA 2026: add-ons are "Apps"; local apps live in `/local_apps`; config editing via REST `/api/config/automation|script/config/<id>`. |
| Telegram bot | Home Assistant's `telegram_bot` integration (polling) | Group privacy must be disabled in BotFather so the bot sees plain messages. |
| Tooling | `tools/panel.py` (Python CLI) | Must work the same on macOS, Linux and Windows: no bash-only steps for users. `adb` for tablet helpers; OpenSSH (bundled with Windows 10+) for deploys. |

## Data flow

```
Menu source (file or URL) ──hourly sync──▶ server ──static files──▶ tablet browser
                                              │  ▲
             HA REST (/api/*) ◀──proxy + token┘  └── /panel/* (week choice, checklist, recipes)
                     │
Telegram group ◀──▶ HA telegram_bot ──events──▶ HA automations (shopping, tasks)
                                    └─websocket─▶ server bot (/menu, /help)
```

## Configuration

- `panel/config.js` (copied from `panel/config.example.js`): what the panel shows and which HA entities.
- `.env` (copied from `.env.example`): `HA_URL`, `HA_TOKEN`, `HA_SSH` for tools; `TELEGRAM_CHAT_ID`, `LANG`.
- HA app options (`ha-app/config.yaml`): `menu_url`, `menu_adapter`, `telegram_chat_id`, `lang`.

## Security

- The HA long-lived token never reaches the browser: the server adds it when proxying. Inside HA OS the app uses `SUPERVISOR_TOKEN`.
- The panel is LAN-only, no authentication (same trust level as a fridge note). Document it; do not expose port 8000 to the internet.
- Telegram handlers ignore messages from any chat other than the configured one.

## Testing

- Python: `unittest` (stdlib) for adapters, recipe matching, shopping-suggestion parsing, week resolution and server endpoints (against the mock HA).
- JavaScript: Node `vm` runs panel logic functions (week resolution, main dish) without a browser; `acorn --ecma5` rejects non-ES5 syntax.
- Visual: Playwright screenshots of the demo (optional, needs Chromium).
