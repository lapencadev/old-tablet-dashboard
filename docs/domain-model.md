# Domain Model

## Entities

### Menu (`panel/data/menu.js` → `var MENU = {...}`)

```
Menu
├── people[]        { id, label }                 first = default person
├── meals[]         { id, label, until, tomorrow } until = hour when the meal is over (0-24)
├── weeks{key}      Week
└── shopping{key}   { category: [product, …] }    key = same key as the week
Week
├── title           "Week Q · 2-15 Nov"
├── start           "YYYY-MM-DD" (a Monday)
├── repeat          1 | 2 | …   (number of consecutive weeks the plan covers)
└── days[7]         Day (Monday first)
Day
└── meals{mealId}   { personId: dishHtml }
```

Rules:
- A week without `start` can still be chosen by hand but never matches a date.
- A day may omit a meal; the panel simply skips it.
- A dish for a secondary person is shown only if its main dish differs from the default person's.
- The main dish is the text inside `<strong>` (joined with " + " if several); otherwise the text before the first `(`, ` — `, ` · `.

### Week resolution (date → week)

1. If a **week choice** is stored, use it (day = weekday of the date).
2. Else the week whose `[start, start + 7·repeat)` contains the date (day = days since start mod 7).
3. Else the latest week that already started; if none started, the earliest one. Marked as *inexact*.

### Recipe (`panel/data/recipes.json`)

`{ title, subtitle?, badges[]?, ingredients[], steps[], tip? }`. A dish matches a recipe when word overlap (accents, plurals and stop-words ignored) scores ≥ 0.55; best score wins.

### Checklist item (config)

`{ id, icon, label, sub?, from, to }` (hours). States per day: *pending* → *due* (within window) → *late* (after window); *done* when ticked. Ticks are stored per date on the server: `{ "YYYY-MM-DD": { id: true } }`.

### Alert (config)

- Toggle alert: `{ entity: "input_boolean.*", text, button? }` — shown while the entity is `on`; the button turns it off.
- Date alert: `{ entity: "input_datetime.*", text, daysBefore }` — shown from `daysBefore` days before the date; highlighted on the day and after.

### To-do item (Home Assistant)

`todo.get_items` → `{ uid, summary, due?, status }`. Tapping on the panel calls `todo.update_item` with `status: completed`.

### Shopping suggestion session (Telegram)

One per chat: list of `(category, product)` + selected indexes. Created by `/menu`, edited by button callbacks, closed by *Add* or *Close*. Products already on the shopping list are not duplicated (HA script checks).

## Lifecycle: menu data

1. Owner edits the menu (locally or in the source app).
2. Server syncs the source every hour (adapter converts) → `panel/data/menu.js`.
3. Panel reloads data every 30 minutes and re-renders every minute.
4. `/menu` reads the same file at command time.
