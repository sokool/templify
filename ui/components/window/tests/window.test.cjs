const { test } = require('node:test');
const assert = require('node:assert/strict');
const Window = require('../window.js');
const { createWindowFixture, pointer } = require('../../../testing/window-fixture.cjs');

function setup(t, options = {}) {
  const fixture = createWindowFixture();
  const view = Window.mount(fixture.element, options);
  t.after(() => view.destroy());
  return { ...fixture, view, grip: view.element.querySelector('.ds-window-resize') };
}

test('scroll-unlocked windows use show, not showModal, and do not lock the page', (t) => {
  const { view, document, grip } = setup(t, { lockScroll: false });
  assert.equal(grip.hidden, true);
  view.open();
  assert.equal(view.element.modal, false);
  assert.equal(view.element.getAttribute('aria-modal'), 'false');
  assert.equal(document.documentElement.style.overflow, undefined);
  document.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(view.isOpen(), false);
});

test('blocking can change while open without dismissal, lost content, focus or leaked locks', (t) => {
  let closes = 0;
  const { view, document } = setup(t, { onClose() { closes++; } });
  const input = document.createElement('input');
  input.value = 'Keep me';
  view.update({ content: input });
  view.open();
  input.focus();
  view.update({ lockScroll: false });
  assert.equal(view.element.modal, false);
  assert.equal(document.documentElement.style.overflow, undefined);
  assert.equal(document.activeElement, input);
  view.update({ lockScroll: true });
  assert.equal(view.element.modal, true);
  assert.equal(document.documentElement.style.overflow, 'hidden');
  assert.equal(closes, 0);
  assert.equal(input.value, 'Keep me');
  view.close();
  assert.equal(closes, 1);
  assert.equal(document.documentElement.style.overflow, undefined);
});

test('manual popup resize commits dimensions once; programmatic and viewport changes do not notify', (t) => {
  const changes = [];
  const { view, grip, window } = setup(t, { resizable: true, onResize: size => changes.push(size) });
  const subscriptions = [];
  const off = view.subscribeResize(size => subscriptions.push(size));
  view.open();
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 150, 130);
  assert.deepEqual(view.getSize(), { width: 340, height: 340 });
  assert.equal(changes.length, 0);
  pointer(grip, 'pointerup', 150, 130);
  assert.deepEqual(changes, [{ width: 340, height: 340 }]);
  assert.deepEqual(subscriptions, changes);
  view.update({ width: 600 });
  window.emit('resize');
  assert.equal(changes.length, 1);
  off();
  view.destroy();
  assert.equal(grip.listeners.get('pointerdown').size, 0);
});

test('right/left panels resize from their inner edge and keep full-height layout', (t) => {
  for (const side of ['right', 'left']) {
    const changes = [];
    const { view, grip } = setup(t, { mode: 'side', side, resizable: true, onResize: size => changes.push(size) });
    view.open();
    pointer(grip, 'pointerdown', 100, 100);
    pointer(grip, 'pointermove', side === 'right' ? 0 : 200, 500);
    pointer(grip, 'pointerup', side === 'right' ? 0 : 200, 500);
    assert.deepEqual(changes, [{ width: 340, height: null }]);
  }
});

test('cancel, capture loss, disabling resize and destroy abandon unfinished gestures', (t) => {
  for (const action of ['pointercancel', 'lostpointercapture', 'disable', 'destroy']) {
    const changes = [];
    const { view, grip } = setup(t, { resizable: true, onResize: size => changes.push(size) });
    view.open();
    pointer(grip, 'pointerdown', 100, 100);
    pointer(grip, 'pointermove', 150, 130);
    if (action === 'disable') view.update({ resizable: false });
    else if (action === 'destroy') view.destroy();
    else grip.emit(action);
    assert.deepEqual(view.getSize(), { width: 480, height: null });
    assert.equal(changes.length, 0);
  }
});

test('resize is bounded and keyboard-accessible; disabled resize ignores gestures', (t) => {
  const changes = [];
  const { view, grip, window } = setup(t, { resizable: true, onResize: size => changes.push(size) });
  window.innerWidth = 800;
  window.innerHeight = 600;
  view.open();
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 5000, 5000);
  pointer(grip, 'pointerup', 5000, 5000);
  assert.deepEqual(view.getSize(), { width: 768, height: 568 });
  grip.emit('keydown', { key: 'ArrowRight', shiftKey: true, preventDefault() {}, stopPropagation() {} });
  assert.equal(view.getSize().width, 290); // Fixture box 240 + 50.
  view.update({ resizable: false });
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 200, 200);
  pointer(grip, 'pointerup', 200, 200);
  assert.equal(changes.length, 2);
});

test('only the topmost nonmodal window handles Escape; remaining modal locks stay intact', (t) => {
  const { view, document, element } = setup(t);
  view.open();
  const other = Window.mount(element, { lockScroll: false, duration: 0 });
  t.after(() => other.destroy());
  other.open();
  document.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(other.isOpen(), false);
  assert.equal(view.isOpen(), true);
  assert.equal(document.documentElement.style.overflow, 'hidden');
  view.destroy();
  assert.equal(document.documentElement.style.overflow, undefined);
});

test('queued native close events during mode switches do not duplicate callbacks or leak scroll locks', (t) => {
  let closes = 0;
  const { view, document } = setup(t, { onClose() { closes++; } });
  const pending = [];
  view.element.close = reason => {
    view.element.open = false;
    view.element.returnValue = reason;
    pending.push(() => view.element.emit('close'));
  };
  view.open();
  view.update({ lockScroll: false });
  view.update({ lockScroll: true });
  view.close();
  assert.equal(document.documentElement.style.overflow, undefined);
  pending.splice(0).forEach(deliver => deliver());
  assert.equal(closes, 1);
  view.open();
  view.close();
  view.open(); // Reopen before the native close task runs.
  pending.splice(0).forEach(deliver => deliver());
  assert.equal(document.documentElement.style.overflow, 'hidden');
  view.destroy();
  assert.equal(document.documentElement.style.overflow, undefined);
});
