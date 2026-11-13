/* Shared shortcut catalogue and a single document dispatcher. No authoring dependencies. */
(function (root) {
  'use strict';

  const modifierKeys = new Set(['Control', 'Meta', 'Alt', 'Shift']);

  function normalise(value) {
    if (typeof value !== 'string') return null;
    const parts = value.split('+').map((part) => part.trim().toLowerCase());
    const key = /^[a-z0-9]$/.test(parts.at(-1)) ? parts.pop().toUpperCase() : null;
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
    if (!modifiers.size || (!key && modifiers.size < 2)) return null;
    return [
      ...['Mod', 'Alt', 'Shift'].filter((modifier) => modifiers.has(modifier)),
      ...(key ? [key] : []),
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
        modifierKeys.has(event.key) ? null : key,
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

  // Commit modifier-only chords on the first release, never a prefix of a
  // longer shortcut. After any other key, wait until all modifiers are released.
  function modifierSequence() {
    let pending = null, blocked = false;
    const ignored = (event) => event.defaultPrevented || event.isComposing || event.getModifierState?.('AltGraph');
    return {
      reset() { pending = null; blocked = false; },
      keydown(event) {
        if (!modifierKeys.has(event.key) || ignored(event)) {
          pending = null;
          blocked = true;
        } else if (!blocked) {
          pending = fromEvent(event);
        }
      },
      keyup(event) {
        const shortcut = modifierKeys.has(event.key) && !blocked && !ignored(event) ? pending : null;
        pending = null;
        blocked = Boolean(event.ctrlKey || event.metaKey || event.altKey || event.shiftKey);
        return shortcut;
      },
    };
  }

  const catalogues = new WeakMap();
  function create({ document } = {}) {
    if (document && catalogues.has(document)) return catalogues.get(document);
    const entries = new Map();
    const listeners = new Set();
    const modifiers = modifierSequence();
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
      description: entry.description,
      keywords: entry.keywords,
      icon: entry.icon,
      image: entry.image,
      searchable: entry.searchable,
      enabled: entry.enabled?.() !== false,
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
    function execute(id, event = {}) {
      const entry = entries.get(id);
      return Boolean(entry && entry.enabled?.() !== false && entry.handler(event) === true);
    }
    function dispatch(event, shortcut) {
      if (event.defaultPrevented) return;
      if (!shortcut) return;
      for (const entry of entries.values()) {
        if (entry.shortcut !== shortcut) continue;
        // A handler must confirm success before native browser behavior is replaced.
        if (execute(entry.id, event)) {
          event.preventDefault();
          return;
        }
      }
    }
    function keydown(event) {
      modifiers.keydown(event);
      if (!modifierKeys.has(event.key)) dispatch(event, fromEvent(event));
    }
    function keyup(event) {
      dispatch(event, modifiers.keyup(event));
    }
    function detach() {
      document?.removeEventListener('keydown', keydown);
      document?.removeEventListener('keyup', keyup);
      document?.defaultView?.removeEventListener('blur', modifiers.reset);
      modifiers.reset();
      listening = false;
    }
    const catalogue = {
      register({ id, label, group = '', defaultShortcut = null, handler, enabled,
        description = '', keywords = '', icon = '', image = '', searchable = false }) {
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
          description: String(description),
          keywords: Array.isArray(keywords) ? keywords.join(' ') : String(keywords),
          icon: String(icon),
          image: String(image),
          searchable: Boolean(searchable),
        };
        entries.set(id, entry);
        if (document && !listening) {
          document.addEventListener('keydown', keydown);
          document.addEventListener('keyup', keyup);
          document.defaultView?.addEventListener('blur', modifiers.reset);
          listening = true;
        }
        notify('catalogue', id);
        return () => {
          if (entries.get(id) !== entry) return;
          entries.delete(id);
          if (!entries.size && listening) {
            detach();
          }
          notify('catalogue', id);
        };
      },
      get: (id) => (entries.has(id) ? snapshot(entries.get(id)) : null),
      list: () => [...entries.values()].map(snapshot),
      execute,
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
        detach();
        entries.clear();
        listeners.clear();
        if (document && catalogues.get(document) === catalogue) catalogues.delete(document);
      },
    };
    if (document) catalogues.set(document, catalogue);
    return catalogue;
  }

  // The recorder is the Shortcuts component itself, not a component configurator.
  // The caller owns the catalogue and persistence; this UI only edits bindings.
  function mount(host, { shortcuts = create({ document: host.ownerDocument }), actionIds, onChange } = {}) {
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
        if (actionIds && !actionIds.includes(entry.id)) continue;
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
        const modifiers = modifierSequence();
        const save = (value) => {
          const success = value !== undefined && shortcuts.set(entry.id, value);
          error.textContent = success ? '' : 'Use Cmd/Ctrl, Alt or Shift with a letter/number, or combine at least two modifiers.';
          if (success) onChange?.({ id: entry.id, shortcut: shortcuts.get(entry.id).shortcut });
        };
        const record = (event) => {
          modifiers.keydown(event);
          if (modifierKeys.has(event.key)) {
            event.stopPropagation();
            error.textContent = '';
            return;
          }
          if (['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') { error.textContent = ''; return; }
          const clear = ['Backspace', 'Delete'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;
          save(clear ? null : fromEvent(event) || undefined);
        };
        const release = (event) => {
          const value = modifiers.keyup(event);
          // Let the document observe the release and clear its sequence, but
          // never dispatch an action while its binding is being recorded.
          if (modifierKeys.has(event.key)) event.preventDefault();
          if (!value) return;
          save(value);
        };
        const restore = () => {
          shortcuts.reset(entry.id);
          onChange?.({ id: entry.id, shortcut: shortcuts.get(entry.id).shortcut });
        };
        input.addEventListener('keydown', record);
        input.addEventListener('keyup', release);
        input.addEventListener('blur', modifiers.reset);
        reset.addEventListener('click', restore);
        const unsubscribe = shortcuts.subscribe(() => { input.value = format(shortcuts.get(entry.id)?.shortcut); });
        cleanups.push(() => {
          unsubscribe();
          input.removeEventListener('keydown', record);
          input.removeEventListener('keyup', release);
          input.removeEventListener('blur', modifiers.reset);
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
