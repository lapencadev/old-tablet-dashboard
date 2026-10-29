// Development helper: screenshot the panel with a fake clock.
//   node tools/screenshot.js <url> <out.png> [--now 2026-11-04T12:30:00] [--size 1280x800] [--click selector] [--config '{"LANG":"es"}']
'use strict';
var args = process.argv.slice(2);
function opt(name, def) { var i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; }
(async function () {
  var playwright;
  try { playwright = require('playwright'); } catch (e) { console.error('Playwright is not installed (npm i -D playwright).'); process.exit(2); }
  var size = opt('size', '1280x800').split('x').map(Number);
  var browser = await playwright.chromium.launch();
  var page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  var errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  var now = opt('now'), config = opt('config'), mode = opt('mode');
  await page.addInitScript(function (o) {
    if (o.now) window.__NOW__ = o.now;
    if (o.mode) { try { localStorage.setItem('panel-mode', o.mode); } catch (e) {} }
    if (o.config) {
      var extra = JSON.parse(o.config);
      Object.defineProperty(window, 'PANEL_CONFIG', {
        configurable: true,
        get: function () { return this.__cfg; },
        set: function (v) { for (var k in extra) v[k] = extra[k]; this.__cfg = v; }
      });
    }
  }, { now: now, config: config, mode: mode });
  await page.goto(args[0]);
  await page.waitForTimeout(1500);
  var click = opt('click');
  if (click) { await page.click(click); await page.waitForTimeout(800); }
  await page.screenshot({ path: args[1] });
  var report = await page.evaluate(function () {
    var cols = ['colMeals', 'colMid', 'colSide'].map(function (id) {
      var c = document.getElementById(id), last = c.lastElementChild;
      while (last && last.style.display === 'none') last = last.previousElementSibling;
      return last ? Math.round(last.getBoundingClientRect().bottom) : 0;
    });
    return { fit: document.body.className, bottoms: cols, height: window.innerHeight };
  });
  console.log(JSON.stringify({ out: args[1], errors: errors, layout: report }));
  await browser.close();
})();
