const { test } = require('node:test');
const assert = require('node:assert/strict');
const Shortcuts = require('../shortcuts.js');
const { Document } = require('../../../testing/dom-fixture.cjs');

function keyboard(target) {
  return (type, key, modifiers = {}) => {
    let prevented = false, stopped = false;
    target.emit(type, {
      key,
      ...modifiers,
      preventDefault() { this.defaultPrevented = true; prevented = true; },
      stopPropagation() { stopped = true; },
    });
    return { prevented, stopped };
  };
}

test('an action-filtered recorder edits the shared catalogue without displaying unrelated actions', () => {
  const document = new Document(), host = document.createElement('section');
  const shortcuts = Shortcuts.create({ document });
  shortcuts.register({ id: 'theme.next', label: 'Next theme', handler: () => true, defaultShortcut: 'Alt+T' });
  shortcuts.register({ id: 'other.action', handler: () => true });
  const editor = Shortcuts.mount(host, { shortcuts, actionIds: ['theme.next'] });
  const inputs = host.querySelectorAll('input');
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].getAttribute('aria-label'), 'Next theme');
  keyboard(inputs[0])('keydown', 'j', { ctrlKey: true });
  assert.equal(shortcuts.get('theme.next').shortcut, 'Mod+J');
  assert.equal(shortcuts.list().length, 2);
  editor.destroy();
  assert.equal(shortcuts.execute('other.action'), true);
});

test('all modifier combinations support letters/digits, and two or more modifiers work without a character', () => {
  const modifiers = ['Mod', 'Alt', 'Shift'];
  for (let mask = 1; mask < 8; mask++) {
    const parts = modifiers.filter((_, index) => mask & (1 << index));
    const value = parts.join('+'), reversed = [...parts].reverse();
    assert.equal(Shortcuts.normalise(reversed.join('+')), parts.length > 1 ? value : null);
    for (const key of ['k', '9']) {
      assert.equal(Shortcuts.normalise([...reversed, key].join('+')), value + '+' + key.toUpperCase());
    }
  }
  for (const alias of ['Ctrl', 'Control', 'Cmd', 'Command', 'Meta']) {
    assert.equal(Shortcuts.normalise(alias + '+Shift'), 'Mod+Shift');
    assert.equal(Shortcuts.normalise(alias + '+Alt+Shift+K'), 'Mod+Alt+Shift+K');
  }
  assert.equal(Shortcuts.normalise(' option + shift '), 'Alt+Shift');
  for (const value of ['K', 'Ctrl+Cmd', 'Mod+Mod', 'Shift+Shift+K', 'Mod+Escape', 'Alt+', '', null, 12]) {
    assert.equal(Shortcuts.normalise(value), null);
  }
  assert.equal(Shortcuts.format('Mod+Alt+Shift'), '⌘ / Ctrl + Alt + Shift');
  assert.equal(Shortcuts.aria('Mod+Shift'), 'Control+Shift Meta+Shift');
  assert.equal(Shortcuts.aria('Alt+Shift'), 'Alt+Shift');
});

test('keyboard events preserve portable modifiers, physical letters and shifted digits', () => {
  assert.equal(Shortcuts.fromEvent({ key: 'Shift', ctrlKey: true, shiftKey: true }), 'Mod+Shift');
  assert.equal(Shortcuts.fromEvent({ key: 'Meta', metaKey: true, altKey: true }), 'Mod+Alt');
  assert.equal(Shortcuts.fromEvent({ key: 'Alt', altKey: true, shiftKey: true }), 'Alt+Shift');
  assert.equal(Shortcuts.fromEvent({ key: 'Shift', shiftKey: true }), null);
  assert.equal(Shortcuts.fromEvent({ key: 'K', code: 'KeyK', shiftKey: true }), 'Shift+K');
  assert.equal(Shortcuts.fromEvent({ key: '!', code: 'Digit1', shiftKey: true }), 'Shift+1');
  assert.equal(Shortcuts.fromEvent({ key: '˚', code: 'KeyK', metaKey: true, altKey: true }), 'Mod+Alt+K');
  assert.equal(Shortcuts.fromEvent({ key: 'Shift', ctrlKey: true, shiftKey: true, isComposing: true }), null);
  assert.equal(Shortcuts.fromEvent({ key: 'Alt', ctrlKey: true, altKey: true, getModifierState: () => true }), null);
});

test('one dispatcher resolves the current binding and only prevents successfully handled actions', () => {
  const document = new Document();
  const shortcuts = Shortcuts.create({ document });
  let enabled = true,
    success = true,
    calls = 0;
  const unregister = shortcuts.register({
    id: 'test.search',
    label: 'Search',
    defaultShortcut: 'Mod+F',
    enabled: () => enabled,
    handler() {
      calls++;
      return success;
    },
  });
  shortcuts.register({
    id: 'test.other',
    defaultShortcut: 'Alt+1',
    handler() {
      return true;
    },
  });
  assert.equal(document.listeners.get('keydown').size, 1);
  assert.equal(document.listeners.get('keyup').size, 1);
  let prevented = 0;
  const press = (event = {}) =>
    document.emit('keydown', {
      key: 'f',
      ctrlKey: true,
      preventDefault() {
        prevented++;
      },
      ...event,
    });
  press();
  press({ ctrlKey: false, metaKey: true });
  assert.equal(prevented, 2);
  press({ shiftKey: true });
  press({ defaultPrevented: true });
  press({ isComposing: true });
  assert.equal(calls, 2);
  enabled = false;
  press();
  assert.equal(calls, 2);
  enabled = true;
  success = false;
  press();
  assert.equal(prevented, 2);
  success = true;
  assert(shortcuts.set('test.search', 'Ctrl+Shift+K'));
  press();
  press({ key: 'k', shiftKey: true });
  assert.equal(prevented, 3);
  assert(shortcuts.set('test.search', null));
  press({ key: 'k', shiftKey: true });
  assert.equal(prevented, 3);
  shortcuts.reset('test.search');
  assert.equal(shortcuts.get('test.search').shortcut, 'Mod+F');
  unregister();
  press();
  assert.equal(prevented, 3);
  assert.equal(shortcuts.get('test.search'), null);
  shortcuts.destroy();
  assert.equal(document.listeners.get('keydown').size, 0);
  assert.equal(document.listeners.get('keyup').size, 0);
});

test('catalogue validates IDs and bindings, snapshots do not mutate registry state', () => {
  const shortcuts = Shortcuts.create();
  const action = {
    id: 'test.action',
    defaultShortcut: 'Mod+F',
    handler() {
      return true;
    },
  };
  shortcuts.register(action);
  assert.throws(() => shortcuts.register(action), /unique/);
  assert.throws(
    () => shortcuts.register({ ...action, id: 'invalid', defaultShortcut: 'F' }),
    /Invalid/,
  );
  assert.equal(shortcuts.set('missing', 'Mod+K'), false);
  assert.equal(shortcuts.set(action.id, 'Shift'), false);
  shortcuts.list()[0].shortcut = 'Mod+K';
  assert.equal(shortcuts.get(action.id).shortcut, 'Mod+F');
  shortcuts.configure({ [action.id]: null });
  assert.equal(shortcuts.get(action.id).shortcut, null);
  shortcuts.configure({ [action.id]: 'invalid' });
  assert.equal(shortcuts.get(action.id).shortcut, 'Mod+F');
  shortcuts.configure({ [action.id]: 'Alt+K' });
  assert.equal(shortcuts.get(action.id).shortcut, 'Alt+K');
  shortcuts.configure();
  assert.equal(shortcuts.get(action.id).shortcut, 'Mod+F');
  shortcuts.destroy();
});

test('one document shares its catalogue and dispatcher independently of component lifetimes', () => {
  const document = new Document();
  const first = Shortcuts.create({ document }), second = Shortcuts.create({ document });
  assert.equal(first, second);
  const action = { id: 'navigation.search', defaultShortcut: 'Mod+F', handler: () => true };
  const unregister = first.register(action);
  assert.equal(document.listeners.get('keydown').size, 1);
  assert.equal(document.listeners.get('keyup').size, 1);
  second.set(action.id, 'Mod+K');
  unregister();
  assert.equal(document.listeners.get('keydown').size, 0);
  assert.equal(document.listeners.get('keyup').size, 0);
  const off = first.register(action);
  assert.equal(second.get(action.id).shortcut, 'Mod+K');
  assert.equal(document.listeners.get('keydown').size, 1);
  off();
  first.destroy();
  assert.equal(document.listeners.get('keyup').size, 0);
  const replacement = Shortcuts.create({ document });
  assert.notEqual(replacement, first);
  first.destroy();
  assert.equal(Shortcuts.create({ document }), replacement);
  replacement.destroy();
});

test('declared defaults respect saved preferences, including preferences loaded before registration', () => {
  const shortcuts = Shortcuts.create();
  shortcuts.configure({ 'navigation.search': 'Mod+J' });
  const off = shortcuts.register({ id: 'navigation.search', defaultShortcut: 'Mod+K', handler: () => true });
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+J');
  shortcuts.setDefault('navigation.search', 'Mod+L');
  assert.equal(shortcuts.get('navigation.search').defaultShortcut, 'Mod+L');
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+J');
  shortcuts.reset('navigation.search');
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+L');
  shortcuts.setDefault('navigation.search', 'Mod+K');
  assert.equal(shortcuts.get('navigation.search').shortcut, 'Mod+K');
  shortcuts.set('navigation.search', null);
  shortcuts.setDefault('navigation.search', 'Mod+F');
  assert.equal(shortcuts.get('navigation.search').shortcut, null);
  assert.equal(shortcuts.setDefault('navigation.search', 'F'), false);
  off();
  shortcuts.destroy();
});

test('modifier-only actions run once on release, accept Cmd or Ctrl and do not trigger prefixes', () => {
  const document = new Document();
  const shortcuts = Shortcuts.create({ document });
  const calls = [];
  for (const shortcut of ['Mod+Shift', 'Mod+Alt+Shift', 'Alt+Shift', 'Mod+Shift+K', 'Shift+K']) {
    shortcuts.register({ id: shortcut, defaultShortcut: shortcut, handler: () => { calls.push(shortcut); return true; } });
  }
  const press = keyboard(document);
  for (const key of ['Control', 'Meta']) {
    const mod = key === 'Control' ? { ctrlKey: true } : { metaKey: true };
    press('keydown', key, mod);
    assert.equal(press('keydown', 'Shift', { ...mod, shiftKey: true }).prevented, false);
    assert.equal(calls.length, key === 'Control' ? 0 : 1);
    assert.equal(press('keyup', 'Shift', mod).prevented, true);
    press('keyup', key);
  }
  assert.deepEqual(calls, ['Mod+Shift', 'Mod+Shift']);

  press('keydown', 'Shift', { shiftKey: true });
  press('keydown', 'Control', { ctrlKey: true, shiftKey: true });
  press('keydown', 'Alt', { ctrlKey: true, altKey: true, shiftKey: true });
  press('keyup', 'Control', { altKey: true, shiftKey: true });
  press('keyup', 'Alt', { shiftKey: true });
  press('keyup', 'Shift');
  assert.deepEqual(calls, ['Mod+Shift', 'Mod+Shift', 'Mod+Alt+Shift']);

  press('keydown', 'Alt', { altKey: true });
  press('keydown', 'Shift', { altKey: true, shiftKey: true });
  press('keyup', 'Alt', { shiftKey: true });
  press('keyup', 'Shift');
  assert.equal(calls.at(-1), 'Alt+Shift');

  press('keydown', 'Control', { ctrlKey: true });
  press('keydown', 'Shift', { ctrlKey: true, shiftKey: true });
  press('keydown', 'k', { ctrlKey: true, shiftKey: true });
  press('keyup', 'k', { ctrlKey: true, shiftKey: true });
  press('keyup', 'Shift', { ctrlKey: true });
  press('keyup', 'Control');
  assert.deepEqual(calls, ['Mod+Shift', 'Mod+Shift', 'Mod+Alt+Shift', 'Alt+Shift', 'Mod+Shift+K']);

  press('keydown', 'Shift', { shiftKey: true });
  press('keydown', 'K', { shiftKey: true });
  press('keyup', 'K', { shiftKey: true });
  press('keyup', 'Shift');
  assert.equal(calls.at(-1), 'Shift+K');
  shortcuts.destroy();
});

test('modifier sequences cancel on other keys, ignored events and window blur, and detach cleanly', () => {
  const document = new Document();
  document.defaultView = new Document();
  const shortcuts = Shortcuts.create({ document });
  let calls = 0, enabled = true, success = true;
  const unregister = shortcuts.register({
    id: 'test.modifiers',
    defaultShortcut: 'Mod+Shift',
    enabled: () => enabled,
    handler() { calls++; return success; },
  });
  const press = keyboard(document);
  const start = (extra = {}) => {
    press('keydown', 'Control', { ctrlKey: true });
    press('keydown', 'Shift', { ctrlKey: true, shiftKey: true, ...extra });
  };
  const end = (extra = {}) => {
    const result = press('keyup', 'Control', { shiftKey: true, ...extra });
    press('keyup', 'Shift');
    return result.prevented;
  };
  for (const key of ['Escape', 'Tab', 'ArrowLeft', 'k']) {
    start();
    press('keydown', key, { ctrlKey: true, shiftKey: true });
    press('keyup', key, { ctrlKey: true, shiftKey: true });
    assert.equal(end(), false);
  }
  for (const extra of [{ defaultPrevented: true }, { isComposing: true }, { getModifierState: () => true }]) {
    start(extra);
    assert.equal(end(), false);
    start();
    assert.equal(end(extra), false);
  }
  start();
  document.defaultView.emit('blur');
  assert.equal(end(), false);
  enabled = false;
  start();
  assert.equal(end(), false);
  assert.equal(calls, 0);
  enabled = true;
  success = false;
  start();
  assert.equal(end(), false);
  assert.equal(calls, 1);
  success = true;
  start();
  assert.equal(end(), true);
  assert.equal(calls, 2);

  start();
  unregister();
  assert.equal(document.listeners.get('keydown').size, 0);
  assert.equal(document.listeners.get('keyup').size, 0);
  assert.equal(document.defaultView.listeners.get('blur').size, 0);
  shortcuts.register({ id: 'test.modifiers', defaultShortcut: 'Mod+Shift', handler: () => { calls++; return true; } });
  assert.equal(end(), false);
  assert.equal(calls, 2);
  shortcuts.destroy();
  assert.equal(document.defaultView.listeners.get('blur').size, 0);
});

test('recorder saves modifier-only chords on release, not intermediate combinations, and cleans up', () => {
  const document = new Document();
  const shortcuts = Shortcuts.create({ document });
  shortcuts.register({ id: 'test.action', defaultShortcut: 'Mod+K', handler: () => true });
  const host = document.createElement('section'), changes = [];
  const editor = Shortcuts.mount(host, { shortcuts, onChange: (change) => changes.push(change) });
  const input = host.querySelector('input'), error = host.querySelector('[role=status]');
  const press = keyboard(input);
  assert.equal(input.value, '⌘ / Ctrl + K');

  press('keydown', 'Control', { ctrlKey: true });
  press('keydown', 'Shift', { ctrlKey: true, shiftKey: true });
  press('keydown', 'Alt', { ctrlKey: true, altKey: true, shiftKey: true });
  assert.equal(changes.length, 0);
  assert.equal(press('keyup', 'Alt', { ctrlKey: true, shiftKey: true }).prevented, true);
  press('keyup', 'Shift', { ctrlKey: true });
  press('keyup', 'Control');
  assert.equal(input.value, '⌘ / Ctrl + Alt + Shift');
  assert.equal(changes.length, 1);

  press('keydown', 'Meta', { metaKey: true });
  press('keydown', 'Shift', { metaKey: true, shiftKey: true });
  press('keydown', 'K', { metaKey: true, shiftKey: true });
  press('keyup', 'K', { metaKey: true, shiftKey: true });
  press('keyup', 'Meta', { shiftKey: true });
  press('keyup', 'Shift');
  assert.equal(input.value, '⌘ / Ctrl + Shift + K');
  assert.equal(changes.length, 2);
  press('keydown', 'K', { shiftKey: true });
  press('keyup', 'K', { shiftKey: true });
  press('keyup', 'Shift');
  assert.equal(input.value, 'Shift + K');

  press('keydown', 'k');
  assert.match(error.textContent, /Shift/);
  press('keyup', 'k');
  const saved = changes.length;
  press('keydown', 'Control', { ctrlKey: true });
  press('keydown', 'Shift', { ctrlKey: true, shiftKey: true });
  input.emit('blur');
  press('keyup', 'Shift', { ctrlKey: true });
  press('keyup', 'Control');
  assert.equal(changes.length, saved);

  press('keydown', 'Backspace');
  press('keyup', 'Backspace');
  assert.equal(shortcuts.get('test.action').shortcut, null);
  assert.equal(input.value, 'Not set');
  host.querySelector('button').emit('click');
  assert.equal(input.value, '⌘ / Ctrl + K');
  assert.equal(error.textContent, '');
  editor.destroy();
  for (const type of ['keydown', 'keyup', 'blur']) assert.equal(input.listeners.get(type).size, 0);
  shortcuts.destroy();
});
