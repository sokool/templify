/* Shared shortcut catalogue and a single document dispatcher. No authoring dependencies. */
(function (root) {
  'use strict';

  function normalise(value) {
    if (typeof value !== 'string') return null;
    const parts = value.split('+').map((part) => part.trim().toLowerCase());
    const key = parts.pop();
    if (!key || !/^[a-z0-9]$/.test(key)) return null;
    const aliases = {
      mod: 'Mod',
      ctrl: 'Mod',
      control: 'Mod',
      cmd: 'Mod',
      command: 'Mod',
      meta: 'Mod',
      alt: 'Alt',
      option: 'Alt',
      shift: 'Shift',
    };
    const modifiers = new Set();
    for (const part of parts) {
      const modifier = Object.hasOwn(aliases, part) ? aliases[part] : null;
      if (!modifier || modifiers.has(modifier)) return null;
      modifiers.add(modifier);
    }
    if (!modifiers.has('Mod') && !modifiers.has('Alt')) return null;
    return [
      ...['Mod', 'Alt', 'Shift'].filter((modifier) => modifiers.has(modifier)),
      key.toUpperCase(),
    ].join('+');
  }

  function fromEvent(event) {
    if (event.isComposing || event.getModifierState?.('AltGraph')) return null;
    const key =
      /^Key([A-Z])$/.exec(event.code || '')?.[1] ||
      /^Digit([0-9])$/.exec(event.code || '')?.[1] ||
      event.key;
    return normalise(
      [
        event.ctrlKey || event.metaKey ? 'Mod' : null,
        event.altKey ? 'Alt' : null,
        event.shiftKey ? 'Shift' : null,
        key,
      ]
        .filter(Boolean)
        .join('+'),
    );
  }

  function format(value) {
    return value ? value.replace('Mod', '⌘ / Ctrl').replace(/\+/g, ' + ') : 'Not set';
  }

  function aria(value) {
    if (!value) return '';
    return value.includes('Mod+')
      ? ['Control', 'Meta'].map((modifier) => value.replace('Mod', modifier)).join(' ')
      : value;
  }

  function create({ document } = {}) {
    const entries = new Map();
    const listeners = new Set();
    const snapshot = (entry) => ({
      id: entry.id,
      label: entry.label,
      group: entry.group,
      defaultShortcut: entry.defaultShortcut,
      shortcut: entry.shortcut,
    });
    function notify(type, id) {
      listeners.forEach((listener) => listener({ type, id }));
    }
    function set(id, value) {
      const entry = entries.get(id);
      const shortcut = normalise(value);
      if (!entry || (value !== null && !shortcut)) return false;
      if (entry.shortcut !== shortcut) {
        entry.shortcut = shortcut;
        notify('binding', id);
      }
      return true;
    }
    function dispatch(event) {
      if (event.defaultPrevented) return;
      const shortcut = fromEvent(event);
      if (!shortcut) return;
      for (const entry of entries.values()) {
        if (entry.shortcut !== shortcut || entry.enabled?.() === false) continue;
        // A handler must confirm success before native browser behavior is replaced.
        if (entry.handler(event) === true) {
          event.preventDefault();
          return;
        }
      }
    }
    document?.addEventListener('keydown', dispatch);
    return {
      register({ id, label, group = '', defaultShortcut = null, handler, enabled }) {
        if (!id || entries.has(id)) throw new TypeError('Shortcut ID must be unique: ' + id);
        const shortcut = normalise(defaultShortcut);
        if (defaultShortcut !== null && !shortcut) throw new TypeError('Invalid default shortcut');
        if (typeof handler !== 'function') throw new TypeError('Shortcut requires a handler');
        const entry = {
          id,
          label: label || id,
          group,
          defaultShortcut: shortcut,
          shortcut,
          handler,
          enabled,
        };
        entries.set(id, entry);
        notify('catalogue', id);
        return () => {
          if (entries.get(id) !== entry) return;
          entries.delete(id);
          notify('catalogue', id);
        };
      },
      get: (id) => (entries.has(id) ? snapshot(entries.get(id)) : null),
      list: () => [...entries.values()].map(snapshot),
      set,
      reset(id) {
        const entry = entries.get(id);
        return entry ? set(id, entry.defaultShortcut) : false;
      },
      configure(bindings = {}) {
        let changed = false;
        for (const entry of entries.values()) {
          const value = Object.hasOwn(bindings, entry.id)
            ? bindings[entry.id]
            : entry.defaultShortcut;
          const shortcut = value === null ? null : normalise(value) || entry.defaultShortcut;
          if (entry.shortcut !== shortcut) {
            entry.shortcut = shortcut;
            changed = true;
          }
        }
        if (changed) notify('configuration');
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      destroy() {
        document?.removeEventListener('keydown', dispatch);
        entries.clear();
        listeners.clear();
      },
    };
  }

  // The recorder is the Shortcuts component itself, not a component configurator.
  // The caller owns the catalogue and persistence; this UI only edits bindings.
  function mount(host, { shortcuts } = {}) {
    if (!shortcuts) throw new TypeError('Shortcuts requires a catalogue.');
    const doc = host.ownerDocument;
    host.classList.add('ds-shortcuts');
    const rows = doc.createElement('div');
    host.append(rows);
    let cleanups = [];
    function render() {
      cleanups.forEach((off) => off());
      cleanups = [];
      rows.replaceChildren();
      for (const entry of shortcuts.list()) {
        const row = doc.createElement('div'), label = doc.createElement('label'),
          input = doc.createElement('input'), reset = doc.createElement('button'),
          error = doc.createElement('span');
        row.className = 'ds-shortcuts-row';
        label.textContent = [entry.group, entry.label].filter(Boolean).join(' · ');
        input.readOnly = true;
        input.value = format(entry.shortcut);
        input.setAttribute('aria-label', label.textContent);
        error.setAttribute('role', 'status');
        reset.type = 'button';
        reset.className = 'ds-component ds-button ds-focusable';
        reset.dataset.variant = 'secondary';
        reset.textContent = 'Reset';
        label.append(input);
        row.append(label, reset, error);
        rows.append(row);
        const record = (event) => {
          if (['Tab', 'Control', 'Meta', 'Alt', 'Shift', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') { error.textContent = ''; return; }
          const clear = ['Backspace', 'Delete'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;
          const value = clear ? null : fromEvent(event);
          error.textContent = (clear || value) && shortcuts.set(entry.id, value) ? '' : 'Use Cmd/Ctrl/Alt with a letter or number.';
        };
        const restore = () => shortcuts.reset(entry.id);
        input.addEventListener('keydown', record);
        reset.addEventListener('click', restore);
        const unsubscribe = shortcuts.subscribe(() => { input.value = format(shortcuts.get(entry.id)?.shortcut); });
        cleanups.push(() => {
          unsubscribe();
          input.removeEventListener('keydown', record);
          reset.removeEventListener('click', restore);
        });
      }
    }
    render();
    const unsubscribe = shortcuts.subscribe(({ type }) => { if (type === 'catalogue') render(); });
    return { destroy() { unsubscribe(); cleanups.forEach((off) => off()); rows.remove(); host.classList.remove('ds-shortcuts'); } };
  }

  const api = { create, mount, normalise, fromEvent, format, aria };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemShortcuts = api;
})(globalThis);
