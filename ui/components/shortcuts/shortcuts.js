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

  const catalogues = new WeakMap();
  function create({ document } = {}) {
    if (document && catalogues.has(document)) return catalogues.get(document);
    const entries = new Map();
    const listeners = new Set();
    let preferences = {}, listening = false;
    const binding = (id, fallback) => Object.hasOwn(preferences, id)
      ? preferences[id] === null ? null : normalise(preferences[id]) || fallback
      : fallback;
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
      const changed = !Object.hasOwn(preferences, id) || preferences[id] !== shortcut;
      Object.defineProperty(preferences, id, { value: shortcut, writable: true, configurable: true, enumerable: true });
      if (entry.shortcut !== shortcut || changed) {
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
    const catalogue = {
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
          shortcut: binding(id, shortcut),
          handler,
          enabled,
        };
        entries.set(id, entry);
        if (document && !listening) {
          document.addEventListener('keydown', dispatch);
          listening = true;
        }
        notify('catalogue', id);
        return () => {
          if (entries.get(id) !== entry) return;
          entries.delete(id);
          if (!entries.size && listening) {
            document.removeEventListener('keydown', dispatch);
            listening = false;
          }
          notify('catalogue', id);
        };
      },
      get: (id) => (entries.has(id) ? snapshot(entries.get(id)) : null),
      list: () => [...entries.values()].map(snapshot),
      bindings: () => ({ ...preferences }),
      set,
      reset(id) {
        const entry = entries.get(id);
        if (!entry) return false;
        delete preferences[id];
        entry.shortcut = entry.defaultShortcut;
        notify('binding', id);
        return true;
      },
      setDefault(id, value) {
        const entry = entries.get(id), shortcut = normalise(value);
        if (!entry || (value !== null && !shortcut)) return false;
        if (entry.defaultShortcut === shortcut) return true;
        entry.defaultShortcut = shortcut;
        entry.shortcut = binding(id, shortcut);
        notify('default', id);
        return true;
      },
      configure(bindings = {}) {
        preferences = Object.fromEntries(Object.entries(bindings).flatMap(([id, value]) => {
          const shortcut = normalise(value);
          return value === null || shortcut ? [[id, shortcut]] : [];
        }));
        let changed = false;
        for (const entry of entries.values()) {
          const shortcut = binding(entry.id, entry.defaultShortcut);
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
        if (document && catalogues.get(document) === catalogue) catalogues.delete(document);
        listening = false;
      },
    };
    if (document) catalogues.set(document, catalogue);
    return catalogue;
  }

  // The recorder is the Shortcuts component itself, not a component configurator.
  // The caller owns the catalogue and persistence; this UI only edits bindings.
  function mount(host, { shortcuts = create({ document: host.ownerDocument }), onChange } = {}) {
    const doc = host.ownerDocument;
    host.classList.add('ds-shortcuts');
    const rows = doc.createElement('div');
    rows.dataset.shortcutRows = '';
    host.append(rows);
    let cleanups = [];
    function render() {
      cleanups.forEach((off) => off());
      cleanups = [];
      rows.replaceChildren();
      for (const entry of shortcuts.list()) {
        let row = Array.from(host.querySelectorAll('[data-shortcut-id]')).find(node => node.dataset.shortcutId === entry.id);
        const adopted = Boolean(row);
        row = row || doc.createElement('div');
        row.dataset.shortcutId = entry.id;
        const label = row.querySelector('label') || doc.createElement('label'),
          input = row.querySelector('input') || doc.createElement('input'),
          reset = row.querySelector('button') || doc.createElement('button'),
          error = row.querySelector('[role=status]') || doc.createElement('span');
        row.className = 'ds-shortcuts-row';
        if (!adopted) label.textContent = [entry.group, entry.label].filter(Boolean).join(' · ');
        input.readOnly = true;
        input.value = format(entry.shortcut);
        input.setAttribute('aria-label', [entry.group, entry.label].filter(Boolean).join(' · '));
        error.setAttribute('role', 'status');
        reset.type = 'button';
        reset.className = 'ds-component ds-button ds-focusable';
        reset.dataset.variant = 'secondary';
        reset.textContent = 'Reset';
        if (!adopted) { label.append(input); row.append(label, reset); rows.append(row); }
        row.append(error);
        const record = (event) => {
          if (['Tab', 'Control', 'Meta', 'Alt', 'Shift', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') { error.textContent = ''; return; }
          const clear = ['Backspace', 'Delete'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;
          const value = clear ? null : fromEvent(event);
          const success = (clear || value) && shortcuts.set(entry.id, value);
          error.textContent = success ? '' : 'Use Cmd/Ctrl/Alt with a letter or number.';
          if (success) onChange?.({ id: entry.id, shortcut: shortcuts.get(entry.id).shortcut });
        };
        const restore = () => {
          shortcuts.reset(entry.id);
          onChange?.({ id: entry.id, shortcut: shortcuts.get(entry.id).shortcut });
        };
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
