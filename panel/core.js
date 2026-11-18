/* Pure logic of the panel (no DOM), so it can be tested in Node.
   ES5 only: this runs on Chrome 40 / Android 4.4. */
var PanelCore = (function () {
  'use strict';

  var DAY_MS = 86400000;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* Which week and day of the menu apply to `date` (rules in docs/domain-model.md).
     Returns {key, week, dayIndex, exact, manual} or null when the menu has no weeks. */
  function planFor(menu, date, chosen) {
    var weeks = (menu && menu.weeks) || {};
    var dayIndex = (date.getDay() + 6) % 7; // Monday = 0
    if (chosen && weeks[chosen]) {
      return { key: chosen, week: weeks[chosen], dayIndex: dayIndex, exact: true, manual: true };
    }
    var target = startOfDay(date).getTime();
    var list = [], key, s, i;
    for (key in weeks) {
      if (!weeks.hasOwnProperty(key)) continue;
      s = parseDate(weeks[key].start);
      if (s) list.push({ key: key, start: s.getTime(), days: 7 * (weeks[key].repeat || 1) });
    }
    list.sort(function (a, b) { return a.start - b.start; });
    for (i = 0; i < list.length; i++) {
      var diff = Math.round((target - list[i].start) / DAY_MS);
      if (diff >= 0 && diff < list[i].days) {
        return { key: list[i].key, week: weeks[list[i].key], dayIndex: diff % 7, exact: true };
      }
    }
    if (!list.length) {
      for (key in weeks) if (weeks.hasOwnProperty(key)) return { key: key, week: weeks[key], dayIndex: dayIndex, exact: false };
      return null;
    }
    // No week covers the date: the latest one that already started (a new menu appears on its first day).
    var pick = list[0];
    for (i = 0; i < list.length; i++) if (list[i].start <= target) pick = list[i];
    return { key: pick.key, week: weeks[pick.key], dayIndex: dayIndex, exact: false };
  }

  /* Index (in menu.meals) of the meal that is happening now, by the `until` hours. */
  function currentMeal(meals, date) {
    var h = date.getHours() + date.getMinutes() / 60;
    for (var i = 0; i < meals.length; i++) if (h < meals[i].until) return i;
    return meals.length - 1;
  }

  function stripTags(h) { return (h || '').replace(/<[^>]+>/g, ''); }
  function trim(s) { return s.replace(/^\s+|\s+$/g, ''); }

  /* Main dish of a dish text: what is in <strong> (joined with ' + '), else the text before '(' / ' — ' / ' · ' / ' • '. */
  function mainDish(html) {
    var m = (html || '').match(/<strong>[\s\S]*?<\/strong>/g), names = [], i, t;
    if (m) {
      for (i = 0; i < m.length; i++) {
        t = trim(stripTags(m[i]));
        if (t && names.indexOf(t) === -1) names.push(t);
      }
      t = names.join(' + ');
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    t = trim(stripTags(html).split(/\s\(|\s—\s|\s•\s|\s·\s/)[0]);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* Due label of a to-do item: overdue / today / tomorrow / d/m */
  function dueLabel(due, now, tr) {
    var d = parseDate(due);
    if (!d) return '';
    var diff = Math.round((d.getTime() - startOfDay(now).getTime()) / DAY_MS);
    if (diff < 0) return tr('overdue');
    if (diff === 0) return tr('dueToday');
    if (diff === 1) return tr('dueTomorrow');
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  /* Checklist chip state: 'done' | 'due' | 'late' | '' */
  function checklistState(item, done, now) {
    if (done) return 'done';
    var h = now.getHours();
    if (h >= item.to) return 'late';
    if (h >= item.from) return 'due';
    return '';
  }

  function isNight(mode, now, from, to) {
    if (mode === 'night') return true;
    if (mode === 'day') return false;
    var h = now.getHours();
    return from > to ? (h >= from || h < to) : (h >= from && h < to);
  }

  /* ───────── Work timer ─────────
     A day is a list of events {a: 'start'|'pause'|'resume'|'stop', ts: ms}. */

  // '7:42' or 7.7 (hours) → minutes; anything else → null (timer off)
  function workMinutes(v) {
    if (typeof v === 'number' && v > 0 && v <= 24) return Math.round(v * 60);
    var m = /^\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(v == null ? '' : String(v));
    if (!m) return null;
    var min = (+m[1]) * 60 + (+(m[2] || 0));
    return min > 0 && min <= 24 * 60 ? min : null;
  }

  // 'h:mm' from milliseconds (negative counts as 0)
  function hm(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    return Math.floor(m / 60) + ':' + pad(m % 60);
  }

  /* Totals of one day. state: idle | work | break | done. exit = time to leave to reach
     targetMin (moves forward during a break). A past day left open (no stop) counts as a
     full day and is flagged with open. */
  function workSummary(events, nowMs, isToday, targetMin) {
    var target = targetMin * 60000, worked = 0, pause = 0, seg = null, brk = null;
    var r = { state: 'idle', first: events.length ? events[0].ts : null, since: null, out: null, open: false };
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.a === 'start' || e.a === 'resume') {
        if (brk !== null) { pause += e.ts - brk; brk = null; }
        seg = e.ts;
      } else if (e.a === 'pause') {
        if (seg !== null) { worked += e.ts - seg; seg = null; }
        brk = e.ts;
      } else if (e.a === 'stop') {
        if (seg !== null) { worked += e.ts - seg; seg = null; }
        if (brk !== null) { pause += e.ts - brk; brk = null; }
        r.out = e.ts;
      }
      r.since = e.ts;
    }
    if (!events.length) {
      r.worked = 0; r.pause = 0; r.exit = null;
      return r;
    }
    if (seg !== null) {
      if (isToday) { worked += nowMs - seg; r.state = 'work'; }
      else { r.open = true; r.out = seg + Math.max(0, target - worked); worked = Math.max(worked, target); r.state = 'done'; }
    } else if (brk !== null) {
      if (isToday) { pause += nowMs - brk; r.state = 'break'; }
      else { r.open = true; r.out = brk; r.state = 'done'; }
    } else {
      r.state = 'done';
    }
    r.worked = worked;
    r.pause = pause;
    r.exit = r.state === 'done' ? r.out : nowMs + Math.max(0, target - worked);
    return r;
  }

  /* Translation helper: tr('more', {n: 3}) */
  function translator(i18n, lang) {
    var table = i18n[lang] || i18n.en;
    return function (key, vars) {
      var s = table[key] !== undefined ? table[key] : i18n.en[key];
      if (typeof s !== 'string') return s;
      if (vars) for (var k in vars) if (vars.hasOwnProperty(k)) s = s.split('{' + k + '}').join(vars[k]);
      return s;
    };
  }

  return {
    DAY_MS: DAY_MS, pad: pad, startOfDay: startOfDay, parseDate: parseDate, dateKey: dateKey,
    planFor: planFor, currentMeal: currentMeal, mainDish: mainDish, stripTags: stripTags,
    dueLabel: dueLabel, checklistState: checklistState, isNight: isNight, translator: translator,
    workMinutes: workMinutes, hm: hm, workSummary: workSummary
  };
})();
