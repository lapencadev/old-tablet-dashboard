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
    xhr(method, (CFG.HA_BASE || '') + path, body, done, CFG.HA_TOKEN ? { Authorization: 'Bearer ' + CFG.HA_TOKEN } : null);
  }
  function service(domain, name, body, done) {
    ha('POST', '/api/services/' + domain + '/' + name + '?return_response', body, function (data, status) {
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
    $('agenda').onclick = function () {
      if (LAST_EVENTS) openModal('agenda', esc(T('thisWeek')), '<div class="agenda-week">' + agendaHtml(LAST_EVENTS, 99) + '</div>');
    };
    var lists = function (ev) {
      var box = this.id;
      var el = closest(ev.target, this, function (e) { return e.getAttribute('data-uid') || e.getAttribute('data-more'); });
      if (!el) return;
      if (el.getAttribute('data-more')) openList(box); else completeTodo(el, box);
    };
    $('tasks').onclick = lists;
    $('shopping').onclick = lists;
    $('modal').onclick = function (ev) {
      var mode = this.getAttribute('data-mode');
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
    renderToday(d);
    renderTomorrow(d);
    fit();
  }
  function loadAll() {
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
