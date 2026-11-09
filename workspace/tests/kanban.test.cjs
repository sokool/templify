const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createWindowFixture } = require('../../ui/testing/window-fixture.cjs');
const Settings = require('../../storage/settings.js');
const Windows = require('../windows.js');
const Window = require('../../ui/components/window/window.js');

// Retains the user's no-add-button/hidden-toolbar regression from the old
// configurator test. Only obsolete configurator expectations were removed.
test('Kanban preview has no configurator or add toolbar and disposes its side panel', () => {
  const { element, document } = createWindowFixture();
  const settings = Settings.create();
  settings.set('components.window.lockScroll', true);
  const context = {
    DesignSystemCard: require('../../ui/components/card/card.js'),
    DesignSystemKanbanBoard: require('../../ui/components/kanban-board/kanban-board.js'),
    DesignSystemButtons: require('../../ui/components/buttons/buttons.js'),
    DesignSystemWindow: Window,
  };
  for (const file of ['kanban-data.js', 'kanban.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  let device;
  const options = { document, windows: Windows.create({ settings, Window }), icons: { svg: () => '' },
    getDevice: () => 'desktop', subscribeDevice(listener) { device = listener; return () => { device = null; }; } };
  let view = context.ExampleKanban.mount(element, options);
  const edgeTabs = document.querySelector('.component-page-edge-tabs'), trigger = edgeTabs.querySelector('button');
  const panel = document.querySelector('.ds-window');
  assert.equal(element.querySelector('.example-kanban-add'), null);
  assert.equal(element.querySelector('.ds-kanban__toolbar').hidden, true);
  assert.equal(element.querySelectorAll('.ds-card').length, 19);
  assert.equal(element.querySelector('.kanban-board-tool'), null);
  assert.equal(edgeTabs.parentNode, document.body);
  assert.equal(panel.dataset.mode, 'side');
  assert.equal(panel.dataset.side, 'right');
  assert.equal(trigger.getAttribute('aria-controls'), panel.id);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  const open = () => { trigger.focus(); trigger.emit('click'); assert.equal(panel.open, true); assert.equal(panel.modal, false); assert.equal(trigger.getAttribute('aria-expanded'), 'true'); };
  const closed = () => { assert.equal(panel.open, false); assert.equal(document.activeElement, trigger); assert.equal(trigger.getAttribute('aria-expanded'), 'false'); };
  open(); document.emit('keydown', { key: 'Escape', preventDefault() {} }); closed();
  open(); panel.querySelector('button').emit('click'); closed();
  open(); document.emit('pointerdown', { target: element, clientX: 0, clientY: 0 }); document.emit('pointerup', { target: element, clientX: 0, clientY: 0 }); assert.equal(panel.open, true);
  panel.querySelector('.kanban-used-components').querySelector('ul').emit('click', { target: panel.querySelector('a') }); closed();
  device('mobile');
  open(); view.destroy();
  assert.equal(document.documentElement.style.overflow, undefined);
  assert.equal(document.querySelector('.component-page-edge-tabs'), null);
  assert.equal(document.querySelector('.ds-window'), null);
  assert.equal(document.querySelectorAll('.ds-card-menu').length, 0);
  assert.equal(trigger.listeners.get('click').size, 0);
  assert.equal(device, null);
  view = context.ExampleKanban.mount(element, options);
  assert.equal(document.querySelectorAll('.component-page-edge-tabs').length, 1);
  assert.equal(document.querySelector('.ds-window').open, false);
  view.destroy();
  assert.equal(element.children.length, 0);
});
