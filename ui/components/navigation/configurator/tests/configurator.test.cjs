const { test } = require('node:test');
const assert = require('node:assert/strict');
const Tool = require('../configurator.js');
const Themes = require('../../../../themes/themes.js');
const Field = require('../../../form/field.js');
const Button = require('../../../buttons/buttons.js');
const Shortcuts = require('../../../shortcuts/shortcuts.js');
const ShortcutsTool = require('../../../shortcuts/configurator/configurator.js');
const { Document } = require('../../../../testing/dom-fixture.cjs');

function sharedShortcuts(document, themes) {
  const registry = Shortcuts.create({ document });
  registry.register({
    id: 'navigation.search',
    label: 'Menu search',
    group: 'Navigation',
    defaultShortcut: 'Mod+F',
    handler() {
      return true;
    },
  });
  registry.register({
    id: 'navigation.toggleSidebar',
    label: 'Toggle sidebar',
    group: 'Navigation',
    defaultShortcut: 'Mod+B',
    handler() {
      return true;
    },
  });
  const shortcuts = ShortcutsTool.create({ themes, shortcuts: registry, Field, Button });
  return { registry, shortcuts };
}

test('Navigation tool uses Form and saves/restores search visibility per selected theme', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  const changes = [];
  const navigation = {
    setSearchEnabled(value) {
      changes.push(value);
    },
  };
  const { registry, shortcuts } = sharedShortcuts(document, themes);
  const tool = Tool.create({ themes, navigation, shortcuts, Field, Button });
  const host = document.createElement('div');
  const view = tool.mount(host);
  const input = host.querySelector('input');
  assert(input.checked);
  assert.equal(input.getAttribute('role'), 'switch');
  input.checked = false;
  input.emit('change');
  assert.equal(changes.at(-1), false);
  assert.equal(themes.getComponentSettings('light', 'navigation').searchEnabled, false);
  themes.select('dark');
  assert(input.checked);
  assert.equal(changes.at(-1), true);
  themes.select('light');
  assert(!input.checked);
  assert.equal(tool.setSearchEnabled('false'), false);
  host.querySelector('button').emit('click');
  assert(input.checked);
  assert.equal(themes.getComponentSettings('light', 'navigation').searchEnabled, true);
  view.destroy();
  assert.equal(host.children.length, 0);
  tool.destroy();
  const count = changes.length;
  themes.select('dark');
  assert.equal(changes.length, count);
  shortcuts.destroy();
  registry.destroy();
});

test('shortcut recording is portable, stored per theme, clearable and reset with defaults', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  const navigation = { setSearchEnabled() {} };
  const { registry, shortcuts } = sharedShortcuts(document, themes);
  const bindings = ['Mod+F'];
  registry.subscribe(() => bindings.push(registry.get('navigation.search').shortcut));
  const tool = Tool.create({ themes, navigation, shortcuts, Field, Button });
  const host = document.createElement('div');
  const view = tool.mount(host);
  const recorder = host.querySelectorAll('input').find((input) => input.type === 'text');
  assert.equal(recorder.value, '⌘ / Ctrl + F');
  let prevented = false;
  recorder.emit('keydown', {
    key: 'k',
    code: 'KeyK',
    ctrlKey: true,
    shiftKey: true,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {},
  });
  assert(prevented);
  assert.equal(bindings.at(-1), 'Mod+Shift+K');
  assert.equal(
    themes.getComponentSettings('light', 'shortcuts').bindings['navigation.search'],
    'Mod+Shift+K',
  );
  assert.equal(themes.getComponentSettings('light', 'navigation'), null);
  themes.select('dark');
  assert.equal(bindings.at(-1), 'Mod+F');
  assert.equal(recorder.value, '⌘ / Ctrl + F');
  assert(tool.setSearchShortcut(null));
  assert.equal(recorder.value, 'Not set');
  themes.select('light');
  assert.equal(recorder.value, '⌘ / Ctrl + Shift + K');
  assert.equal(tool.setSearchShortcut('Shift+K'), false);
  recorder.emit('keydown', { key: 'Backspace', preventDefault() {}, stopPropagation() {} });
  assert.equal(
    themes.getComponentSettings('light', 'shortcuts').bindings['navigation.search'],
    null,
  );
  host.querySelector('button').emit('click');
  assert.equal(bindings.at(-1), 'Mod+F');
  assert.equal(recorder.value, '⌘ / Ctrl + F');
  view.destroy();
  const count = bindings.length;
  recorder.emit('keydown', { key: 'k', ctrlKey: true, preventDefault() {}, stopPropagation() {} });
  assert.equal(bindings.length, count);
  tool.destroy();
  shortcuts.destroy();
  registry.destroy();
});

test('Navigation references the same Form recorder and binding as the Shortcuts catalogue', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  const { registry, shortcuts } = sharedShortcuts(document, themes);
  const tool = Tool.create({
    themes,
    navigation: { setSearchEnabled() {} },
    shortcuts,
    Field,
    Button,
  });
  const navHost = document.createElement('div');
  const catalogueHost = document.createElement('div');
  const navView = tool.mount(navHost);
  const catalogueView = shortcuts.mount(catalogueHost);
  const navInput = navHost.querySelectorAll('input').find((input) => input.type === 'text');
  const centralInput = catalogueHost.querySelector('input');
  const press = (input, key, modifiers = {}) =>
    input.emit('keydown', {
      key,
      ...modifiers,
      preventDefault() {},
      stopPropagation() {},
    });
  press(centralInput, 'k', { ctrlKey: true });
  assert.equal(navInput.value, '⌘ / Ctrl + K');
  press(navInput, 'j', { metaKey: true, shiftKey: true });
  assert.equal(centralInput.value, '⌘ / Ctrl + Shift + J');
  press(centralInput, 'Delete');
  assert.equal(navInput.value, 'Not set');
  catalogueHost.querySelector('button').emit('click');
  assert.equal(navInput.value, '⌘ / Ctrl + F');
  themes.select('dark');
  press(navInput, 'l', { ctrlKey: true });
  themes.select('light');
  assert.equal(navInput.value, '⌘ / Ctrl + F');
  assert.equal(centralInput.value, '⌘ / Ctrl + F');
  themes.select('dark');
  assert.equal(centralInput.value, '⌘ / Ctrl + L');
  navHost.querySelector('button').emit('click');
  assert.equal(centralInput.value, '⌘ / Ctrl + F');
  assert.equal(
    navHost.querySelector('.shortcuts-recorder').dataset.shortcutId,
    'navigation.search',
  );
  assert.equal(themes.getComponentSettings('dark', 'navigation').searchShortcut, undefined);
  navView.destroy();
  catalogueView.destroy();
  tool.destroy();
  shortcuts.destroy();
  registry.destroy();
});

test('sidebar recorder edits one shared per-theme binding in Navigation and Shortcuts', () => {
  const document = new Document();
  const themes = Themes.create({ target: document.createElement('html') });
  const { registry, shortcuts } = sharedShortcuts(document, themes);
  const tool = Tool.create({
    themes,
    navigation: { setSearchEnabled() {} },
    shortcuts,
    Field,
    Button,
  });
  const navHost = document.createElement('div');
  const catalogueHost = document.createElement('div');
  const navView = tool.mount(navHost);
  const catalogueView = shortcuts.mount(catalogueHost);
  const recorder = (host) =>
    host
      .querySelectorAll('.shortcuts-recorder')
      .find((field) => field.dataset.shortcutId === 'navigation.toggleSidebar')
      .querySelector('input');
  const navInput = recorder(navHost);
  const centralInput = recorder(catalogueHost);
  assert.equal(navInput.value, '⌘ / Ctrl + B');
  centralInput.emit('keydown', {
    key: 'm',
    ctrlKey: true,
    shiftKey: true,
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(navInput.value, '⌘ / Ctrl + Shift + M');
  assert.equal(
    themes.getComponentSettings('light', 'shortcuts').bindings['navigation.toggleSidebar'],
    'Mod+Shift+M',
  );
  assert.equal(tool.getState().sidebarShortcut, 'Mod+Shift+M');
  themes.select('dark');
  assert.equal(navInput.value, '⌘ / Ctrl + B');
  tool.setSidebarShortcut(null);
  assert.equal(centralInput.value, 'Not set');
  themes.select('light');
  assert.equal(centralInput.value, '⌘ / Ctrl + Shift + M');
  navHost.querySelector('button').emit('click');
  assert.equal(centralInput.value, '⌘ / Ctrl + B');
  assert.equal(tool.setSidebarShortcut('Shift+B'), false);
  themes.select('dark');
  assert.equal(centralInput.value, 'Not set');
  navView.destroy();
  catalogueView.destroy();
  tool.destroy();
  shortcuts.destroy();
  registry.destroy();
});
