# Feature Implementation Spec: Optional work timer

## Source Feature

- `id`: work-timer · `area`: panel · `depends_on`: panel-photos, server-static-proxy · `source`: `feature_list.json`

## Goal

Let someone who does not log their hours anywhere see, at a glance, how long they have worked today and when they can leave, for **their own** working day, with one tap per action. Off unless configured.

## Non-Goals

- Payroll, overtime rules, exporting to HR tools. Typing on the tablet (corrections use buttons).

## Acceptance Scenarios

1. Given `WORK_TIMER: null` (default), the card is not shown and the photo keeps the space.
2. Given `WORK_TIMER: { HOURS: '8:00' }`, when ▶ is tapped, the card shows the time worked and "leave at" = now + what is left.
3. When ❚❚ is tapped, a break starts; the leave time moves forward while it lasts; ▶ resumes.
4. "End" (in the card header while the day runs) needs a second tap within 4 s; then the card shows the difference with the day.
5. Tapping the card opens the week (in, out, break, worked, ±) with the total against `HOURS × DAYS`; arrows move between weeks.
6. Tapping a day opens the correction view: −1 h / −5 / +5 / +1 h per time, add the next valid step, remove the last; times out of order cannot be saved.
7. A past day left open counts as a full day and is marked "?".
8. A second screen sees the same state; a wrong step (e.g. pause twice) is refused with 409 and the panel reloads the state.

## Technical Approach

- `panel/core.js`: `workMinutes`, `hm`, `workSummary` (pure, unit-tested).
- `panel/app.js`: card, week modal, correction modal; server time offset from `now` in the responses.
- `server/state.py`: `work.json` `{day: [{a, ts}]}`, transitions start → pause/stop, pause → resume/stop, stop → start; `set_work_day` validates corrections; 400 days kept.
- `server/serve.py`: `GET /panel/work?from&to`, `POST /panel/work {day, a}` or `{day, events}`.

## Verification Plan

- `node --test tests/js/core.test.js`, `python -m unittest tests.test_server`, `python tools/panel.py e2e`.
