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
    if (SHOTS) await p.screenshot({ path: SHOTS + '/panel-es.png' });
  });

  await scenario('panel-agenda: all-day, timed and second-calendar chip', async () => {
    const p = await page(browser);
    const a = await p.textContent('#agenda');
    assert.ok(a.includes('All day') && a.includes('17:30') && a.includes('Swimming lesson'));
    assert.ok((await p.$$('#agenda .ag-cal')).length >= 1);
    assert.strictEqual((await p.$$('#agenda .ag-block')).length, 7);
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
