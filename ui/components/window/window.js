/* Runtime only. The host owns persistence through onResize/subscribeResize. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemWindow = api;
})(globalThis, function () {
  'use strict';
  let sequence = 0;
  const locks = new WeakMap(), stacks = new WeakMap();
  function lock(doc) {
    let state = locks.get(doc);
    if (!state) { state = { count: 0, overflow: doc.documentElement.style.overflow }; locks.set(doc, state); }
    state.count++;
    doc.documentElement.style.overflow = 'hidden';
  }
  function unlock(doc) {
    const state = locks.get(doc);
    if (state && --state.count === 0) { doc.documentElement.style.overflow = state.overflow; locks.delete(doc); }
  }
  const dimension = (value, fallback, min, max) => Number.isFinite(Number(value)) && Number(value) > 0
    ? Math.max(min, Math.min(max, Number(value))) : fallback;
  function mount(host, options = {}) {
    const doc = host.ownerDocument, win = doc.defaultView, id = 'ds-window-' + (++sequence);
    const state = { mode: 'modal', side: 'right', width: 480, height: null, resizable: false,
      closeOnEscape: true, closeOnBackdrop: true, showClose: true, lockScroll: true, duration: 220, ...options };
    const listeners = [], resizeListeners = new Set();
    const stack = stacks.get(doc) || [];
    stacks.set(doc, stack);
    let destroyed = false, closing = false, timer = null, opener = null, locked = false,
      backdropPress = false, gesture = null, ignoredCloses = 0;
    const make = (tag, cls, text) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = String(text);
      return node;
    };
    const dialog = make('dialog', 'ds-component ds-window');
    dialog.id = id;
    dialog.tabIndex = -1;
    const header = make('header', 'ds-window-header'), title = make('h2', 'ds-window-title'),
      closeButton = make('button', 'ds-window-close', '×'), body = make('div', 'ds-window-body'),
      footer = make('footer', 'ds-window-footer'), grip = make('button', 'ds-window-resize');
    title.id = id + '-title';
    dialog.setAttribute('aria-labelledby', title.id);
    closeButton.type = grip.type = 'button';
    closeButton.setAttribute('aria-label', 'Close window');
    grip.setAttribute('aria-label', 'Resize window');
    grip.title = 'Drag to resize. Arrow keys resize; Shift resizes in larger steps.';
    header.append(title, closeButton);
    dialog.append(header, body, footer, grip);
    (state.container || doc.body).append(dialog);
    function listen(node, type, fn) {
      node.addEventListener(type, fn);
      listeners.push(() => node.removeEventListener(type, fn));
    }
    function content(node, value) {
      node.replaceChildren();
      if (value?.nodeType) node.append(value);
      else if (value != null) node.textContent = String(value);
    }
    function sync(patch) {
      state.width = dimension(state.width, 480, 240, 1200);
      state.height = dimension(state.height, null, 160, 2400);
      dialog.dataset.mode = state.mode === 'side' ? 'side' : 'modal';
      dialog.dataset.side = state.side === 'left' ? 'left' : 'right';
      dialog.dataset.blocking = String(Boolean(state.lockScroll));
      dialog.setAttribute('aria-modal', String(Boolean(state.lockScroll)));
      dialog.style.setProperty('--ds-window-width', state.width + 'px');
      dialog.style.setProperty('--ds-window-height', state.height == null ? 'fit-content' : state.height + 'px');
      dialog.style.setProperty('--ds-window-duration', Math.max(0, Math.min(2000, Number(state.duration) || 0)) + 'ms');
      title.textContent = state.title || 'Window';
      closeButton.hidden = !state.showClose;
      grip.hidden = !state.resizable;
      if ('content' in patch) content(body, state.content);
      if ('footer' in patch) content(footer, state.footer);
      footer.hidden = !footer.childNodes.length;
    }
    function release() { if (locked) { unlock(doc); locked = false; } }
    function removeFromStack() { const index = stack.indexOf(dialog); if (index >= 0) stack.splice(index, 1); }
    function topmost() { return stack[stack.length - 1] === dialog; }
    function finish(reason) {
      if (!dialog.open) return;
      closing = false;
      dialog.classList.remove('is-closing');
      release();
      removeFromStack();
      dialog.close(reason);
    }
    function close(reason = 'api', { immediate = false } = {}) {
      if (!dialog.open || closing) return;
      endResize(false);
      closing = true;
      dialog.classList.add('is-closing');
      const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const duration = immediate || reduced ? 0 : Math.max(0, Math.min(2000, Number(state.duration) || 0));
      if (duration) timer = win.setTimeout(() => finish(reason), duration);
      else finish(reason);
    }
    function show() {
      if (state.lockScroll) { dialog.showModal(); lock(doc); locked = true; }
      else dialog.show();
    }
    function open() {
      if (destroyed || dialog.open) return;
      opener = doc.activeElement;
      // A caller may reopen before the previous native close event is delivered.
      release();
      removeFromStack();
      dialog.classList.remove('is-closing');
      dialog.classList.remove('has-resized');
      closing = false;
      show();
      stack.push(dialog);
      const focus = typeof state.initialFocus === 'string' ? body.querySelector(state.initialFocus) : state.initialFocus;
      focus?.focus?.({ preventScroll: true });
      state.onOpen?.();
    }
    function closed() {
      // Switching showModal/show emits a delayed native close event. Count it
      // explicitly so an immediate real dismissal still fires onClose once.
      if (ignoredCloses) { ignoredCloses--; return; }
      if (dialog.open) return;
      win.clearTimeout(timer);
      endResize(false);
      release();
      removeFromStack();
      closing = false;
      dialog.classList.remove('is-closing');
      if (opener?.isConnected) opener.focus?.({ preventScroll: true });
      if (!destroyed) state.onClose?.(dialog.returnValue);
    }
    function outside(event) {
      const box = dialog.getBoundingClientRect();
      return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    }
    function cancel(event) { event.preventDefault(); if (state.closeOnEscape) close('escape'); }
    function onPointerDown(event) { backdropPress = event.target === dialog && outside(event); }
    function onPointerUp(event) {
      if (backdropPress && event.target === dialog && outside(event) && state.closeOnBackdrop) close('backdrop');
      backdropPress = false;
    }
    function getSize() { return { width: state.width, height: state.height }; }
    function resized() {
      const size = getSize();
      state.onResize?.(size);
      resizeListeners.forEach(fn => fn({ ...size }));
    }
    function applySize(width, height) {
      const side = state.mode === 'side', margin = side ? 0 : 32;
      state.width = Math.round(Math.min(Math.max(240, width), Math.min(1200, Math.max(1, win.innerWidth - margin))));
      if (!side) state.height = Math.round(Math.min(Math.max(160, height), Math.max(1, win.innerHeight - 32)));
      sync({});
    }
    function startResize(event) {
      if (!state.resizable || !dialog.open || closing || (event.button != null && event.button !== 0)) return;
      event.preventDefault();
      dialog.classList.add('has-resized');
      const box = dialog.getBoundingClientRect();
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, width: box.width, height: box.height,
        size: getSize(), changed: false };
      grip.setPointerCapture?.(event.pointerId);
      dialog.classList.add('is-resizing');
    }
    function moveResize(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      event.preventDefault();
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!dx && !dy) return;
      if (state.mode === 'side' && !dx) return;
      const factor = state.mode === 'side' ? (state.side === 'left' ? 1 : -1) : 2;
      applySize(gesture.width + dx * factor, gesture.height + dy * 2);
      gesture.changed = true;
    }
    function endResize(commit) {
      if (!gesture) return;
      const previous = gesture;
      gesture = null;
      if (!commit) { Object.assign(state, previous.size); sync({}); }
      dialog.classList.remove('is-resizing');
      if (grip.hasPointerCapture?.(previous.id)) grip.releasePointerCapture(previous.id);
      if (commit && previous.changed && (state.width !== previous.size.width || state.height !== previous.size.height)) resized();
    }
    function resizeKey(event) {
      if (!state.resizable || !dialog.open || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      if (state.mode === 'side' && ['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const box = dialog.getBoundingClientRect(), step = event.shiftKey ? 50 : 10;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      const before = getSize();
      applySize(box.width + dx * (state.mode === 'side' && state.side === 'right' ? -1 : 1), box.height + dy);
      if (before.width !== state.width || before.height !== state.height) resized();
    }
    listen(closeButton, 'click', () => close('button'));
    listen(dialog, 'cancel', cancel);
    listen(dialog, 'close', closed);
    listen(dialog, 'pointerdown', onPointerDown);
    listen(dialog, 'pointerup', onPointerUp);
    listen(doc, 'keydown', event => {
      if (dialog.open && !state.lockScroll && topmost() && !event.defaultPrevented && event.key === 'Escape') cancel(event);
    });
    listen(grip, 'pointerdown', startResize);
    listen(grip, 'pointermove', moveResize);
    listen(grip, 'pointerup', event => { if (gesture?.id === event.pointerId) endResize(true); });
    listen(grip, 'pointercancel', () => endResize(false));
    listen(grip, 'lostpointercapture', () => endResize(false));
    listen(grip, 'keydown', resizeKey);
    listen(win, 'resize', () => endResize(false));
    sync(state);
    return { element: dialog, body, open, close, getSize, isOpen: () => dialog.open && !closing,
      subscribeResize(fn) { resizeListeners.add(fn); return () => resizeListeners.delete(fn); },
      update(patch) {
        if (destroyed) return;
        endResize(false);
        const changeBlocking = 'lockScroll' in patch && Boolean(patch.lockScroll) !== Boolean(state.lockScroll);
        Object.assign(state, patch);
        sync(patch);
        if (dialog.open && changeBlocking) {
          const focused = doc.activeElement;
          win.clearTimeout(timer);
          closing = false;
          dialog.classList.remove('is-closing');
          ignoredCloses++;
          dialog.close();
          release();
          show();
          if (dialog.contains(focused)) focused.focus?.({ preventScroll: true });
        }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        endResize(false);
        win.clearTimeout(timer);
        listeners.forEach(off => off());
        resizeListeners.clear();
        const wasOpen = dialog.open;
        if (wasOpen) dialog.close();
        release();
        removeFromStack();
        dialog.remove();
        if (wasOpen && opener?.isConnected) opener.focus?.({ preventScroll: true });
      },
    };
  }
  return Object.freeze({ mount });
});
