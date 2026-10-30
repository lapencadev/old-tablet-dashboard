# Build Brief

## Problem

Households already have the data that organises the day — calendars, to-do lists, a meal plan, a shopping list — but it lives inside phone apps. Nobody opens five apps in the morning. A screen that is *always on* in the kitchen or on the desk removes that friction, and an old tablet sitting in a drawer is the cheapest such screen.

Old tablets are hard to use for this: they run browsers from ~2014 (no modern JavaScript, no CSS grid, no HTTPS to local hosts) and most dashboard tools no longer support them.

## Current Workaround / Existing System

This repo generalises a working personal setup (October 2026): a 2014 Android 4.4 tablet showing a custom panel served from a Raspberry Pi with Home Assistant OS, the author's own meal-planning website as menu source, and a Telegram bot for shopping and tasks. It was built in a few days with an AI coding agent. The original is private and full of personal data; this repo is the clean, reusable version.

Inspiration: Antonio Leiva's post about turning an old tablet into a desk dashboard (https://x.com/antonioleivag/status/2112870497260077245), itself inspired by people running dashboards on cheap digital photo frames. Only the idea comes from there; code and architecture are original.

## Target Users

- **Makers with Home Assistant** who have an old tablet or phone and want a family dashboard without buying hardware.
- **Their household**, who never touch configuration: they read the panel and write short messages in a Telegram group.
- **Developers learning agent-driven development**, who can read the harness (`AGENTS.md`, `feature_list.json`, specs) as a worked example.

## Goals

1. A single-screen panel that works on very old browsers (ES5, Chrome 40) and on modern ones.
2. Shows: today's meals, tomorrow's lunch and dinner, the week's agenda, tasks, shopping list, weather, alerts, a daily checklist and photos.
3. Runs without a personal computer switched on: the server runs inside Home Assistant OS as a local app.
4. Household members change things from Telegram (`+ milk`, `! call plumber @friday`, `/menu`), not from the panel.
5. Everything is configurable by editing one config file; no personal data in the code.
6. English and Spanish UI and bot messages.
7. Setup documented step by step for macOS and Windows, including the problems found on the way.

## Non-Goals

- A general dashboard builder (no drag-and-drop, no widget marketplace).
- Writing data from the panel beyond ticking items (no typing on the tablet).
- Replacing Home Assistant's own dashboards or the HA companion app.
- Remote access setup beyond documenting Tailscale.
- AI features inside the bot (listed as a future idea).
- Supporting Home Assistant installs other than HA OS for the app packaging (the server itself runs anywhere with Python 3.9+).

## MVP Slice

The thinnest slice that proves the idea end to end:

1. `python tools/panel.py demo` starts a mock Home Assistant and the server with example data, and the panel shows today's menu, agenda, tasks and shopping without scrolling.
2. The same panel, pointed at a real HA through the server proxy, shows real calendars and to-do lists.
3. The server installs as an HA OS local app with one command from macOS or Windows.
4. Telegram `+ item` adds to the shopping list and `/compra` (or `/shopping`) lists it.

Everything else (menu bot, recipe detail, adapters, checklist, alerts, photos, night mode) builds on that slice.

## Validation Plan

- Automated: `./init.sh` (or `python tools/panel.py check` on Windows) runs Python unit tests, JavaScript logic tests and an ES5 syntax check of the panel.
- Visual: Playwright screenshots of the demo at 1280×800 and 1280×672 (tablet with browser bars) must show no clipped card.
- Real device: the author's 2014 tablet keeps running the panel served from the repo version.

## Success Criteria

- A stranger with HA OS and an old tablet gets the panel running by following `docs/guide.md` (or `docs/es/guia.md`) without asking questions.
- No personal data in the repository (names, chat ids, IPs, emails, Tailscale names).
- The repo reads as a portfolio piece: clear README, screenshots, tests, and the agent harness visible.

## Notes

- Repository: <https://github.com/lapencadev/old-tablet-dashboard>.
- Documentation language: English for code, README and harness docs; the step-by-step guide also in Spanish (`docs/es/`).
