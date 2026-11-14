const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('host header displays the release version instead of the placeholder initial', () => {
  const source = fs.readFileSync(path.join(__dirname, '../workspace.js'), 'utf8');
  assert.match(source, /const releaseVersion = 'v0\.1\.10';/);
  assert.match(source, /user: \{ initials: releaseVersion, label: 'Templify ' \+ releaseVersion \}/);
  assert(!source.includes("initials: 'T'"));
});

test('startup opens Dashboard by default and preserves valid deep links', () => {
  const source = fs.readFileSync(path.join(__dirname, '../workspace.js'), 'utf8');
  const start = source.indexOf('  const defaultRoute =');
  const end = source.indexOf("  window.addEventListener('hashchange', restoreRoute)", start);
  assert(start >= 0 && end > start);
  for (const [hash, expected] of [
    ['', 'dashboard'], ['#unknown', 'dashboard'],
    ['#topschrank.palette', 'palette'], ['#topschrank.dashboard', 'dashboard']
  ]) {
    const calls = [], location = { hash };
    const context = {
      location,
      routes: { dashboard: { anchor: 'topschrank.dashboard' }, palette: { anchor: 'topschrank.palette' } },
      history: { replaceState(state, title, hash) { location.hash = hash; } },
      navigate(id, push) { calls.push([id, push]); }
    };
    vm.runInNewContext(source.slice(start, end) + '\nrestoreRoute();', context);
    assert.deepEqual(calls, [[expected, false]]);
    assert.equal(location.hash, '#topschrank.' + expected);
  }
});
