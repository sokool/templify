const { test } = require('node:test');
const assert = require('node:assert/strict');
const Switcher = require('../theme-switcher.js');
const Shortcuts = require('../../shortcuts/shortcuts.js');
const { Document } = require('../../../testing/dom-fixture.cjs');

function fixture() {
  const document = new Document();
  document.documentElement = document.createElement('html');
  document.append(document.documentElement);
  document.defaultView = document.createElement('window');
  document.defaultView.CustomEvent = class {
    constructor(type, options) { this.type = type; Object.assign(this, options); }
  };
  document.dispatchEvent = event => document.emit(event.type, event);
  document.documentElement.dispatchEvent = event => document.documentElement.emit(event.type, event);
  const shortcuts = Shortcuts.create({ document });
  let theme = 'light', selections = 0;
  let entries = ['light', 'dark', 'matrix'].map(id => ({ id, label: id, base: id }));
  const listeners = new Set();
  const themes = {
    getState: () => ({ theme, themes: entries }),
    select(id) {
      if (!entries.some(entry => entry.id === id)) return false;
      theme = id; selections++;
      listeners.forEach(listener => listener());
      return true;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const press = (extra = {}) => {
    let prevented = false;
    document.emit('keydown', { key: 'L', code: 'KeyL', ctrlKey: true, shiftKey: true,
      preventDefault() { prevented = true; }, ...extra });
    return prevented;
  };
  return { document, shortcuts, themes, press, selections: () => selections,
    setThemes: list => { entries = list; listeners.forEach(listener => listener()); } };
}

test('cycling stays keyboard-only in Search while named theme actions select an exact profile', () => {
  const f = fixture(), view = Switcher.create(f);
  const events = [];
  f.document.documentElement.addEventListener('ui:theme-change', event => events.push(event.detail.theme));
  const action = f.shortcuts.get(Switcher.shortcutId);
  assert.equal(action.label, 'Next theme');
  assert.equal(action.searchable, false);
  assert.equal(action.defaultShortcut, 'Mod+Shift+L');
  assert.equal(action.icon, 'sun-moon');
  assert.equal(f.press(), true);
  assert.equal(f.themes.getState().theme, 'dark');
  assert.equal(f.press({ repeat: true }), true);
  assert.equal(f.selections(), 1);
  assert.equal(f.press({ ctrlKey: false, metaKey: true }), true);
  assert.equal(f.themes.getState().theme, 'matrix');
  assert.deepEqual(f.shortcuts.list().filter(entry => entry.searchable).map(entry => entry.label),
    ['Theme: light', 'Theme: dark', 'Theme: matrix']);
  assert.equal(f.shortcuts.get(Switcher.themeActionId('light')).defaultShortcut, null);
  assert.equal(f.shortcuts.execute(Switcher.themeActionId('light')), true);
  assert.deepEqual(events, ['dark', 'matrix', 'light']);
  assert.equal(f.document.listeners.get('keydown').size, 1);
  view.destroy();
  assert.equal(f.shortcuts.get(Switcher.shortcutId), null);
  assert.equal(f.document.listeners.get('keydown').size, 0);
});

test('removing a binding retains the Search action; unavailable themes do not consume keyboard events', () => {
  const f = fixture(), view = Switcher.create(f);
  f.shortcuts.set(Switcher.shortcutId, null);
  assert.equal(f.press(), false);
  assert.equal(f.shortcuts.get(Switcher.themeActionId('dark')).searchable, true);
  assert.equal(f.shortcuts.execute(Switcher.themeActionId('dark')), true);
  assert.equal(f.themes.getState().theme, 'dark');
  f.setThemes([{ id: 'dark', label: 'Dark', base: 'dark' }]);
  f.shortcuts.reset(Switcher.shortcutId);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).enabled, false);
  assert.equal(f.shortcuts.get(Switcher.themeActionId('dark')).enabled, false);
  assert.equal(f.shortcuts.execute(Switcher.themeActionId('dark')), false);
  assert.equal(f.shortcuts.execute(Switcher.shortcutId), false);
  assert.equal(f.press(), false);
  assert.equal(f.selections(), 1);
  f.setThemes([]);
  assert.equal(view.next(), false);
  view.destroy();
});

test('multiple owners share one action and release it only after the last destruction', () => {
  const f = fixture();
  const first = Switcher.create({ ...f, shortcut: 'Mod+J' });
  const second = Switcher.create({ ...f, shortcut: 'Alt+T' });
  assert.equal(f.shortcuts.list().length, 4);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, 'Mod+J');
  f.shortcuts.execute(Switcher.shortcutId);
  assert.equal(f.selections(), 1);
  first.destroy(); first.destroy();
  assert.equal(first.select('matrix'), false);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, 'Alt+T');
  assert.equal(f.shortcuts.execute(Switcher.shortcutId), true);
  assert.equal(f.selections(), 2);
  second.destroy();
  assert.equal(f.shortcuts.list().length, 0);
});

test('defaults never replace saved bindings and preferences survive controller recreation', () => {
  const f = fixture();
  f.shortcuts.configure({ [Switcher.shortcutId]: 'Mod+P' });
  const first = Switcher.create(f);
  first.setDefaultShortcut('Alt+T');
  assert.equal(f.shortcuts.get(Switcher.shortcutId).defaultShortcut, 'Alt+T');
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, 'Mod+P');
  first.destroy();
  const second = Switcher.create(f);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, 'Mod+P');
  f.shortcuts.reset(Switcher.shortcutId);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, Switcher.defaultShortcut);
  second.setDefaultShortcut(null);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).shortcut, null);
  assert.equal(f.shortcuts.get(Switcher.shortcutId).enabled, true);
  second.destroy();
});

test('a rejected theme selection is not treated as a handled action', () => {
  const f = fixture();
  f.themes.select = () => false;
  const view = Switcher.create(f);
  assert.equal(f.shortcuts.execute(Switcher.shortcutId), false);
  assert.equal(f.shortcuts.execute(Switcher.themeActionId('dark')), false);
  assert.equal(f.press(), false);
  assert.equal(view.select('unknown'), false);
  view.destroy();
});

test('Search actions track added, renamed and removed themes without losing per-theme shortcut preferences', () => {
  const f = fixture(), view = Switcher.create(f);
  const id = Switcher.themeActionId('ocean');
  const defaults = f.themes.getState().themes;
  f.setThemes([...defaults, { id: 'ocean', label: 'Ocean UI', base: 'dark' }]);
  assert.equal(f.shortcuts.get(id).label, 'Theme: Ocean UI');
  assert.equal(f.shortcuts.get(id).icon, 'moon');
  f.shortcuts.set(id, 'Alt+O');
  assert.equal(f.shortcuts.execute(id), true);
  assert.equal(f.themes.getState().theme, 'ocean');
  f.setThemes([...defaults, { id: 'ocean', label: 'Blue Ocean', base: 'light' }]);
  assert.equal(f.shortcuts.get(id).label, 'Theme: Blue Ocean');
  assert.equal(f.shortcuts.get(id).shortcut, 'Alt+O');
  f.setThemes(defaults);
  assert.equal(f.shortcuts.get(id), null);
  assert.equal(f.shortcuts.execute(id), false);
  f.setThemes([...defaults, { id: 'ocean', label: 'Ocean UI', base: 'dark' }]);
  assert.equal(f.shortcuts.get(id).shortcut, 'Alt+O');
  view.destroy();
  assert.equal(f.shortcuts.list().length, 0);
});
