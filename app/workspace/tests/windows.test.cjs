const { test } = require('node:test');
const assert = require('node:assert/strict');
const Windows = require('../windows.js');
const Window = require('../../../ui/components/window/window.js');
const Settings = require('../../storage/settings.js');
const { createWindowFixture, pointer } = require('../../../ui/testing/window-fixture.cjs');

test('sizes persist per window/user, survive reload and remain outside template exports', () => {
  const stored = new Map(), storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  const { element } = createWindowFixture();
  let settings = Settings.create({ storage }), windows = Windows.create({ settings, Window });
  let a = windows.mount(element, 'kanban.used-components', { mode: 'side' });
  const b = windows.mount(element, 'window.preview');
  a.open();
  const grip = a.element.querySelector('.ds-window-resize');
  pointer(grip, 'pointerdown', 100);
  pointer(grip, 'pointermove', -200);
  pointer(grip, 'pointerup', -200);
  assert.deepEqual(settings.get('preview.windows.kanban.used-components.size'), { width: 540, height: null });
  assert.deepEqual(b.getSize(), { width: 480, height: null });
  assert(!settings.exportJSON().includes('used-components'));
  assert(settings.exportJSON({ template: false }).includes('used-components'));
  a.destroy();
  b.destroy();
  settings = Settings.create({ storage });
  windows = Windows.create({ settings, Window });
  a = windows.mount(element, 'kanban.used-components', { mode: 'side' });
  assert.deepEqual(a.getSize(), { width: 540, height: null });
  a.update({ width: 960 });
  a.restoreSize();
  assert.equal(a.getSize().width, 540);
  a.destroy();
  const anotherUser = Windows.create({ settings: Settings.create(), Window }).mount(element, 'kanban.used-components');
  assert.equal(anotherUser.getSize().width, 480);
  anotherUser.destroy();
});

test('shared behaviour updates existing windows and unsubscription prevents updates after destroy', () => {
  const { element, document } = createWindowFixture(), settings = Settings.create();
  const windows = Windows.create({ settings, Window });
  const a = windows.mount(element, 'a'), b = windows.mount(element, 'b');
  a.open();
  settings.set('components.window.lockScroll', false);
  settings.set('components.window.resizable', false);
  assert.equal(a.element.modal, false);
  assert.equal(a.element.querySelector('.ds-window-resize').hidden, true);
  assert.equal(b.element.querySelector('.ds-window-resize').hidden, true);
  assert.equal(document.documentElement.style.overflow, undefined);
  a.destroy();
  b.destroy();
  settings.set('components.window.lockScroll', true);
  settings.set('components.window.resizable', true);
  assert.equal(document.querySelector('.ds-window'), null);
});

test('malformed stored sizes are ignored, and mounting/programmatic updates do not save a size', () => {
  const { element } = createWindowFixture(), settings = Settings.create();
  for (const size of [null, [], { width: '800', height: -1 }, { width: 999999, height: {} }]) {
    settings.set('preview.windows.a.size', size);
    const view = Windows.create({ settings, Window }).mount(element, 'a');
    assert.deepEqual(view.getSize(), { width: 480, height: null });
    view.destroy();
  }
  const view = Windows.create({ settings, Window }).mount(element, 'b');
  view.update({ width: 900 });
  assert.equal(settings.has('preview.windows.b.size'), false);
  view.destroy();
});

test('explicit nonblocking window options override global scroll settings on mount and live updates', () => {
  const { element, document } = createWindowFixture(), settings = Settings.create();
  settings.set('components.window.lockScroll', true);
  const view = Windows.create({ settings, Window }).mount(element, 'kanban.used-components', {
    mode: 'side', lockScroll: false,
  });
  view.open();
  const assertNonblocking = () => {
    assert.equal(view.element.modal, false);
    assert.equal(view.element.getAttribute('aria-modal'), 'false');
    assert.equal(document.documentElement.style.overflow, undefined);
  };
  assertNonblocking();
  settings.set('components.window.lockScroll', false);
  settings.set('components.window.lockScroll', true);
  settings.set('components.window.resizable', false);
  assertNonblocking();
  assert.equal(view.element.querySelector('.ds-window-resize').hidden, true);
  view.destroy();
});
