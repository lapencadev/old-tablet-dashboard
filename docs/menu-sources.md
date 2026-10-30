# Menu sources

The panel always shows `panel/data/menu.js`, in the generic format described in [domain-model.md](domain-model.md). There are three ways to get that file:

| Way | When it suits you | Settings |
|---|---|---|
| 1. Write it by hand | You plan the week in a notes app or on paper and copy it once a week | none: edit `panel/data/menu.js` and run `deploy-app` |
| 2. `generic` URL | You already generate a file in the generic format somewhere (a script, a spreadsheet export) | `menu_url` = address of that file; `recipes_url` = address of a `recipes.json` (optional) |
| 3. `static-site` | Your menus live on your own small website made of static files, like the author's | `menu_url` = address of the site; `menu_people` = names of the people; `menu_password` if part of the site is private |

With 2 and 3 the server downloads the source **every hour**. If the download fails or the result is not valid, it keeps the previous menu and writes the reason in the app's **Log** tab.

## The `static-site` format

This is the format of the author's personal meal-planning website. It is described here so you can publish your own site the same way, or use it as a model for a new adapter (`server/adapters/static_site.py`). The test files in `tests/fixtures/static_site/` are complete, small examples.

The site publishes three files:

| File | What it contains |
|---|---|
| `js/data/weeks.data.js` | The weekly plans: `const WEEKS_DATA = { … }` |
| `js/data/shop.data.js` | The shopping list of each week: `const SHOP_LISTS = { … }` (optional) |
| `js/recipes-content.js` | The recipe book, as HTML cards (optional) |

### `WEEKS_DATA`

```js
const WEEKS_DATA = {
  wB: {                                   // week key (any short id)
    title: 'Week B · 2-15 noviembre 2026', // the dates in the title are used when there is no `start`
    start: '2026-11-02',                  // optional: the Monday the week starts
    weeks: 2,                             // optional: the same plan repeats for 2 weeks
    days: [                               // exactly 7 days, Monday first
      { slots: [
        { time: 'Comida · 14h', r: 'Salad • <strong>Turkey curry</strong> — see recipe book', j: 'Soup • <strong>Turkey curry</strong> with rice' },
        { time: 'Cena', r: '<strong>Ham omelette</strong>' }
      ] },
      …
    ]
  }
};
```

- `r` is what the first person eats and `j` (optional) what the second person eats. Their names on the panel come from `menu_people` (for example `Ana, Javi`).
- The meal is the text of `time` before `·` or `—`. These names are understood: `Café` (until 9:00), `Desayuno` and `Media mañana` (12:00), `Comida` (16:00), `Merienda` (19:00), `Cena` (24:00). Any other name is treated as the last meal of the day. `Comida` and `Cena` also appear in "Tomorrow".
- Put the main dish in `<strong>`: that is what the panel shows. The rest appears when you tap the meal.
- A title date can cross months (`28 septiembre – 4 octubre 2026`); month names are in Spanish. If your site is in another language, use `start`.
- A week whose `days` are not exactly seven is skipped.

### `SHOP_LISTS`

```js
const SHOP_LISTS = {
  wB: {                                        // same key as the week
    'Ya en casa / comprobar': [ { id: 'h1', label: 'Eggs (~28)' } ],   // categories starting like this are not suggested
    'Meat and fish': [
      { id: 'p1', label: 'Turkey breast (~380g, Monday curry)' },
      { id: 'p2', label: 'Lettuce (1), tomatoes (1kg), garlic' }        // several products in one line: split by commas
    ]
  }
};
```

`/menu` turns each line into one or more buttons: everything after `(`, `—` or `:` is dropped, and a line with commas becomes several products. Names that contain "and" / "y" (*crema de calabaza y zanahoria*) stay whole.

### Recipe cards (`recipes-content.js`)

Each recipe is an HTML block like this one. Only the classes matter; the rest of the page can look however you like:

```html
<div class="card" data-alias="Turkey curry with broccoli|Curry de pavo">
  <span class="badge">15 min</span><span class="badge">batch</span>
  <div class="ctitle">Quick turkey curry</div>
  <div class="csub">Creamy without cream.</div>
  <ul class="ing"><li>200g turkey</li><li>60ml evaporated milk</li></ul>
  <ol class="steps"><li>Fry the onion.</li><li>Simmer 10 minutes.</li></ol>
  <div class="tip">Keeps three days in the fridge.</div>
</div>
```

`data-alias` (optional, separated by `|`) lists other names of the same recipe, for example when several cards were merged into one. When you tap a meal, the panel looks for the recipe whose title, or one of its aliases, best matches the main dish.

### Sites with a private part

If part of the site is protected with a password, the plan and the shopping list are not published as loose files: they travel inside **`private.enc.json`**, and the recipe book can stay public.

```json
{ "v": 1, "iterations": 600000, "salt": "<base64>", "iv": "<base64>", "data": "<base64>" }
```

- Key: PBKDF2-HMAC-SHA256 of the password with `salt` and `iterations`, 32 bytes.
- `data`: AES-256-GCM with that key and `iv` (the 16-byte tag at the end, as the browser's Web Crypto writes it).
- Decrypted: a JSON list of HTML blocks. The `<script>` tags inside them that define `WEEKS_DATA` and `SHOP_LISTS` are the files above.

Put the same password in the app option **`menu_password`** (Home Assistant stores it hidden). If the password is wrong, the Log says so and the panel keeps the last menu it downloaded. If you change the password on your site, change it here too.
