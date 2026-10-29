const { test } = require('node:test');
const assert = require('node:assert/strict');
const Shortcuts = require('../shortcuts.js');
const Tool = require('../tool.js');
const Themes = require('../../../foundations/themes.js');
const Field = require('../../form/field.js');
const Button = require('../../buttons/buttons.js');
const { Document } = require('../../../testing/dom-fixture.cjs');
const migrations = [{ id: 'navigation.search', component: 'navigation', key: 'searchShortcut' }];

function setup(themes, document) {
  const shortcuts = Shortcuts.create({ document });
  shortcuts.register({
    id: 'navigation.search',
    group: 'Navigation',
    label: 'Menu search',
    defaultShortcut: 'Mod+F',
    handler() {
      return true;
    },
  });
  const tool = Tool.create({ themes, shortcuts, migrations, Field, Button });
  return { shortcuts, tool };
}

test('migration moves all palette shortcuts including disabled values, retaining unrelated settings', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  themes.setComponentSettings('light', 'navigation', {
    searchEnabled: false,
    searchShortcut: 'Ctrl+Shift+K',
    other: 7,
  });
  themes.setComponentSettings('dark', 'navigation', { searchEnabled: true, searchShortcut: null });
  const { shortcuts, tool } = setup(themes, document);
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+Shift+K');
  assert.deepEqual(themes.getComponentSettings('light', 'navigation'), {
    searchEnabled: false,
    other: 7,
  });
  assert.equal(
    themes.getComponentSettings('light', 'shortcuts').bindings['navigation.search'],
    'Mod+Shift+K',
  );
  assert.equal(
    themes.getComponentSettings('dark', 'shortcuts').bindings['navigation.search'],
    null,
  );
  themes.select('dark');
  assert.equal(shortcuts.get('navigation.search').shortcut, null);
  tool.reset('navigation.search');
  themes.select('light');
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+Shift+K');
  tool.destroy();
  shortcuts.destroy();
});

test('central preferences win over legacy including null; copy, export, import, reload and reset preserve scope', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  themes.setComponentSettings('light', 'shortcuts', {
    bindings: { 'navigation.search': null, 'other.action': 'Alt+1' },
  });
  themes.setComponentSettings('light', 'navigation', { searchShortcut: 'Mod+K' });
  const { shortcuts, tool } = setup(themes, document);
  assert.equal(shortcuts.get('navigation.search').shortcut, null);
  const copy = themes.add('Copied');
  assert.equal(shortcuts.get('navigation.search').shortcut, null);
  tool.set('navigation.search', 'Alt+J');
  assert.equal(themes.getComponentSettings(copy, 'shortcuts').bindings['other.action'], 'Alt+1');
  const exported = themes.exportTokens();
  const reloadedThemes = Themes.create({ target: document.createElement('html') });
  reloadedThemes.importTokens(JSON.parse(exported));
  reloadedThemes.select(copy);
  const reloaded = setup(reloadedThemes, document);
  assert.equal(reloaded.shortcuts.get('navigation.search').shortcut, 'Alt+J');
  themes.select('light');
  assert.equal(shortcuts.get('navigation.search').shortcut, null);
  themes.reset('light');
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+F');
  themes.select(copy);
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Alt+J');
  themes.importTokens(JSON.parse(exported));
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Alt+J');
  tool.destroy();
  shortcuts.destroy();
  reloaded.tool.destroy();
  reloaded.shortcuts.destroy();
});

test('catalogue includes late registrations and shared recorder cleans listeners on teardown', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  themes.setComponentSettings('light', 'shortcuts', { bindings: { 'other.action': 'Alt+J' } });
  const { shortcuts, tool } = setup(themes, document);
  const host = document.createElement('div');
  const view = tool.mount(host);
  assert.equal(host.querySelectorAll('input').length, 1);
  const unregister = shortcuts.register({
    id: 'other.action',
    label: 'Other action',
    defaultShortcut: 'Alt+1',
    handler() {
      return true;
    },
  });
  assert.equal(shortcuts.get('other.action').shortcut, 'Alt+J');
  assert.equal(host.querySelectorAll('input').length, 2);
  unregister();
  assert.equal(host.querySelectorAll('input').length, 1);
  const recorder = host.querySelector('input');
  recorder.emit('keydown', { key: 'x', preventDefault() {}, stopPropagation() {} });
  assert.equal(recorder.getAttribute('aria-invalid'), 'true');
  recorder.emit('keydown', { key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(recorder.getAttribute('aria-invalid'), null);
  view.destroy();
  recorder.emit('keydown', { key: 'k', ctrlKey: true, preventDefault() {}, stopPropagation() {} });
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+F');
  assert.equal(host.children.length, 0);
  tool.destroy();
  shortcuts.destroy();
});
