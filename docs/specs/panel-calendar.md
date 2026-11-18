# Feature Implementation Spec: Big calendar (week / month)

## Source Feature

- `id`: panel-calendar · `area`: panel · `depends_on`: panel-agenda · `source`: `feature_list.json`

## Goal

The agenda shows only seven days. Tapping it opens a calendar to look further ahead or back, in week or month view, without leaving the panel.

## Non-Goals

- Creating or editing events (the panel does not type). Time grid by hour.

## Acceptance Scenarios

1. Tapping the agenda opens the current week (Monday to Sunday) with all-day events as coloured bars and timed events with their time.
2. ‹ › move one week (or one month); Today goes back to the current week/month.
3. Month shows whole weeks; days outside the month are faded; up to 4 events per day, then "+N more".
4. Tapping a day in the month opens its week.
5. One colour per calendar, legend at the bottom when there is more than one calendar.
6. Offline → the usual "no connection" message inside the modal.

## Technical Approach

- `panel/app.js`: `fetchRange(first, last)` asks every calendar for the range (the proxy already allows `/api/calendars/calendar.*`), groups events by day (multi-day events on each day); `openCal(view, anchor)` renders a table; a token ignores late answers after navigating.
- `panel/styles.css`: `.md-cal` modal, `.cv-*` classes, night mode and a narrow-screen rule.

## Verification Plan

- `python tools/panel.py e2e` (scenario `panel-calendar`).
