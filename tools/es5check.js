// Fails if any file uses syntax newer than ES5 (the panel must run on Chrome 40 / Android 4.4).
'use strict';
var acorn = require('acorn');
var fs = require('fs');
var bad = 0;
process.argv.slice(2).forEach(function (file) {
  try {
    acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 5, sourceType: 'script', locations: true });
    console.log('  ok   ' + file);
  } catch (e) {
    bad++;
    var loc = e.loc ? ':' + e.loc.line + ':' + (e.loc.column + 1) : '';
    console.log('  FAIL ' + file + loc + '  ' + e.message.replace(/\s*\(\d+:\d+\)$/, '') + '  (not ES5)');
  }
});
process.exit(bad ? 1 : 0);
