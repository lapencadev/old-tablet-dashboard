# Design

The panel is read from two metres away, glanced at for two seconds, and lives next to a kitchen or a desk all day. It should feel like a calm printed planner, not like a control room.

Source of truth: the screenshots in `docs/img/` (generated from `python tools/panel.py demo`). The original personal panel the design comes from is private.

## Principles

1. **One screen, no scrolling.** If content does not fit, lists are trimmed first ("+3 more · see all"), then text shrinks (fit levels 0-7). Photos keep a minimum height.
2. **What matters now is louder.** The current meal is highlighted; past meals fade; tomorrow shows only lunch and dinner.
3. **Readable from afar.** Serif display type for day, clock and titles; light sans for content; no text under 11px.
4. **Touch only where it helps.** Tapping a meal shows its detail, a to-do ticks it, the week label opens the week picker, the clock reloads. No typing.
5. **Quiet at night.** From 23:00 to 07:00 (or by toggle) the panel goes dark and dim.

## Layout (landscape, ~1280×800 CSS px)

```
┌ header: weekday + date │ checklist chips │ weather │ mode │ clock ┐
├ alerts (only when any) ───────────────────────────────────────────┤
│ Today (meals)      │ This week (agenda, 2 columns) │ Tasks         │
│ Tomorrow (L + D)   │ Photo (fills the rest)        │ Shopping      │
│                    │                               │ Photo         │
└───────────────────────────────────────────────────────────────────┘
column ratio 1.05 : 1.45 : 0.8
```

## Tokens

CSS variables are not available on the target browser, so tokens are documented here and repeated literally in `panel/styles.css`.

| Token | Day | Night | Use |
|---|---|---|---|
| `bg` | `#faf8f4` | `#0d110b` | page |
| `surface` | `#ffffff` | `#141a11` | cards |
| `header` | `#1a2416` | `#080a07` | top bar |
| `ink` | `#1e1e18` | `#8f9c84` | main text |
| `ink-soft` | `#4a4a40` | `#6c7862` | secondary text |
| `muted` | `#8a8a7a` | `#5f6b55` | labels, counts |
| `accent` | `#4a5c3e` | `#7f8c74` | highlights, buttons |
| `accent-soft` | `#e8ede4` | `#1d2419` | dividers, selected rows |
| `title` | `#2d3d26` | `#7f8c74` | card titles |
| `warn-bg` / `warn-ink` | `#fdf5e0` / `#5a4a10` | `#1f1c10` / `#9a8a55` | alerts, due dates |
| `danger-bg` / `danger-ink` | `#fdf0ec` / `#a03020` | `#241411` / `#a8665a` | overdue |
| `person-2` | `#e0f2fe` / `#0369a1` | `#13283a` / `#6f9fbf` | tag of the second person |
| `radius-card` | 14px | | |
| `font-display` | Georgia, serif | | weekday, clock, titles |
| `font-body` | Roboto, Helvetica Neue, Arial, sans-serif · weight 300 | | everything else |

## Components

- **Card**: white surface, radius 14, padding 13×18, soft shadow.
- **Meal row**: label column (uppercase, 12px, muted) + main dish (16px) + secondary person's dish on its own line with a tag + chevron. States: past (40% opacity, one line), now (tinted background, 18px, medium weight).
- **Agenda block**: day label (uppercase) + up to N events (`HH:MM` or "All day") + calendar chip for non-main calendars + "+N more".
- **To-do row**: 20px rounded checkbox + text + due chip ("today", "tomorrow", "overdue", `d/m`). Done: line-through, faded.
- **Modal**: centred card over a 55% dark scrim; header, scrollable body, "Close" footer. Tapping outside closes.
- **Alert banner**: warm background, text, optional action button on the right.
- **Checklist chip**: icon + label + sub-label; states due (amber), late (red border), done (faded with ✓).

## Accessibility

- Contrast ≥ 4.5:1 for content text in day mode.
- Touch targets ≥ 44px tall for alert buttons and modal rows.
- No information conveyed by colour only (states also change weight, opacity or icon).
