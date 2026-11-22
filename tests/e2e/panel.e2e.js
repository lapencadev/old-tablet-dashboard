// Browser scenarios against the demo stack. Run with: python tools/panel.py e2e
// Env: BASE (normal demo), BASE_LONG (demo with many shopping items), HA (mock HA url), SHOTS (dir for screenshots)
'use strict';
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.BASE, BASE_LONG = process.env.BASE_LONG, HA = process.env.HA, SHOTS = process.env.SHOTS;
const NOW = '2026-11-04T12:30:00';
const results = [];

async function page(browser, opts) {
  opts = opts || {};
  const p = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.addInitScript((o) => {
    window.__NOW__ = o.now;
    try { localStorage.removeItem('panel-mode'); } catch (e) {}
    if (o.config) {
      Object.defineProperty(window, 'PANEL_CONFIG', {
        configurable: true, get() { return this.__cfg; },
        set(v) { Object.assign(v, o.config); this.__cfg = v; }
      });
    }
  }, { now: opts.now || NOW, config: opts.config || null });
  await p.goto((opts.base || BASE) + '/');
  await p.waitForTimeout(1200);
  return p;
}
const haLog = async () => (await fetch(HA + '/mock/log')).json();

async function scenario(name, fn) {
  try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); }
}

(async () => {
  const browser = await chromium.launch();

  await scenario('panel-today-meals: lunch highlighted at 12:30, earlier meals faded', async () => {
    const p = await page(browser);
    const rows = await p.$$eval('#today .ms', (els) => els.map((e) => [e.className, e.querySelector('.ms-time').textContent]));
    assert.deepStrictEqual(rows.map((r) => r[1]), ['Breakfast', 'Mid-morning', 'Lunch', 'Afternoon', 'Dinner']);
    assert.ok(/now/.test(rows[2][0]) && /past/.test(rows[0][0]) && !/past|now/.test(rows[4][0]));
    assert.strictEqual(await p.textContent('#weekday'), 'Wednesday');
    assert.deepStrictEqual(p.errors, []);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/panel-en.png' });
  });

  await scenario('panel-tomorrow-meals: on Sunday shows Monday of the next week', async () => {
    const p = await page(browser, { now: '2026-11-08T10:00:00' });
    const t = await p.textContent('#tomorrow');
    assert.ok(t.includes('Lunch') && t.includes('Turkey curry') && t.includes('Dinner'), t);
    assert.ok(!t.includes('Breakfast'));
  });

  await scenario('panel-meal-detail + recipe-lookup: modal with both people and the recipe', async () => {
    const p = await page(browser);
    await p.click('#today .ms.now');
    await p.waitForTimeout(600);
    const lines = await p.$$eval('#modal .md-line', (els) => els.map((e) => e.textContent));
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('Alex') && lines[1].includes('Sam'));
    assert.ok(!lines.join(' ').includes('see recipe book'));
    assert.strictEqual(await p.textContent('#modal .md-rt'), 'Wholewheat pasta with beef and courgette ragù');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/meal-detail.png' });
    await p.mouse.click(20, 20);
    assert.strictEqual(await p.getAttribute('#modal', 'class'), 'modal');
  });

  await scenario('panel-i18n: Spanish config translates every fixed text', async () => {
    const p = await page(browser, { config: { LANG: 'es' } });
    assert.strictEqual(await p.textContent('#hToday'), 'Hoy se come');
    assert.strictEqual(await p.textContent('#weekday'), 'miércoles');
    assert.ok((await p.textContent('#daymonth')).startsWith('4 de noviembre'));
    assert.ok((await p.textContent('#agenda')).includes('Mañana'));
    assert.ok((await p.textContent('#weather')).includes('Algo nublado'));
  });

  await scenario('demo --lang es: Spanish menu, recipes and texts', async () => {
    const p = await page(browser, { base: process.env.BASE_ES });
    assert.strictEqual(await p.textContent('#hToday'), 'Hoy se come');
    assert.ok((await p.textContent('#today')).includes('Boloñesa de ternera y calabacín'));
    assert.ok((await p.textContent('#alerts')).includes('Veterinario en 3 días'));
    await p.click('#today .ms.now');
    await p.waitForTimeout(600);
    assert.strictEqual(await p.textContent('#modal .md-rt'), 'Macarrones integrales con boloñesa de ternera y calabacín');
    await p.mouse.click(20, 20);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/panel-es.png' });
  });

  await scenario('panel-agenda: all-day, timed and second-calendar chip', async () => {
    const p = await page(browser);
    const a = await p.textContent('#agenda');
    assert.ok(a.includes('All day') && a.includes('17:30') && a.includes('Swimming lesson'));
    assert.ok((await p.$$('#agenda .ag-cal')).length >= 1);
    assert.strictEqual((await p.$$('#agenda .ag-block')).length, 7);
  });

  await scenario('panel-calendar: tap the agenda → week/month calendar with ‹ › and Today', async () => {
    const p = await page(browser);
    await p.click('#agenda'); await p.waitForTimeout(800);
    assert.strictEqual(await p.getAttribute('#modal', 'data-mode'), 'cal');
    assert.strictEqual(await p.locator('.cv-week td').count(), 7);
    assert.ok((await p.textContent('.cv-week')).includes('Swimming lesson'));
    assert.ok((await p.$$('.cv-legend span')).length >= 2, 'one colour per calendar');
    const week = await p.textContent('.cv-title');
    await p.click('[data-cal=next]'); await p.waitForTimeout(600);
    assert.notStrictEqual(await p.textContent('.cv-title'), week);
    await p.click('[data-cal=today]'); await p.waitForTimeout(600);
    assert.strictEqual(await p.textContent('.cv-title'), week);
    await p.click('[data-cal=month]'); await p.waitForTimeout(800);
    const cells = await p.locator('.cv-month td[data-day]').count();
    assert.ok(cells === 35 || cells === 42 || cells === 28, 'whole weeks: ' + cells);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/calendar-month.png' });
    await p.click('[data-cal=prev]'); await p.waitForTimeout(600);
    await p.click('.cv-month td[data-day] >> nth=10'); await p.waitForTimeout(600);
    assert.strictEqual(await p.locator('.cv-seg .on').textContent(), 'Week', 'a day opens its week');
    await p.click('.md-close'); await p.waitForTimeout(200);
    assert.ok(!(await p.getAttribute('#modal', 'class')).includes('on'));
    assert.deepStrictEqual(p.errors, []);
  });

  await scenario('panel-todo-lists: tapping an item completes it in HA', async () => {
    const p = await page(browser);
    assert.ok((await p.textContent('#tasks')).includes('overdue'));
    await p.click('#shopping .td >> text=Milk');
    await p.waitForTimeout(500);
    const call = (await haLog()).find((r) => r.path.indexOf('/api/services/todo/update_item') === 0);
    assert.ok(call && call.body.status === 'completed' && call.body.entity_id === 'todo.shopping', JSON.stringify(call));
    await p.waitForTimeout(1800);
    assert.ok(!(await p.textContent('#shopping')).includes('Milk'));
    // an overdue task goes away too (HA refuses ?return_response on update_item)
    const overdue = p.locator('#tasks .td', { hasText: 'overdue' }).first();
    const name = (await overdue.textContent()).replace('overdue', '').trim();
    await overdue.click();
    await p.waitForTimeout(2300);
    assert.ok(!(await p.textContent('#tasks')).includes(name), name + ' still listed');
    assert.ok(!(await haLog()).some((r) => r.path.indexOf('update_item?return_response') >= 0));
  });

  await scenario('panel-weather: temperature, condition and range', async () => {
    const p = await page(browser);
    const w = await p.textContent('#weather');
    assert.ok(w.includes('17°') && w.includes('Partly cloudy') && w.includes('max 21°') && w.includes('1.2 mm'), w);
  });

  await scenario('panel-fit: 22 shopping items fit 1280x672 with "+N more"', async () => {
    const p = await page(browser, { base: BASE_LONG, viewport: { width: 1280, height: 672 } });
    const r = await p.evaluate(() => {
      const h = window.innerHeight;
      return ['colMeals', 'colMid', 'colSide'].map((id) => {
        let last = document.getElementById(id).lastElementChild;
        while (last && last.style.display === 'none') last = last.previousElementSibling;
        return last.getBoundingClientRect().bottom <= h;
      });
    });
    assert.deepStrictEqual(r, [true, true, true]);
    const more = await p.textContent('#shopping .td-more');
    assert.ok(/\+\d+ more · see all/.test(more), more);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/long-lists-672.png' });
    await p.click('#shopping .td-more');
    await p.waitForTimeout(300);
    assert.ok((await p.$$('#modal .td')).length >= 20);
  });

  await scenario('panel-alerts: toggle banner button turns the helper off; date banner shown', async () => {
    const p = await page(browser);
    const a = await p.textContent('#alerts');
    assert.ok(a.includes('laundry') && a.includes('Vet visit in 3 days'), a);
    await p.click('#alerts .al-btn');
    await p.waitForTimeout(400);
    assert.ok((await haLog()).some((r) => r.path === '/api/services/input_boolean/turn_off' && r.body.entity_id === 'input_boolean.laundry_waiting'));
  });

  await scenario('panel-checklist: tap ticks and the server stores it for the date', async () => {
    const p = await page(browser);
    await p.click('#checklist .ck >> nth=1');
    await p.waitForTimeout(400);
    const st = await (await fetch(BASE + '/panel/checklist?date=2026-11-04')).json();
    assert.deepStrictEqual(st.done, { plants: true });
    assert.ok(/ck-done/.test(await p.getAttribute('#checklist .ck >> nth=1', 'class')));
    await fetch(BASE + '/panel/checklist', { method: 'POST', body: JSON.stringify({ date: '2026-11-04', id: 'plants', done: false }) });
  });

  await scenario('panel-photos: example photo shown; no photos → cards hidden', async () => {
    let p = await page(browser);
    assert.ok((await p.getAttribute('#photoImg', 'style')).includes('example-photo.svg'));
    assert.strictEqual(await p.$eval('#photo2', (e) => e.style.display), 'none');
    p = await page(browser, { config: { PHOTOS: [], PHOTOS_SIDE: [] } });
    assert.strictEqual(await p.$eval('#photo', (e) => e.style.display), 'none');
  });

  await scenario('panel-night-mode: dark at 23:30, button cycles modes', async () => {
    const p = await page(browser, { now: '2026-11-04T23:30:00' });
    assert.strictEqual(await p.getAttribute('html', 'class'), 'night');
    assert.strictEqual(await p.textContent('#mode'), 'Auto · night');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/night.png' });
    await p.click('#mode');
    assert.strictEqual(await p.textContent('#mode'), 'Day');
    assert.strictEqual(await p.getAttribute('html', 'class'), '');
  });

  await scenario('work-timer: start, break, resume and end the day (second tap), week in a modal', async () => {
    const p = await page(browser, { config: { WORK_TIMER: { HOURS: '8:00', DAYS: [1, 2, 3, 4, 5] } } });
    const cls = async () => p.getAttribute('#work', 'class');
    assert.ok((await cls()).includes('wk-idle'), await cls());
    assert.strictEqual(await p.locator('#work .wb').count(), 5, 'one bar per workday');
    assert.ok(/of \d+:\d\d/.test(await p.textContent('#work .wk-sum')), await p.textContent('#work .wk-sum'));
    await p.click('#work [data-act=start]'); await p.waitForTimeout(500);
    assert.ok((await cls()).includes('wk-work'));
    await p.click('#work [data-act=pause]'); await p.waitForTimeout(500);
    assert.ok((await cls()).includes('wk-break'));
    await p.click('#work [data-act=resume]'); await p.waitForTimeout(500);
    await p.click('#work [data-act=stop]'); await p.waitForTimeout(300);
    assert.ok((await cls()).includes('wk-work'), 'one tap does not end the day');
    await p.click('#work [data-act=stop]'); await p.waitForTimeout(500);
    assert.ok((await cls()).includes('wk-done'), await cls());
    await p.click('#work .wk-hd'); await p.waitForTimeout(700);
    assert.ok((await p.textContent('#modal')).includes('This week'));
    assert.strictEqual(await p.locator('#modal .wk-table tr').count(), 8);
    await p.click('#modal .wk-arrow >> nth=0'); await p.waitForTimeout(700);
    assert.ok((await p.textContent('#modal')).includes('Last week'));
    if (SHOTS) await p.screenshot({ path: SHOTS + '/work-week.png' });
    // correct today's start by hand: one hour earlier
    await p.click('#modal .wk-arrow >> nth=1'); await p.waitForTimeout(700);
    await p.click('#modal tr.wk-today'); await p.waitForTimeout(700);
    const t0 = await p.textContent('#modal .wd-t');
    await p.click('#modal [data-ed="0:-60"]');
    assert.notStrictEqual(await p.textContent('#modal .wd-t'), t0);
    await p.click('#modal [data-ed="0:-60"]'); await p.click('#modal [data-ed="0:60"]');
    await p.click('#modal [data-wd=save]'); await p.waitForTimeout(700);
    assert.strictEqual(await p.getAttribute('#modal', 'data-mode'), 'work');
    const log = await (await fetch(BASE + '/panel/work?from=2000-01-01&to=2100-01-01')).json();
    const day = Object.keys(log.days)[0];
    assert.ok(log.days[day][1].ts - log.days[day][0].ts >= 3600000 - 1000, 'start moved an hour back');
    assert.deepStrictEqual(p.errors, []);
  });

  await scenario('work-timer: off unless configured', async () => {
    const p = await page(browser, { config: { WORK_TIMER: null } });
    assert.ok(!(await p.isVisible('#work')));
    assert.ok(await p.isVisible('#photo'));
  });

  await scenario('panel-flow: on a phone the cards stack and the page scrolls, nothing overlaps', async () => {
    const p = await page(browser, { viewport: { width: 390, height: 844 } });
    assert.ok((await p.getAttribute('body', 'class')).indexOf('flow') >= 0);
    const m = await p.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      return { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
        meals: r('colMeals'), side: r('colSide'), mid: r('colMid') };
    });
    assert.ok(m.scrollW <= 390, 'no sideways scroll: ' + m.scrollW);
    assert.ok(m.scrollH > 844, 'page scrolls');
    assert.ok(m.side.top >= m.meals.bottom && m.mid.top >= m.side.bottom, 'columns stacked in order');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/phone.png', fullPage: true });
  });

  await scenario('week-picker: choose a week, it is shared through the server', async () => {
    const p = await page(browser);
    await p.click('#weekLabel');
    assert.ok((await p.textContent('#modal')).includes('Automatic (by date)'));
    await p.click('#modal .pk-item[data-key="autumn1"]');
    await p.waitForTimeout(300);
    assert.deepStrictEqual(await (await fetch(BASE + '/panel/week')).json(), { week: 'autumn1' });
    assert.ok(/manual/.test(await p.getAttribute('#weekLabel', 'class')));
    await p.click('#weekLabel');
    await p.click('#modal .pk-item[data-key=""]');
    await p.waitForTimeout(300);
    assert.deepStrictEqual(await (await fetch(BASE + '/panel/week')).json(), { week: null });
  });

  await browser.close();
  for (const r of results) console.log(r[0] + '  ' + r[1]);
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(failed ? failed + ' scenario(s) failed' : 'All ' + results.length + ' scenarios passed');
  process.exit(failed ? 1 : 0);
})();
