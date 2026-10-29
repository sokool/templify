/* Shared Form recorder and per-theme shortcut preferences. Authoring only. */
(function (root) {
  'use strict';
  const Shortcuts =
    typeof module === 'object' && module.exports
      ? require('./shortcuts.js')
      : root.DesignSystemShortcuts;

  function create({
    themes,
    shortcuts,
    migrations = [],
    Field = root.DesignSystemFormField,
    Button = root.DesignSystemButtons,
  } = {}) {
    let syncing = false;

    function sync() {
      if (syncing) return;
      syncing = true;
      try {
        // Also migrate inactive palettes, including explicit null (disabled) bindings.
        for (const theme of themes.getState().themes) {
          for (const { id, component, key } of migrations) {
            const legacy = themes.getComponentSettings(theme.id, component);
            if (!legacy || !Object.hasOwn(legacy, key)) continue;
            const saved = themes.getComponentSettings(theme.id, 'shortcuts') || {};
            const value = legacy[key] === null ? null : Shortcuts.normalise(legacy[key]);
            if (!Object.hasOwn(saved.bindings || {}, id) && (legacy[key] === null || value)) {
              themes.setComponentSettings(theme.id, 'shortcuts', {
                ...saved,
                bindings: { ...saved.bindings, [id]: value },
              });
            }
            const remaining = { ...legacy };
            delete remaining[key];
            themes.setComponentSettings(theme.id, component, remaining);
          }
        }
        const saved = themes.getComponentSettings(themes.getState().theme, 'shortcuts');
        shortcuts.configure(saved?.bindings || {});
      } finally {
        syncing = false;
      }
    }

    sync();
    const unsubscribeThemes = themes.subscribe(sync);
    const unsubscribeShortcuts = shortcuts.subscribe(({ type }) => {
      if (syncing) return;
      if (type === 'catalogue') {
        sync();
        return;
      }
      const theme = themes.getState().theme;
      const saved = themes.getComponentSettings(theme, 'shortcuts') || {};
      themes.setComponentSettings(theme, 'shortcuts', {
        ...saved,
        bindings: {
          ...saved.bindings,
          ...Object.fromEntries(shortcuts.list().map((entry) => [entry.id, entry.shortcut])),
        },
      });
    });

    function mountField(host, id, { label } = {}) {
      const entry = shortcuts.get(id);
      if (!entry) throw new TypeError('Unknown shortcut: ' + id);
      const field = Field.mount(host, {
        label: label || entry.label,
        attrs: { readonly: true, value: '' },
        hint: 'Press Cmd/Ctrl/Alt + letter or number. Backspace disables.',
      });
      field.element.classList.add('shortcuts-recorder');
      field.element.dataset.shortcutId = id;
      function record(event) {
        if (
          [
            'Tab',
            'Control',
            'Meta',
            'Alt',
            'Shift',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End',
          ].includes(event.key)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') {
          field.setError('');
          return;
        }
        if (
          ['Backspace', 'Delete'].includes(event.key) &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          shortcuts.set(id, null);
          field.setError('');
          return;
        }
        const value = Shortcuts.fromEvent(event);
        if (!value || !shortcuts.set(id, value)) {
          field.setError('Use Cmd/Ctrl/Alt with a letter or number.');
          return;
        }
        field.setError('');
      }
      function update() {
        const current = shortcuts.get(id);
        field.control.disabled = !current;
        field.control.value = Shortcuts.format(current?.shortcut);
        field.setError('');
        field.sync();
      }
      update();
      field.control.addEventListener('keydown', record);
      const unsubscribe = shortcuts.subscribe(update);
      return {
        ...field,
        destroy() {
          unsubscribe();
          field.control.removeEventListener('keydown', record);
          field.destroy();
        },
      };
    }

    function mount(host) {
      host.classList.add('ds-tool');
      host.classList.add('shortcuts-tool');
      const document = host.ownerDocument;
      const rows = document.createElement('div');
      rows.className = 'shortcuts-tool-rows';
      const status = document.createElement('p');
      status.className = 'shortcuts-tool-status';
      host.append(rows, status);
      let views = [];
      function render() {
        views.forEach((view) => view.destroy());
        views = [];
        rows.replaceChildren();
        for (const entry of shortcuts.list()) {
          const row = document.createElement('div');
          row.className = 'shortcuts-tool-row';
          rows.append(row);
          views.push(
            mountField(row, entry.id, {
              label: [entry.group, entry.label].filter(Boolean).join(' · '),
            }),
          );
          views.push(
            Button.mount(row, {
              label: 'Reset',
              variant: 'secondary',
              onClick() {
                shortcuts.reset(entry.id);
              },
            }),
          );
          const reference = document.createElement('code');
          reference.className = 'shortcuts-tool-reference';
          reference.textContent = entry.id;
          row.append(reference);
        }
      }
      function updateStatus() {
        const state = themes.getState();
        status.textContent =
          'Saved to ' + state.themes.find((theme) => theme.id === state.theme).label;
      }
      render();
      updateStatus();
      const unsubscribeCatalogue = shortcuts.subscribe(({ type }) => {
        if (type === 'catalogue') render();
      });
      const unsubscribeStatus = themes.subscribe(updateStatus);
      return {
        destroy() {
          unsubscribeCatalogue();
          unsubscribeStatus();
          views.forEach((view) => view.destroy());
          host.replaceChildren();
          host.classList.remove('ds-tool');
          host.classList.remove('shortcuts-tool');
        },
      };
    }

    return {
      mount,
      mountField,
      set: (id, value) => shortcuts.set(id, value),
      reset: (id) => shortcuts.reset(id),
      get: (id) => shortcuts.get(id),
      destroy() {
        unsubscribeThemes();
        unsubscribeShortcuts();
      },
    };
  }

  const api = { create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemShortcutsTool = api;
})(globalThis);
