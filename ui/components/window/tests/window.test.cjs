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

test('six named sizes set the active extent and explicit dimensions override presets', (t) => {
  for (const [size, extent] of Object.entries({ xs: 320, sm: 400, md: 480, lg: 640, xl: 800 })) {
    const { view } = setup(t, { size });
    assert.deepEqual(view.getSize(), { width: extent, height: null });
    assert.equal(view.element.dataset.size, size);
    view.update({ mode: 'side', side: 'top' });
    assert.deepEqual(view.getSize(), { width: extent, height: extent });
    view.update({ side: 'bottom' });
    assert.equal(view.element.dataset.side, 'bottom');
    view.update({ side: 'left' });
    assert.deepEqual(view.getSize(), { width: extent, height: null });
    view.update({ width: 560 });
    assert.equal(view.element.dataset.size, 'custom');
    assert.equal(view.getSize().width, 560);
    view.update({ size });
    assert.equal(view.getSize().width, extent);
  }
  const { view } = setup(t, { size: 'lg', width: 520, height: 300 });
  assert.deepEqual(view.getSize(), { width: 520, height: 300 });
  assert.equal(view.element.dataset.size, 'custom');
});

test('auto fits content and cancelled resizing restores the selected preset', (t) => {
  const { view, grip } = setup(t, { size: 'auto', mode: 'side', side: 'top', resizable: true });
  assert.deepEqual(view.getSize(), { width: null, height: null });
  assert.equal(view.element.style.getPropertyValue('--ds-window-width'), 'fit-content');
  assert.equal(view.element.style.getPropertyValue('--ds-window-height'), 'fit-content');
  view.open();
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 100, 160);
  assert.equal(view.element.dataset.size, 'custom');
  grip.emit('pointercancel');
  assert.equal(view.element.dataset.size, 'auto');
  assert.deepEqual(view.getSize(), { width: null, height: null });
  view.update({ size: 'sm' });
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 100, 160);
  view.update({ side: 'right' });
  assert.equal(view.element.dataset.size, 'sm');
  assert.deepEqual(view.getSize(), { width: 400, height: null });
});

test('top/bottom panels resize vertically from their inner edge and ignore horizontal keys', (t) => {
  for (const side of ['top', 'bottom']) {
    const changes = [];
    const { view, grip } = setup(t, { mode: 'side', side, size: 'md', resizable: true, onResize: size => changes.push(size) });
    view.open();
    pointer(grip, 'pointerdown', 100, 100);
    pointer(grip, 'pointermove', 500, side === 'top' ? 200 : 0);
    pointer(grip, 'pointerup', 500, 200);
    assert.deepEqual(changes, [{ width: 480, height: 380 }]);
    assert.equal(view.element.dataset.size, 'custom');
    grip.emit('keydown', { key: 'ArrowRight', preventDefault() {}, stopPropagation() {} });
    assert.equal(changes.length, 1);
    grip.emit('keydown', { key: 'ArrowDown', shiftKey: true, preventDefault() {}, stopPropagation() {} });
    assert.equal(view.getSize().height, side === 'top' ? 330 : 230);
    assert.equal(view.getSize().width, 480);
  }
});

test('vertical manual resizing preserves an auto width, including later explicit height updates', (t) => {
  const changes = [];
  const { view, grip } = setup(t, { mode: 'side', side: 'top', size: 'auto', resizable: true, onResize: size => changes.push(size) });
  view.open();
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 100, 160);
  pointer(grip, 'pointerup', 100, 160);
  assert.deepEqual(changes, [{ width: null, height: 340 }]);
  assert.equal(view.element.dataset.size, 'custom');
  view.update({ mode: 'modal', height: 300 });
  assert.deepEqual(view.getSize(), { width: null, height: 300 });
  assert.equal(view.element.style.getPropertyValue('--ds-window-width'), 'fit-content');
});

test('vertical resizing is viewport-bounded and invalid size/side values stay safe', (t) => {
  const { view, grip, window } = setup(t, { mode: 'side', side: 'top', size: 'xs', resizable: true });
  window.innerHeight = 600;
  view.open();
  pointer(grip, 'pointerdown', 100, 100);
  pointer(grip, 'pointermove', 100, 5000);
  pointer(grip, 'pointerup', 100, 5000);
  assert.equal(view.getSize().height, 600);
  view.update({ side: 'unknown', size: 'unknown' });
  assert.equal(view.element.dataset.side, 'right');
  assert.equal(view.element.dataset.size, 'custom');
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
