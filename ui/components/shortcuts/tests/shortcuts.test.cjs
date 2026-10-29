const { test } = require('node:test');
const assert = require('node:assert/strict');
const Shortcuts = require('../shortcuts.js');
const { Document } = require('../../../testing/dom-fixture.cjs');

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
  assert.equal(shortcuts.set(action.id, 'Shift+K'), false);
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
