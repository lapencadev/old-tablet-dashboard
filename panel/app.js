/* old-tablet-dashboard · panel
   ES5 only (Chrome 40 / Android 4.4): no let/const, arrow functions, template literals, fetch or Promises.
   Logic without DOM lives in core.js. */
(function () {
  'use strict';

  var C = PanelCore;
  var CFG = window.PANEL_CONFIG || {};
  var MENU_DATA = window.MENU || { people: [], meals: [], weeks: {} };
  var T = C.translator(I18N, CFG.LANG || 'en');
  var DAY_MS = C.DAY_MS;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function now() { return window.__NOW__ ? new Date(window.__NOW__) : new Date(); }

  function xhr(method, url, body, done, headers) {
    var x = new XMLHttpRequest();
    x.open(method, url, true);
    x.setRequestHeader('Content-Type', 'application/json');
    if (headers) for (var h in headers) if (headers.hasOwnProperty(h)) x.setRequestHeader(h, headers[h]);
    x.timeout = 15000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var data = null;
      if (x.status >= 200 && x.status < 300) {
        try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
      }
      if (done) done(data, x.status);
    };
    x.send(body ? JSON.stringify(body) : null);
  }

  /* ───────── Static labels ───────── */
  function renderLabels() {
    $('hToday').innerHTML = esc(T('todayMeals'));
    $('hTomorrow').innerHTML = esc(T('tomorrow'));
    $('hTomorrowHint').innerHTML = esc(T('tomorrowHint'));
    $('hWeek').innerHTML = esc(T('thisWeek'));
    $('hTasks').innerHTML = esc(T('tasks'));
    $('hShopping').innerHTML = esc(T('shopping'));
    if (!CFG.TASKS) $('tasksCard').style.display = 'none';
    if (!CFG.SHOPPING) $('shoppingCard').style.display = 'none';
  }

  function renderClock(d) {
    $('clock').innerHTML = C.pad(d.getHours()) + ':' + C.pad(d.getMinutes());
    $('weekday').innerHTML = esc(T('weekdays')[d.getDay()]);
    $('daymonth').innerHTML = esc(T('dateLine', { day: d.getDate(), month: T('months')[d.getMonth()], year: d.getFullYear() }));
  }

  /* ───────── Meals ───────── */
  var CHOSEN = null;            // week picked by hand (shared through the server), null = by date
  var MEAL_ROWS = {};           // row id → {meal, dishes, when}
  var PEOPLE = MENU_DATA.people || [];
  var MEALS = MENU_DATA.meals || [];

  function personTag(p) {
    return '<span class="tag tag-p' + Math.min(PEOPLE.indexOf(p), 3) + '">' + esc(p.label.charAt(0).toUpperCase()) + '</span>';
  }

  function mealRow(id, meal, dishes, cls) {
    var main = PEOPLE.length ? dishes[PEOPLE[0].id] : null;
    var mainName = C.mainDish(main || '');
    var others = '';
    for (var i = 1; i < PEOPLE.length; i++) {
      var d = dishes[PEOPLE[i].id];
      if (d == null) continue;
      var name = C.mainDish(d);
      if (name && name !== mainName) others += '<span class="ms-other">' + personTag(PEOPLE[i]) + esc(name) + '</span>';
    }
    if (!mainName && !others) return '';
    return '<div class="ms ' + (cls || '') + '" data-row="' + id + '"><div class="ms-time">' + esc(meal.label) + '</div>' +
      '<div class="ms-dish">' + esc(mainName) + others + '</div><div class="ms-more">›</div></div>';
  }

  function dayOf(plan) { return plan && plan.week.days ? plan.week.days[plan.dayIndex] || {} : {}; }

  function renderToday(d) {
    var plan = C.planFor(MENU_DATA, d, CHOSEN);
    if (!plan) { $('today').innerHTML = '<div class="empty">' + esc(T('noMenu')) + '</div>'; $('weekLabel').innerHTML = ''; return; }
    $('weekLabel').innerHTML = esc(plan.week.title.split('·')[0].replace(/\s+$/, ''));
    $('weekLabel').className = plan.manual ? 'week manual' : 'week';
    var day = dayOf(plan), cur = C.currentMeal(MEALS, d), html = '';
    for (var i = 0; i < MEALS.length; i++) {
      var dishes = day[MEALS[i].id];
      if (!dishes) continue;
      MEAL_ROWS['t' + i] = { meal: MEALS[i], dishes: dishes, when: T('today') };
      html += mealRow('t' + i, MEALS[i], dishes, i < cur ? 'past' : (i === cur ? 'now' : ''));
    }
    $('today').innerHTML = html || '<div class="empty">' + esc(T('nothingPlanned')) + '</div>';
  }

  function renderTomorrow(d) {
    var plan = C.planFor(MENU_DATA, new Date(d.getTime() + DAY_MS), CHOSEN);
    var day = dayOf(plan), html = '';
    for (var i = 0; i < MEALS.length; i++) {
      if (!MEALS[i].tomorrow || !day[MEALS[i].id]) continue;
      MEAL_ROWS['m' + i] = { meal: MEALS[i], dishes: day[MEALS[i].id], when: T('tomorrow') };
      html += mealRow('m' + i, MEALS[i], day[MEALS[i].id], '');
    }
    $('tomorrow').innerHTML = html || '<div class="empty">' + esc(T('nothingPlanned')) + '</div>';
  }

  /* ───────── Modal (meal detail, full lists, week picker) ───────── */
  function openModal(mode, title, body) {
    var m = $('modal');
    m.innerHTML = '<div class="md-card md-' + mode + '"><div class="md-hd">' + title + '</div><div class="md-body">' + body +
      '</div><div class="md-close">' + esc(T('close')) + '</div></div>';
    m.className = 'modal on';
    m.setAttribute('data-mode', mode);
  }
  function closeModal() { $('modal').className = 'modal'; $('modal').innerHTML = ''; }

  function openMeal(id) {
    var row = MEAL_ROWS[id];
    if (!row) return;
    var body = '';
    for (var i = 0; i < PEOPLE.length; i++) {
      var d = row.dishes[PEOPLE[i].id];
      if (d == null) continue;
      body += '<div class="md-line">' + (PEOPLE.length > 1 ? '<span class="md-person">' + personTag(PEOPLE[i]) + esc(PEOPLE[i].label) + '</span>' : '') +
        String(d).replace(/\s*[—-]\s*(see recipe book|ver recetario)\s*$/i, '') + '</div>';
    }
    body += '<div id="mdRecipe" class="md-recipe"><div class="empty">' + esc(T('recipeSearching')) + '</div></div>';
    openModal('meal', esc(row.when + ' · ' + row.meal.label), body);
    var main = C.mainDish(row.dishes[PEOPLE[0].id] || '');
    xhr('GET', '/panel/recipe?q=' + encodeURIComponent(main), null, function (data) { renderRecipe(data && data.recipe); });
  }

  function renderRecipe(r) {
    var box = $('mdRecipe');
    if (!box) return;
    if (!r) { box.innerHTML = '<div class="empty">' + esc(T('recipeNone')) + '</div>'; return; }
    var out = '<div class="md-rt">' + esc(r.title) + '</div>', k;
    if (r.badges && r.badges.length) out += '<div class="md-badges">' + esc(r.badges.join(' · ')) + '</div>';
    if (r.subtitle) out += '<div class="md-sub">' + esc(r.subtitle) + '</div>';
    out += '<div class="md-cols">';
    if (r.ingredients && r.ingredients.length) {
      out += '<div class="md-col"><div class="md-h">' + esc(T('ingredients')) + '</div><ul>';
      for (k = 0; k < r.ingredients.length; k++) out += '<li>' + esc(r.ingredients[k]) + '</li>';
      out += '</ul></div>';
    }
    if (r.steps && r.steps.length) {
      out += '<div class="md-col md-col-wide"><div class="md-h">' + esc(T('steps')) + '</div><ol>';
      for (k = 0; k < r.steps.length; k++) out += '<li>' + esc(r.steps[k]) + '</li>';
      out += '</ol></div>';
    }
    out += '</div>';
    if (r.tip) out += '<div class="md-tip">' + esc(r.tip) + '</div>';
    box.innerHTML = out;
  }

  /* ───────── Week picker (choice stored on the server, shared with /menu) ───────── */
  function loadChoice(done) {
    xhr('GET', '/panel/week', null, function (data, status) {
      var prev = CHOSEN;
      if (status === 200 && data) CHOSEN = data.week || null;
      if (done) done(prev !== CHOSEN);
    });
  }

  function openPicker() {
    var weeks = [], key;
    for (key in MENU_DATA.weeks) {
      if (!MENU_DATA.weeks.hasOwnProperty(key)) continue;
      var s = C.parseDate(MENU_DATA.weeks[key].start);
      weeks.push({ key: key, start: s ? s.getTime() : 0, title: MENU_DATA.weeks[key].title });
    }
    weeks.sort(function (a, b) { return (b.start - a.start) || (a.key < b.key ? 1 : -1); });
    var body = '<div class="pk-item' + (CHOSEN ? '' : ' on') + '" data-key="">' + esc(T('automatic')) + '</div>';
    for (var i = 0; i < weeks.length; i++) {
      var parts = weeks[i].title.split('·');
      body += '<div class="pk-item' + (CHOSEN === weeks[i].key ? ' on' : '') + '" data-key="' + esc(weeks[i].key) + '"><b>' +
        esc(parts[0]) + '</b>' + (parts[1] ? '<span>' + esc(parts.slice(1).join('·')) + '</span>' : '') + '</div>';
    }
    openModal('week', esc(T('whichMenu')), body);
  }

  function choose(key) {
    CHOSEN = key || null;
    xhr('POST', '/panel/week', { week: CHOSEN });
    rerender();
  }

  /* ───────── Home Assistant (through the server proxy) ───────── */
  function ha(method, path, body, done) {
    // Always through the server: a token in config.js would be readable by anyone on the Wi-Fi.
    xhr(method, (CFG.HA_BASE || '/ha') + path, body, done);
  }
  var WITH_RESPONSE = { 'todo/get_items': 1, 'weather/get_forecasts': 1 };

  function service(domain, name, body, done) {
    // Only actions that return data may ask for it: Home Assistant answers 400 (and does
    // nothing) when ?return_response is sent to one that does not, like todo.update_item.
    var q = WITH_RESPONSE[domain + '/' + name] ? '?return_response' : '';
    ha('POST', '/api/services/' + domain + '/' + name + q, body, function (data, status) {
      if (done) done(data && data.service_response ? data.service_response : null, status);
    });
  }
  function offline(id) { $(id).innerHTML = '<div class="empty">' + esc(T('offline')) + '</div>'; }

  /* Weather */
  function loadWeather() {
    var id = CFG.WEATHER;
    if (!id) { $('weather').innerHTML = ''; return; }
    ha('GET', '/api/states/' + id, null, function (st) {
      if (!st) { $('weather').innerHTML = ''; return; }
      service('weather', 'get_forecasts', { entity_id: id, type: 'daily' }, function (resp) {
        var f = resp && resp[id] && resp[id].forecast ? resp[id].forecast[0] : null;
        var cond = T('conditions')[st.state] || st.state;
        var html = '<span class="w-now">' + Math.round(st.attributes.temperature) + '°</span><span class="w-txt">' + esc(cond);
        if (f) {
          html += '<br><span class="w-range">' + esc(T('weatherRange', { max: Math.round(f.temperature), min: Math.round(f.templow) }));
          if (f.precipitation) html += ' · ' + f.precipitation + ' mm';
          html += '</span>';
        }
        $('weather').innerHTML = html + '</span>';
        fit();
      });
    });
  }

  /* Agenda: next 7 days from every calendar */
  var CAL_NAMES = {};
  var LAST_EVENTS = null;
  function withCalendars(done) {
    if (CFG.CALENDARS && CFG.CALENDARS !== 'auto') { done(CFG.CALENDARS); return; }
    ha('GET', '/api/states', null, function (states) {
      if (!states) { done(null); return; }
      var ids = [];
      for (var i = 0; i < states.length; i++) {
        var id = states[i].entity_id;
        if (id.indexOf('calendar.') === 0) {
          ids.push(id);
          CAL_NAMES[id] = (states[i].attributes && states[i].attributes.friendly_name) || id.slice(9);
        }
      }
      ids.sort(function (a, b) { return a === CFG.MAIN_CALENDAR ? -1 : b === CFG.MAIN_CALENDAR ? 1 : (a < b ? -1 : 1); });
      done(ids);
    });
  }

  function parseWhen(t) {
    if (t.dateTime) return { date: new Date(t.dateTime), allDay: false };
    return { date: C.parseDate(t.date), allDay: true };
  }

  function loadAgenda() {
    withCalendars(function (cals) {
      if (cals === null) { offline('agenda'); fit(); return; }
      var start = C.startOfDay(now());
      var end = new Date(start.getTime() + 7 * DAY_MS + 3600000); // +1 h for daylight-saving changes
      var events = [], pending = cals.length, failed = 0;
      if (!pending) { LAST_EVENTS = []; renderAgenda(); return; }
      var fetchCal = function (cal, isMain) {
        ha('GET', '/api/calendars/' + cal + '?start=' + encodeURIComponent(start.toISOString()) +
          '&end=' + encodeURIComponent(end.toISOString()), null, function (list) {
          if (list) {
            for (var k = 0; k < list.length; k++) list[k].__cal = isMain ? '' : (CAL_NAMES[cal] || '');
            events = events.concat(list);
          } else { failed++; }
          if (--pending === 0) {
            if (failed === cals.length) { offline('agenda'); fit(); return; }
            LAST_EVENTS = events;
            renderAgenda();
          }
        });
      };
      for (var i = 0; i < cals.length; i++) fetchCal(cals[i], i === 0);
    });
  }

  function agendaHtml(events, maxPerDay) {
    var today = C.startOfDay(now()).getTime();
    var groups = [[], [], [], [], [], [], []], i, d, g, k;
    for (i = 0; i < events.length; i++) {
      var s = parseWhen(events[i].start), e = parseWhen(events[i].end);
      if (!s.date) continue;
      var first = Math.floor((C.startOfDay(s.date).getTime() - today) / DAY_MS);
      // All-day events end at 00:00 of the next day: the last day is the one before the end.
      var last = e.date ? Math.floor((C.startOfDay(new Date(e.date.getTime() - 1)).getTime() - today) / DAY_MS) : first;
      if (last < first) last = first;
      for (d = Math.max(first, 0); d <= Math.min(last, 6); d++) {
        groups[d].push({ s: s, title: events[i].summary || T('untitled'), cal: events[i].__cal, cont: d > first });
      }
    }
    var html = '';
    for (g = 0; g < 7; g++) {
      var date = new Date(today + g * DAY_MS + 3 * 3600000);
      var label = g === 0 ? T('today') : g === 1 ? T('tomorrow') : T('weekdaysShort')[date.getDay()];
      groups[g].sort(function (a, b) {
        if (a.s.allDay !== b.s.allDay) return a.s.allDay ? -1 : 1;
        return a.s.date - b.s.date;
      });
      html += '<div class="ag-block' + (g === 0 ? ' ag-today' : '') + '"><div class="ag-day">' + esc(label) +
        ' <span>' + date.getDate() + ' ' + esc(T('months')[date.getMonth()].slice(0, 3)) + '</span></div>';
      if (!groups[g].length) html += '<div class="ag-none">—</div>';
      var lim = groups[g].length > maxPerDay ? maxPerDay - 1 : groups[g].length;
      for (k = 0; k < lim; k++) {
        var it = groups[g][k];
        var time = it.s.allDay || it.cont ? T('allDay') : C.pad(it.s.date.getHours()) + ':' + C.pad(it.s.date.getMinutes());
        html += '<div class="ag-item"><span class="ag-time">' + esc(time) + '</span><span class="ag-title">' + esc(it.title) +
          (it.cal ? ' <span class="ag-cal">' + esc(it.cal) + '</span>' : '') + '</span></div>';
      }
      if (lim < groups[g].length) html += '<div class="ag-more">' + esc(T('more', { n: groups[g].length - lim })) + '</div>';
      html += '</div>';
    }
    return html;
  }

  function renderAgenda() {
    if (LAST_EVENTS === null) return;
    $('agenda').innerHTML = agendaHtml(LAST_EVENTS, LIMITS.agenda);
    if (!FITTING) fit();
  }

  /* Tasks and shopping: HA to-do lists. Tapping an item marks it completed. */
  var LISTS = {};
  function todoRow(it) {
    var due = it.due ? '<span class="td-due">' + esc(C.dueLabel(it.due, now(), T)) + '</span>' : '';
    return '<div class="td" data-uid="' + esc(it.uid) + '"><span class="td-box"></span><span class="td-text">' + esc(it.summary) + due + '</span></div>';
  }

  function loadTodo(box) {
    var entity = box === 'tasks' ? CFG.TASKS : CFG.SHOPPING;
    if (!entity) return;
    service('todo', 'get_items', { entity_id: entity, status: 'needs_action' }, function (resp) {
      if (!resp || !resp[entity]) { offline(box); fit(); return; }
      LISTS[box] = { entity: entity, items: resp[entity].items || [] };
      renderTodo(box);
      fit();
    });
  }

  function renderTodo(box) {
    var d = LISTS[box];
    if (!d) return;
    var items = d.items;
    $(box + 'Count').innerHTML = items.length ? esc(T('pending', { n: items.length })) : '';
    if (!items.length) {
      $(box).innerHTML = '<div class="empty">' + esc(T(box === 'tasks' ? 'allDone' : 'nothingMissing')) + '</div>';
      return;
    }
    var max = LIMITS[box], shown = items.length > max ? max - 1 : items.length, html = '';
    for (var i = 0; i < shown; i++) html += todoRow(items[i]);
    if (shown < items.length) html += '<div class="td-more" data-more="' + box + '">' + esc(T('moreSeeAll', { n: items.length - shown })) + '</div>';
    $(box).innerHTML = html;
  }

  function openList(box) {
    var d = LISTS[box];
    if (!d) return;
    var body = '<div data-box="' + box + '">';
    for (var i = 0; i < d.items.length; i++) body += todoRow(d.items[i]);
    openModal('list', esc(T(box)) + ' · ' + d.items.length, body + '</div>');
  }

  function completeTodo(el, box) {
    var d = LISTS[box];
    if (!d || el.className.indexOf('done') !== -1) return;
    el.className += ' done';
    service('todo', 'update_item', { entity_id: d.entity, item: el.getAttribute('data-uid'), status: 'completed' }, function (r, status) {
      if (!status || status >= 300) el.className = el.className.replace(' done', '');
      setTimeout(function () { loadTodo(box); }, 1500);
    });
  }

  /* Alerts: input_boolean banners and date reminders */
  function loadAlerts() {
    var toggles = CFG.ALERTS || [], dates = CFG.DATE_ALERTS || [];
    if (!toggles.length && !dates.length) return;
    ha('GET', '/api/states', null, function (states) {
      if (!states) return;
      var byId = {}, html = '', i;
      for (i = 0; i < states.length; i++) byId[states[i].entity_id] = states[i];
      for (i = 0; i < toggles.length; i++) {
        var st = byId[toggles[i].entity];
        if (st && st.state === 'on') {
          html += '<div class="al"><span class="al-txt">' + esc(toggles[i].text) + '</span>' +
            '<span class="al-btn" data-off="' + esc(toggles[i].entity) + '">' + esc(toggles[i].button || T('done')) + '</span></div>';
        }
      }
      for (i = 0; i < dates.length; i++) {
        var dt = byId[dates[i].entity], when = dt && C.parseDate(dt.state);
        if (!when) continue;
        var days = Math.round((when.getTime() - C.startOfDay(now()).getTime()) / DAY_MS);
        if (days > (dates[i].daysBefore || 7)) continue;
        var text = days < 0 ? T('dateAlertLate', { text: dates[i].text }) : days === 0 ? T('dateAlertToday', { text: dates[i].text }) :
          days === 1 ? T('dateAlertTomorrow', { text: dates[i].text }) : T('dateAlertIn', { text: dates[i].text, n: days });
        html += '<div class="al' + (days <= 0 ? ' al-warn' : '') + '"><span class="al-txt">' + esc(text) + '</span></div>';
      }
      var box = $('alerts');
      if (box.innerHTML !== html) { box.innerHTML = html; box.className = html ? 'alerts on' : 'alerts'; fit(); }
    });
  }

  /* ───────── Daily checklist (ticks shared through the server) ───────── */
  var CHECKED = {};
  function renderChecklist(d) {
    var items = CFG.CHECKLIST || [], html = '';
    for (var i = 0; i < items.length; i++) {
      var st = C.checklistState(items[i], !!CHECKED[items[i].id], d);
      html += '<div class="ck' + (st ? ' ck-' + st : '') + '" data-ck="' + esc(items[i].id) + '"><span class="ck-ic">' +
        (st === 'done' ? '✓' : esc(items[i].icon || '•')) + '</span><span class="ck-txt">' + esc(items[i].label) +
        (items[i].sub ? '<br><small>' + esc(items[i].sub) + '</small>' : '') + '</span></div>';
    }
    $('checklist').innerHTML = html;
  }
  function loadChecklist() {
    if (!(CFG.CHECKLIST || []).length) return;
    xhr('GET', '/panel/checklist?date=' + C.dateKey(now()), null, function (data, status) {
      if (status !== 200 || !data) return;
      CHECKED = data.done || {};
      renderChecklist(now());
    });
  }

  /* ───────── Photos for the free space ───────── */
  function showPhoto(list, boxId, d) {
    var box = $(boxId);
    if (!list || !list.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    var i = Math.floor(d.getTime() / ((CFG.PHOTO_MINUTES || 10) * 60000)) % list.length;
    var img = $(boxId + 'Img');
    if (img.getAttribute('data-src') !== list[i].src) {
      img.style.backgroundImage = 'url(' + list[i].src + ')';
      img.setAttribute('data-src', list[i].src);
      $(boxId + 'Cap').innerHTML = esc(list[i].caption || '');
      $(boxId + 'Cap').style.display = list[i].caption ? '' : 'none';
    }
  }
  function renderPhotos(d) {
    showPhoto(CFG.PHOTOS, 'photo', d);
    showPhoto(CFG.PHOTOS_SIDE, 'photo2', d);
    var used = (CFG.PHOTOS && CFG.PHOTOS.length) || WORK_MIN;
    $('midBottom').style.display = used ? '' : 'none';
  }
  // A photo hides instead of becoming tiny.
  function photoRoom() {
    var ids = ['photo', 'photo2'];
    for (var i = 0; i < ids.length; i++) {
      var box = $(ids[i]);
      box.className = 'card card-photo';
      if (box.offsetHeight < 130) box.className = 'card card-photo tiny';
    }
  }

  /* ───────── Big calendar: week or month, ‹ › and Today, one colour per calendar ───────── */
  var CAL_COLORS = ['#4a7a3a', '#3a6a8a', '#b8900a', '#a04a6a', '#7a5aa0', '#a06a3a', '#3a8a7a'];
  var CALV = { view: 'week', anchor: null, cals: [], token: 0 };

  function mondayOf(d) { var m = C.startOfDay(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function headMonFirst() { var w = T('weekdaysShort'); return w.slice(1).concat(w.slice(0, 1)); }

  // Events of every calendar from first (included) to last (excluded), grouped by day; null = offline
  function fetchRange(first, last, done) {
    withCalendars(function (cals) {
      if (cals === null) { done(null); return; }
      CALV.cals = cals;
      var byDay = {}, pending = cals.length, failed = 0;
      if (!pending) { done(byDay); return; }
      var each = function (cal, ci) {
        ha('GET', '/api/calendars/' + cal + '?start=' + encodeURIComponent(first.toISOString()) +
          '&end=' + encodeURIComponent(new Date(last.getTime() + 3600000).toISOString()), null, function (list) {
          if (!list) failed++;
          for (var k = 0; list && k < list.length; k++) {
            var s = parseWhen(list[k].start), e = parseWhen(list[k].end);
            var d0 = C.startOfDay(s.date), d1 = C.startOfDay(new Date(e.date.getTime() - 1));
            if (d1 < d0) d1 = d0;
            for (var d = d0 < first ? new Date(first.getTime()) : d0; d <= d1 && d < last; d = addDays(d, 1)) {
              var key = C.dateKey(d);
              (byDay[key] = byDay[key] || []).push({ s: s, title: list[k].summary || T('untitled'), ci: ci, cont: d > d0 });
            }
          }
          if (--pending === 0) done(failed === cals.length ? null : byDay);
        });
      };
      for (var i = 0; i < cals.length; i++) each(cals[i], i);
    });
  }

  function sortDay(list) {
    list.sort(function (a, b) {
      var ad = a.s.allDay || a.cont, bd = b.s.allDay || b.cont;
      if (ad !== bd) return ad ? -1 : 1;
      return a.s.date - b.s.date;
    });
    return list;
  }

  function calChip(it, withTime) {
    var col = CAL_COLORS[it.ci % CAL_COLORS.length];
    if (it.s.allDay || it.cont) return '<div class="cv-ev cv-all" style="background:' + col + '">' + esc(it.title) + '</div>';
    return '<div class="cv-ev"><i style="background:' + col + '"></i>' +
      (withTime ? '<b>' + it.s.date.getHours() + ':' + C.pad(it.s.date.getMinutes()) + '</b> ' : '') + esc(it.title) + '</div>';
  }

  function openCal(view, anchor) {
    CALV.view = view || CALV.view;
    CALV.anchor = anchor || CALV.anchor || now();
    var a = CALV.anchor, months = T('months'), first, last, title;
    if (CALV.view === 'week') {
      first = mondayOf(a); last = addDays(first, 7);
      var end = addDays(first, 6);
      title = first.getDate() + (first.getMonth() !== end.getMonth() ? ' ' + months[first.getMonth()].slice(0, 3) : '') +
        ' – ' + end.getDate() + ' ' + months[end.getMonth()].slice(0, 3) + ' ' + end.getFullYear();
    } else {
      first = mondayOf(new Date(a.getFullYear(), a.getMonth(), 1));
      last = addDays(mondayOf(new Date(a.getFullYear(), a.getMonth() + 1, 0)), 7);
      title = months[a.getMonth()] + ' ' + a.getFullYear();
    }
    var token = ++CALV.token;
    renderCal(title, first, last, undefined);
    fetchRange(first, last, function (byDay) {
      if (token === CALV.token && $('modal').getAttribute('data-mode') === 'cal') renderCal(title, first, last, byDay);
    });
  }

  function renderCal(title, first, last, byDay) {
    var todayK = C.dateKey(now()), heads = headMonFirst(), body = '', head = '';
    for (var h = 0; h < 7; h++) head += '<th>' + esc(heads[h]) + '</th>';
    if (byDay === null) {
      body = '<div class="empty">' + esc(T('offline')) + '</div>';
    } else if (CALV.view === 'week') {
      var row = '';
      for (var i = 0; i < 7; i++) {
        var d = addDays(first, i), k = C.dateKey(d), list = sortDay((byDay && byDay[k]) || []), cell = '';
        for (var j = 0; j < list.length; j++) cell += calChip(list[j], true);
        if (byDay && !list.length) cell = '<div class="cv-none">—</div>';
        row += '<td class="' + (k === todayK ? 'cv-today' : '') + '"><div class="cv-dn"><span>' + esc(heads[i]) + '</span> ' + d.getDate() + '</div>' + cell + '</td>';
      }
      body = '<table class="cv-week"><tr>' + row + '</tr></table>';
    } else {
      var rows = '', month = CALV.anchor.getMonth(), nWeeks = Math.round((last - first) / (7 * DAY_MS));
      for (var w = first; w < last; w = addDays(w, 7)) {
        rows += '<tr style="height:' + (100 / nWeeks).toFixed(2) + '%">';
        for (var n = 0; n < 7; n++) {
          var dd = addDays(w, n), kk = C.dateKey(dd), l = sortDay((byDay && byDay[kk]) || []), c = '', max = 4;
          for (var m = 0; m < Math.min(l.length, l.length > max ? max - 1 : max); m++) c += calChip(l[m], false);
          if (l.length > max) c += '<div class="cv-more">' + esc(T('more', { n: l.length - max + 1 })) + '</div>';
          rows += '<td data-day="' + kk + '" class="' + (dd.getMonth() !== month ? 'cv-out' : '') + (kk === todayK ? ' cv-today' : '') + '">' +
            '<div class="cv-num">' + dd.getDate() + '</div>' + c + '</td>';
        }
        rows += '</tr>';
      }
      body = '<table class="cv-month"><tr>' + head + '</tr>' + rows + '</table>';
    }
    var legend = '';
    for (var ci = 0; ci < CALV.cals.length && CALV.cals.length > 1; ci++) {
      legend += '<span><i style="background:' + CAL_COLORS[ci % CAL_COLORS.length] + '"></i>' + esc(CAL_NAMES[CALV.cals[ci]] || CALV.cals[ci].slice(9)) + '</span>';
    }
    var bar = '<span class="cv-btn" data-cal="prev">‹</span><span class="cv-btn" data-cal="next">›</span>' +
      '<span class="cv-title">' + esc(title) + (byDay === undefined ? ' <em>' + esc(T('loading')) + '</em>' : '') + '</span>' +
      '<span class="cv-btn cv-today-btn" data-cal="today">' + esc(T('today')) + '</span>' +
      '<span class="cv-seg"><span class="' + (CALV.view === 'week' ? 'on' : '') + '" data-cal="week">' + esc(T('calWeek')) + '</span>' +
      '<span class="' + (CALV.view === 'month' ? 'on' : '') + '" data-cal="month">' + esc(T('calMonth')) + '</span></span>';
    openModal('cal', bar, body + (legend ? '<div class="cv-legend">' + legend + '</div>' : ''));
  }

  function calClick(el) {
    var act = el.getAttribute('data-cal'), a = CALV.anchor;
    if (el.getAttribute('data-day')) openCal('week', C.parseDate(el.getAttribute('data-day')));
    else if (act === 'prev' || act === 'next') {
      var dir = act === 'next' ? 1 : -1;
      openCal(null, CALV.view === 'week' ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1));
    } else if (act === 'today') openCal(null, now());
    else if (act === 'week' || act === 'month') openCal(act, a);
  }

  /* ───────── Work timer (optional: CFG.WORK_TIMER) ─────────
     ▶ starts the day, ❚❚ opens a break, ▶ ends it. The leave time is now + what is left of
     the configured day. Events are stored on the server with the server's clock. */
  var WORK_MIN = CFG.WORK_TIMER ? C.workMinutes(CFG.WORK_TIMER.HOURS) : null;
  var WORK = { events: [], offset: 0, sure: 0 };

  function clockOf(ms) { var d = new Date(ms); return d.getHours() + ':' + C.pad(d.getMinutes()); }
  function workNow() { return now().getTime() + WORK.offset; }
  function workSync(data) { if (data && data.now && !window.__NOW__) WORK.offset = data.now - new Date().getTime(); }

  function renderWork() {
    var box = $('work');
    if (!WORK_MIN) { box.style.display = 'none'; return; }
    var t = workNow(), target = WORK_MIN * 60000;
    var s = C.workSummary(WORK.events, t, true, WORK_MIN);
    var btn, line, stop = '', exit;
    if (s.state === 'work') {
      btn = '<div class="wk-btn wk-pause" data-act="pause"><i></i><i></i></div>';
      line = esc(T('wkIn', { t: clockOf(s.first) })) + (s.pause ? ' · ' + esc(T('wkBreakSoFar', { t: C.hm(s.pause) })) : '');
    } else if (s.state === 'break') {
      btn = '<div class="wk-btn wk-play" data-act="resume"><i></i></div>';
      line = T('wkOnBreak', { t: C.hm(t - s.since) });
    } else {
      btn = '<div class="wk-btn wk-play" data-act="start"><i></i></div>';
      line = esc(s.state === 'done' ? T('wkDone', { d: (s.worked >= target ? '+' : '−') + C.hm(Math.abs(s.worked - target)) }) : T('wkTapToStart'));
    }
    if (s.state === 'work' || s.state === 'break') {
      var sure = WORK.sure > t;
      stop = '<span class="wk-stop' + (sure ? ' wk-sure' : '') + '" data-act="stop">' + esc(T(sure ? 'wkStopSure' : 'wkStop')) + '</span>';
    }
    exit = s.state === 'done' ? T('wkLeft', { t: clockOf(s.out) }) : s.state === 'idle' ? T('wkDay', { t: C.hm(target) }) : T('wkLeaveAt', { t: clockOf(s.exit) });
    box.style.display = '';
    box.className = 'card card-work wk-' + s.state;
    // while the day runs, "End" takes the place of "week ›" so the card needs one line less
    box.innerHTML = '<div class="wk-hd">' + esc(T('wkTitle')) + (stop || '<span>' + esc(T('wkWeekLink')) + '</span>') + '</div>' +
      '<div class="wk-row">' + btn + '<div class="wk-info"><div class="wk-time">' + C.hm(s.worked) + '</div>' +
      '<div class="wk-exit">' + esc(exit) + '</div></div></div>' +
      '<div class="wk-bar"><i style="width:' + Math.min(100, Math.round(s.worked / target * 100)) + '%"></i></div>' +
      '<div class="wk-state">' + line + '</div>';
  }

  function loadWork() {
    if (!WORK_MIN) return;
    var day = C.dateKey(now());
    xhr('GET', '/panel/work?from=' + day + '&to=' + day, null, function (data) {
      if (!data) return;
      workSync(data);
      WORK.events = (data.days && data.days[day]) || [];
      renderWork();
    });
  }

  function workAction(act) {
    xhr('POST', '/panel/work', { day: C.dateKey(now()), a: act }, function (data) {
      if (data && data.events) { workSync(data); WORK.events = data.events; renderWork(); } else loadWork();
    });
  }

  function openWorkWeek(back) {
    var d = now(), monday = C.startOfDay(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7 * back);
    var days = [];
    for (var i = 0; i < 7; i++) { var x = new Date(monday.getTime()); x.setDate(monday.getDate() + i); days.push(x); }
    var today = C.dateKey(d), workDays = CFG.WORK_TIMER.DAYS || [1, 2, 3, 4, 5], target = WORK_MIN * 60000;
    xhr('GET', '/panel/work?from=' + C.dateKey(days[0]) + '&to=' + C.dateKey(days[6]), null, function (data) {
      var all = (data && data.days) || {}, rows = '', total = 0, due = 0, wd = T('weekdaysShort');
      for (var i = 0; i < 7; i++) {
        var key = C.dateKey(days[i]), ev = all[key] || [], on = workDays.indexOf(days[i].getDay()) !== -1;
        var s = C.workSummary(ev, workNow(), key === today, WORK_MIN);
        var diff = ev.length && s.state === 'done' ? s.worked - target : null;
        if (on) due += target;
        total += s.worked;
        rows += '<tr data-wday="' + i + '" class="' + (key === today ? 'wk-today' : '') + (on ? '' : ' wk-off') + '">' +
          '<td>' + esc(wd[days[i].getDay()]) + ' <span>' + days[i].getDate() + '</span></td>' +
          '<td>' + (s.first ? clockOf(s.first) : '–') + '</td>' +
          '<td>' + (s.out ? clockOf(s.out) + (s.open ? '<sup>?</sup>' : '') : (s.state === 'work' || s.state === 'break') ? esc(T('wkNow')) : '–') + '</td>' +
          '<td>' + (s.pause ? C.hm(s.pause) : '–') + '</td>' +
          '<td><b>' + (ev.length ? C.hm(s.worked) : '–') + '</b></td>' +
          '<td class="' + (diff === null ? '' : diff >= 0 ? 'wk-plus' : 'wk-minus') + '">' +
          (diff === null ? '' : (diff >= 0 ? '+' : '−') + C.hm(Math.abs(diff))) + '</td></tr>';
      }
      var title = '<span class="wk-arrow" data-back="' + (back + 1) + '">‹</span>' +
        esc(back === 0 ? T('wkThisWeek') : back === 1 ? T('wkLastWeek') : T('wkWeekOf', { d: days[0].getDate() + '/' + (days[0].getMonth() + 1) })) +
        '<span class="wk-arrow' + (back ? '' : ' wk-none') + '"' + (back ? ' data-back="' + (back - 1) + '"' : '') + '>›</span>';
      openModal('work', title, '<table class="wk-table"><tr><th></th><th>' + esc(T('wkColIn')) + '</th><th>' + esc(T('wkColOut')) +
        '</th><th>' + esc(T('wkColBreak')) + '</th><th>' + esc(T('wkColWorked')) + '</th><th></th></tr>' + rows + '</table>' +
        '<div class="wk-total">' + T('wkTotal', { t: C.hm(total), d: C.hm(due) }) + ' · ' +
        (total >= due ? '<span class="wk-plus">+' + C.hm(total - due) + '</span>' : esc(T('wkMissing', { t: C.hm(due - total) }))) + '</div>' +
        '<div class="wk-note">' + esc(T('wkFixHint')) + ' ' + esc(T('wkOpenNote')) + '</div>');
      WORK.week = { days: days, back: back };
    });
  }

  /* Correct a day by hand: every time with −1 h, −5, +5, +1 h; add the next step or remove the last. */
  var WK_NEXT = { none: ['start'], stop: ['start'], start: ['pause', 'stop'], resume: ['pause', 'stop'], pause: ['resume', 'stop'] };
  var EDIT = null;

  function openWorkDay(date, back) {
    var key = C.dateKey(date);
    xhr('GET', '/panel/work?from=' + key + '&to=' + key, null, function (data) {
      var ev = (data && data.days && data.days[key]) || [], copy = [];
      for (var i = 0; i < ev.length; i++) copy.push({ a: ev[i].a, ts: ev[i].ts });
      EDIT = { key: key, date: date, back: back, events: copy, error: '' };
      renderWorkDay();
    });
  }

  function renderWorkDay() {
    var ev = EDIT.events, labels = T('wkLabels'), rows = '', adds = '';
    for (var i = 0; i < ev.length; i++) {
      rows += '<div class="wd-row"><span class="wd-lab">' + esc(labels[ev[i].a]) + '</span>' +
        '<span class="wd-b" data-ed="' + i + ':-60">−1 h</span><span class="wd-b" data-ed="' + i + ':-5">−5</span>' +
        '<span class="wd-t">' + clockOf(ev[i].ts) + '</span>' +
        '<span class="wd-b" data-ed="' + i + ':5">+5</span><span class="wd-b" data-ed="' + i + ':60">+1 h</span></div>';
    }
    if (!ev.length) rows = '<div class="wd-empty">' + esc(T('wkNone')) + '</div>';
    var next = WK_NEXT[ev.length ? ev[ev.length - 1].a : 'none'];
    for (var k = 0; k < next.length; k++) adds += '<span class="wd-add" data-add="' + next[k] + '">' + esc(T('wkAdd', { x: labels[next[k]].toLowerCase() })) + '</span>';
    if (ev.length) adds += '<span class="wd-add wd-del" data-del="1">' + esc(T('wkRemoveLast')) + '</span>';
    var d = EDIT.date;
    openModal('workday', esc(T('wkFix', { d: T('weekdaysShort')[d.getDay()] + ' ' + d.getDate() })),
      rows + '<div class="wd-adds">' + adds + '</div>' + (EDIT.error ? '<div class="wd-err">' + esc(EDIT.error) + '</div>' : '') +
      '<div class="wd-foot"><span class="wd-cancel" data-wd="cancel">' + esc(T('cancel')) + '</span><span class="wd-save" data-wd="save">' + esc(T('save')) + '</span></div>');
  }

  function workDayClick(el) {
    var ev = EDIT.events, v;
    if ((v = el.getAttribute('data-ed'))) {
      var p = v.split(':');
      ev[+p[0]].ts += (+p[1]) * 60000;
      EDIT.error = '';
    } else if ((v = el.getAttribute('data-add'))) {
      var d = EDIT.date, base = ev.length ? ev[ev.length - 1].ts + 30 * 60000 : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0).getTime();
      if (EDIT.key === C.dateKey(now()) && base > workNow()) base = Math.max(workNow(), ev.length ? ev[ev.length - 1].ts + 60000 : 0);
      ev.push({ a: v, ts: Math.round(base / 60000) * 60000 });
    } else if (el.getAttribute('data-del')) {
      ev.pop();
    } else if ((v = el.getAttribute('data-wd'))) {
      if (v === 'cancel') { openWorkWeek(EDIT.back); return; }
      for (var i = 1; i < ev.length; i++) if (ev[i].ts <= ev[i - 1].ts) { EDIT.error = T('wkOrder'); renderWorkDay(); return; }
      xhr('POST', '/panel/work', { day: EDIT.key, events: ev }, function (data, status) {
        if (!data) { EDIT.error = T('wkSaveError', { s: status }); renderWorkDay(); return; }
        if (EDIT.key === C.dateKey(now())) { WORK.events = data.events; renderWork(); }
        openWorkWeek(EDIT.back);
      });
      return;
    } else return;
    renderWorkDay();
  }

  function onWorkClick(ev) {
    var el = closest(ev.target, this, function (e) { return e.getAttribute('data-act'); });
    if (!el) { openWorkWeek(0); return; }
    var act = el.getAttribute('data-act');
    if (act === 'stop' && WORK.sure < workNow()) {
      WORK.sure = workNow() + 4000;   // a second tap within 4 s, so the day is not ended by accident
      renderWork();
      setTimeout(renderWork, 4100);
      return;
    }
    WORK.sure = 0;
    workAction(act);
  }

  /* ───────── Night mode: Auto → Day → Night (remembered by this tablet) ───────── */
  var MODES = ['auto', 'day', 'night'];
  function getMode() { try { return localStorage.getItem('panel-mode') || 'auto'; } catch (e) { return 'auto'; } }
  function setMode(m) { try { localStorage.setItem('panel-mode', m); } catch (e) {} }
  function applyTheme(d) {
    var mode = getMode();
    var night = C.isNight(mode, d, CFG.NIGHT_FROM == null ? 23 : CFG.NIGHT_FROM, CFG.NIGHT_TO == null ? 7 : CFG.NIGHT_TO);
    document.documentElement.className = night ? 'night' : '';
    var label = T(mode === 'auto' ? 'modeAuto' : mode === 'day' ? 'modeDay' : 'modeNight');
    $('mode').innerHTML = esc(mode === 'auto' ? label + ' · ' + T(night ? 'modeNight' : 'modeDay').toLowerCase() : label);
  }

  /* ───────── Fit: everything on one screen, no scrolling ─────────
     1) trim the lists of the column that overflows; 2) shrink text (fit-0 … fit-7). */
  var FIT_LEVELS = 8;
  var FLOW_WIDTH = 1000;  // keep in sync with the @media rule in styles.css
  function defaultLimits() { return { tasks: CFG.TASKS_MAX || 5, shopping: CFG.SHOPPING_MAX || 7, agenda: CFG.AGENDA_MAX_PER_DAY || 4 }; }
  var LIMITS = defaultLimits();
  var MIN_LIMITS = { tasks: 3, shopping: 4, agenda: 2 };
  var FITTING = false;
  function viewportHeight() {
    var a = window.innerHeight, b = document.documentElement.clientHeight;
    return a && b ? Math.min(a, b) : (a || b);
  }
  function colOverflows(id) {
    var col = $(id), last = col.lastElementChild;
    while (last && last.style.display === 'none') last = last.previousElementSibling;
    return !!last && last.getBoundingClientRect().bottom > viewportHeight() - 6;
  }
  function overflows() { return colOverflows('colMeals') || colOverflows('colMid') || colOverflows('colSide'); }
  function fit() {
    if (FITTING) return;
    FITTING = true;
    var body = document.body;
    LIMITS = defaultLimits();
    body.className = 'fit-0';
    renderTodo('tasks'); renderTodo('shopping'); renderAgenda();
    if (window.innerWidth < FLOW_WIDTH) {
      // Narrow screen (phone, portrait tablet, small window): stack the cards and
      // let the page scroll instead of shrinking the text.
      body.className = 'fit-0 flow';
      photoRoom();
      FITTING = false;
      return;
    }
    var k = 0, guard = 0;
    while (colOverflows('colSide') && guard++ < 20) {
      var key = (k++ % 2 === 0) ? 'shopping' : 'tasks';
      if (LIMITS[key] > MIN_LIMITS[key]) { LIMITS[key]--; renderTodo(key); }
      else if (LIMITS.shopping <= MIN_LIMITS.shopping && LIMITS.tasks <= MIN_LIMITS.tasks) break;
    }
    while (colOverflows('colMid') && LIMITS.agenda > MIN_LIMITS.agenda && LAST_EVENTS && LAST_EVENTS.length) {
      LIMITS.agenda--; renderAgenda();
    }
    for (var level = 0; level < FIT_LEVELS; level++) {
      body.className = 'fit-' + level;
      if (!overflows()) break;
    }
    photoRoom();
    FITTING = false;
  }

  /* ───────── Taps ───────── */
  function closest(el, stop, test) {
    while (el && el !== stop) { if (el.getAttribute && test(el)) return el; el = el.parentNode; }
    return null;
  }
  function bind() {
    var meals = function (ev) {
      var el = closest(ev.target, this, function (e) { return e.getAttribute('data-row'); });
      if (el) openMeal(el.getAttribute('data-row'));
    };
    $('today').onclick = meals;
    $('tomorrow').onclick = meals;
    $('weekLabel').onclick = openPicker;
    $('agenda').onclick = function () { openCal('week', now()); };
    var lists = function (ev) {
      var box = this.id;
      var el = closest(ev.target, this, function (e) { return e.getAttribute('data-uid') || e.getAttribute('data-more'); });
      if (!el) return;
      if (el.getAttribute('data-more')) openList(box); else completeTodo(el, box);
    };
    $('tasks').onclick = lists;
    $('shopping').onclick = lists;
    $('work').onclick = onWorkClick;
    $('modal').onclick = function (ev) {
      var mode = this.getAttribute('data-mode');
      var back = closest(ev.target, this, function (e) { return e.getAttribute('data-back'); });
      if (mode === 'work' && back) { openWorkWeek(+back.getAttribute('data-back')); return; }
      var wday = closest(ev.target, this, function (e) { return e.getAttribute('data-wday'); });
      if (mode === 'work' && wday) { openWorkDay(WORK.week.days[+wday.getAttribute('data-wday')], WORK.week.back); return; }
      if (mode === 'cal') {
        var cv = closest(ev.target, this, function (e) { return e.getAttribute('data-cal') || e.getAttribute('data-day'); });
        if (cv) { calClick(cv); return; }
      }
      if (mode === 'workday') {
        var ed = closest(ev.target, this, function (e) { return e.getAttribute('data-ed') || e.getAttribute('data-add') || e.getAttribute('data-del') || e.getAttribute('data-wd'); });
        if (ed) workDayClick(ed);
        return;
      }
      var row = closest(ev.target, this, function (e) { return e.getAttribute('data-uid'); });
      if (mode === 'list' && row) { completeTodo(row, row.parentNode.getAttribute('data-box')); return; }
      var item = closest(ev.target, this, function (e) { return e.getAttribute('data-key') !== null; });
      if (mode === 'week' && item) { choose(item.getAttribute('data-key')); closeModal(); return; }
      var card = closest(ev.target, this, function (e) { return /(^| )md-card( |$)/.test(e.className); });
      var close = closest(ev.target, this, function (e) { return e.className === 'md-close'; });
      if (!card || close) closeModal();
    };
    $('alerts').onclick = function (ev) {
      var id = ev.target.getAttribute && ev.target.getAttribute('data-off');
      if (!id) return;
      ev.target.innerHTML = '✓';
      ha('POST', '/api/services/input_boolean/turn_off', { entity_id: id }, function () { setTimeout(loadAlerts, 800); });
    };
    $('checklist').onclick = function (ev) {
      var el = closest(ev.target, this, function (e) { return e.getAttribute('data-ck'); });
      if (!el) return;
      var id = el.getAttribute('data-ck');
      CHECKED[id] = !CHECKED[id];
      renderChecklist(now());
      xhr('POST', '/panel/checklist', { date: C.dateKey(now()), id: id, done: CHECKED[id] });
    };
    $('mode').onclick = function () {
      var m = getMode(), i = 0;
      for (var k = 0; k < MODES.length; k++) if (MODES[k] === m) i = k;
      setMode(MODES[(i + 1) % MODES.length]);
      applyTheme(now());
    };
    // Tapping the clock reloads (a home-screen shortcut has no reload button).
    $('clock').onclick = function () { location.reload(); };
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
  }

  /* ───────── Main loop ───────── */
  var lastMinute = -1;
  var loadedDay = now().getDate();
  function rerender() { lastMinute = -1; tick(); }
  function tick() {
    var d = now();
    if (d.getDate() !== loadedDay && !window.__NOW__) { location.reload(); return; }
    if (d.getMinutes() === lastMinute) return;
    lastMinute = d.getMinutes();
    renderClock(d);
    applyTheme(d);
    renderChecklist(d);
    renderPhotos(d);
    renderWork();
    renderToday(d);
    renderTomorrow(d);
    fit();
  }
  function loadAll() {
    loadWork();
    loadChecklist();
    loadAlerts();
    loadWeather();
    loadAgenda();
    loadTodo('tasks');
    loadTodo('shopping');
  }

  window.onerror = function (msg, src, line) {
    var el = document.createElement('div');
    el.className = 'js-error';
    el.innerHTML = esc(T('jsError') + ': ' + msg + ' (' + (src || '').split('/').pop() + ':' + line + ')');
    document.body.appendChild(el);
  };

  renderLabels();
  bind();
  tick();
  loadAll();
  loadChoice(function (changed) { if (changed) rerender(); });
  setInterval(tick, 5000);
  setInterval(loadAll, (CFG.REFRESH_SECONDS || 60) * 1000);
  setInterval(function () { loadChoice(function (changed) { if (changed) rerender(); }); }, 30000);
  setTimeout(fit, 800);
  // Reload every 30 minutes to pick up a new menu.
  setTimeout(function () { location.reload(); }, 30 * 60 * 1000);
})();
