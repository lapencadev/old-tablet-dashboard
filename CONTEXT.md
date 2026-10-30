# Context — Glossary

Domain language for this repository. Use these terms in code, docs and commits.

| Term | Meaning |
|---|---|
| **Panel** | The single web page shown full-screen on the old tablet. One screen, no scrolling. |
| **Tablet** | Any old device with a browser that shows the panel (tested target: Android 4.4, Chrome 40). Also works on a digital photo frame or a spare phone. |
| **Server** | The small Python process that serves the panel, proxies Home Assistant and keeps shared state. Runs on the computer that runs Home Assistant (as an HA OS app) or on any computer for development. |
| **HA** | Home Assistant, the home automation hub. The panel reads calendars, to-do lists, weather and helpers from it. |
| **HA app** | A Home Assistant OS add-on (called "Apps" since HA 2026). This repo ships the server as a *local* HA app. |
| **Menu** | The meal plan the panel shows. A menu has one or more **weeks**. |
| **Week** | Seven **days** of meals with a start date (Monday). A week can repeat (`repeat: 2` = the same plan for two weeks in a row). |
| **Meal** | One slot of a day (breakfast, lunch, dinner…), defined once in the menu with a label and the hour when it ends. |
| **Dish** | What a **person** eats in a meal. HTML allowed; the part in `<strong>` is the **main dish** shown on the panel. |
| **Person** | Someone who follows the menu. The first person is the default; others are shown with a small tag only when their dish differs. |
| **Menu source** | Where the menu comes from: a local file (`panel/data/menu.js`) or a URL synced every hour through an **adapter**. |
| **Adapter** | Code that converts another app's meal-plan format into this repo's menu format (the repo ships `static-site`, see docs/menu-sources.md). |
| **Recipe book** | Optional list of recipes. When a dish matches a recipe title, the meal detail shows the recipe. |
| **Shopping suggestions** | Per-week list of products the menu needs, grouped by category. The Telegram `/menu` command offers them as checkboxes. |
| **Shopping list** / **Task list** | Home Assistant to-do lists (`todo.*`) shown on the panel and edited from Telegram. |
| **Checklist** | Small daily items with a time window (vitamins, plants…). Ticked state is stored per day on the server and shared by every screen. |
| **Alert** | A banner shown when an HA helper is on (e.g. laundry waiting) or a date is close (e.g. a vet appointment). |
| **Week choice** | The week picked by hand on the panel. Stored on the server so the tablet and `/menu` agree. Empty = automatic by date. |
| **Fit** | The panel's layout loop: it trims long lists first and then shrinks text until everything fits the screen. |
| **Group chat** | The Telegram group where the household talks to the HA bot. |
