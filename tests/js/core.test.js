'use strict';
// Panel logic (panel/core.js + panel/i18n.js) loaded in a sandbox, as the old browser would.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = {};
vm.createContext(ctx);
for (const f of ['panel/i18n.js', 'panel/core.js', 'panel/data/menu.example.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const C = ctx.PanelCore;
const MENU = ctx.MENU;
const d = (s) => new Date(s);

test('planFor: inside the first and the repeated second week', () => {
  let p = C.planFor(MENU, d('2026-11-04T12:00:00'));
  assert.strictEqual(p.key, 'autumn1'); assert.strictEqual(p.dayIndex, 2); assert.strictEqual(p.exact, true);
  p = C.planFor(MENU, d('2026-11-15T12:00:00'));
  assert.strictEqual(p.dayIndex, 6); assert.strictEqual(p.exact, true);
});

test('planFor: before and after the plan', () => {
  let p = C.planFor(MENU, d('2026-10-29T12:00:00'));
  assert.strictEqual(p.key, 'autumn1'); assert.strictEqual(p.exact, false); assert.strictEqual(p.dayIndex, 3);
  p = C.planFor(MENU, d('2026-11-20T12:00:00'));
  assert.strictEqual(p.exact, false); assert.strictEqual(p.dayIndex, 4);
});

test('planFor: a new week appears on its first day, not before', () => {
  const m = JSON.parse(JSON.stringify(MENU));
  m.weeks.next = Object.assign({}, m.weeks.autumn1, { start: '2026-11-16', repeat: 1, title: 'Next' });
  assert.strictEqual(C.planFor(m, d('2026-11-15T23:00:00')).key, 'autumn1');
  assert.strictEqual(C.planFor(m, d('2026-11-16T08:00:00')).key, 'next');
  const late = Object.assign({}, m); late.weeks = { a: m.weeks.autumn1, b: Object.assign({}, m.weeks.next, { start: '2026-12-07' }) };
  assert.strictEqual(C.planFor(late, d('2026-11-25T08:00:00')).key, 'a'); // gap: keep the last started
});

test('planFor: manual choice wins', () => {
  const m = JSON.parse(JSON.stringify(MENU));
  m.weeks.other = Object.assign({}, m.weeks.autumn1, { start: '2027-01-04' });
  const p = C.planFor(m, d('2026-11-04T12:00:00'), 'other');
  assert.strictEqual(p.key, 'other'); assert.strictEqual(p.manual, true); assert.strictEqual(p.dayIndex, 2);
});

test('currentMeal follows the until hours', () => {
  const ids = (t) => MENU.meals[C.currentMeal(MENU.meals, d('2026-11-04T' + t))].id;
  assert.strictEqual(ids('08:00:00'), 'breakfast');
  assert.strictEqual(ids('12:30:00'), 'lunch');
  assert.strictEqual(ids('23:59:00'), 'dinner');
});

test('mainDish: strong text, several strongs, or text before details', () => {
  assert.strictEqual(C.mainDish('Salad • <strong>Turkey curry</strong> with rice'), 'Turkey curry');
  assert.strictEqual(C.mainDish('<strong>a</strong> and <strong>b</strong> and <strong>a</strong>'), 'A + b');
  assert.strictEqual(C.mainDish('yogurt with walnuts (30g) — see recipe book'), 'Yogurt with walnuts');
});

test('dueLabel and checklistState', () => {
  const tr = C.translator(ctx.I18N, 'en'), now = d('2026-11-04T10:00:00');
  assert.strictEqual(C.dueLabel('2026-11-03', now, tr), 'overdue');
  assert.strictEqual(C.dueLabel('2026-11-04', now, tr), 'today');
  assert.strictEqual(C.dueLabel('2026-11-05', now, tr), 'tomorrow');
  assert.strictEqual(C.dueLabel('2026-11-20', now, tr), '20/11');
  const item = { from: 7, to: 11 };
  assert.strictEqual(C.checklistState(item, false, d('2026-11-04T06:00:00')), '');
  assert.strictEqual(C.checklistState(item, false, now), 'due');
  assert.strictEqual(C.checklistState(item, false, d('2026-11-04T12:00:00')), 'late');
  assert.strictEqual(C.checklistState(item, true, now), 'done');
});

test('isNight wraps around midnight', () => {
  assert.strictEqual(C.isNight('auto', d('2026-11-04T23:30:00'), 23, 7), true);
  assert.strictEqual(C.isNight('auto', d('2026-11-04T06:59:00'), 23, 7), true);
  assert.strictEqual(C.isNight('auto', d('2026-11-04T12:00:00'), 23, 7), false);
  assert.strictEqual(C.isNight('night', d('2026-11-04T12:00:00'), 23, 7), true);
  assert.strictEqual(C.isNight('day', d('2026-11-04T23:30:00'), 23, 7), false);
});

test('i18n: every English key exists in every language, with the same placeholders', () => {
  const en = ctx.I18N.en;
  for (const lang of Object.keys(ctx.I18N)) {
    for (const k of Object.keys(en)) {
      assert.ok(k in ctx.I18N[lang], lang + ' is missing ' + k);
      if (typeof en[k] === 'string') {
        const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
        assert.strictEqual(ph(ctx.I18N[lang][k]), ph(en[k]), lang + '.' + k + ' placeholders');
      }
    }
  }
  const tr = C.translator(ctx.I18N, 'es');
  assert.strictEqual(tr('moreSeeAll', { n: 3 }), '+3 más · ver todo');
  assert.strictEqual(tr('dateLine', { day: 4, month: 'noviembre', year: 2026 }), '4 de noviembre · 2026');
});
