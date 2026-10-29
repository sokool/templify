/* Compact Navigation controls. Only the host knows Palette and persistence. */
(function (root) {
  'use strict';
  const Navigation =
    typeof module === 'object' && module.exports
      ? require('../navigation.js')
      : root.DesignSystemNavigation;

  function create({
    themes,
    navigation,
    shortcuts,
    Field = root.DesignSystemFormField,
    Button = root.DesignSystemButtons,
  } = {}) {
    const listeners = new Set();
    let searchEnabled;

    function sync() {
      const state = themes.getState();
      const saved = themes.getComponentSettings(state.theme, 'navigation');
      searchEnabled = typeof saved?.searchEnabled === 'boolean' ? saved.searchEnabled : true;
      navigation.setSearchEnabled(searchEnabled);
      listeners.forEach((listener) => listener({ searchEnabled }));
    }

    function persist(values) {
      const theme = themes.getState().theme;
      const saved = themes.getComponentSettings(theme, 'navigation') || {};
      themes.setComponentSettings(theme, 'navigation', { ...saved, ...values });
    }

    function setSearchEnabled(value) {
      if (typeof value !== 'boolean') return false;
      persist({ searchEnabled: value });
      return true;
    }

    function setSearchShortcut(value) {
      return shortcuts.set(Navigation.searchShortcutId, value);
    }

    function setSidebarShortcut(value) {
      return shortcuts.set(Navigation.sidebarShortcutId, value);
    }

    function mount(host) {
      host.classList.add('ds-tool');
      host.classList.add('navigation-tool');
      const field = Field.mount(host, {
        type: 'checkbox',
        switch: true,
        label: 'Menu search',
        attrs: { checked: searchEnabled },
        onChange({ value }) {
          setSearchEnabled(value);
        },
      });
      const shortcut = shortcuts.mountField(host, Navigation.searchShortcutId, {
        label: 'Search shortcut',
      });
      shortcut.element.classList.add('navigation-tool-shortcut');
      const sidebarShortcut = shortcuts.mountField(host, Navigation.sidebarShortcutId, {
        label: 'Sidebar shortcut',
      });
      sidebarShortcut.element.classList.add('navigation-tool-shortcut');
      const reset = Button.mount(host, {
        label: 'Reset to defaults',
        variant: 'secondary',
        onClick() {
          setSearchEnabled(true);
          shortcuts.reset(Navigation.searchShortcutId);
          shortcuts.reset(Navigation.sidebarShortcutId);
        },
      });
      const status = host.ownerDocument.createElement('p');
      status.className = 'navigation-tool-status';
      host.append(status);

      function update() {
        field.control.checked = searchEnabled;
        field.sync();
        const state = themes.getState();
        status.textContent =
          'Saved to ' + state.themes.find((theme) => theme.id === state.theme).label;
      }

      update();
      listeners.add(update);
      return {
        destroy() {
          listeners.delete(update);
          field.destroy();
          shortcut.destroy();
          sidebarShortcut.destroy();
          reset.destroy();
          host.replaceChildren();
          host.classList.remove('ds-tool');
          host.classList.remove('navigation-tool');
        },
      };
    }

    sync();
    const unsubscribe = themes.subscribe(sync);
    return {
      mount,
      setSearchEnabled,
      setSearchShortcut,
      setSidebarShortcut,
      getState: () => ({
        searchEnabled,
        searchShortcut: shortcuts.get(Navigation.searchShortcutId).shortcut,
        sidebarShortcut: shortcuts.get(Navigation.sidebarShortcutId).shortcut,
      }),
      destroy() {
        unsubscribe();
        listeners.clear();
      },
    };
  }

  const api = { create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemNavigationTool = api;
})(globalThis);
