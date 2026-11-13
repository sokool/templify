(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('../shortcuts/shortcuts.js') : root.DesignSystemShortcuts,
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemThemeSwitcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Shortcuts) {
  'use strict';
  const instances = new WeakMap();
  const actions = new WeakMap();
  const shortcutId = 'theme-switcher.nextTheme';
  const defaultShortcut = 'Mod+Shift+L';
  const themeActionId = id => 'theme-switcher.selectTheme.' + id;

  // Several controls may expose the same document action. Keep one catalogue
  // entry until its last owner is destroyed; bindings always belong to Shortcuts.
  function registerAction(shortcuts, source) {
    let action = actions.get(shortcuts);
    if (!action) {
      const sources = new Set([source]);
      action = { sources, unregister: shortcuts.register({
        id: shortcutId, group: 'Theme switcher', label: 'Next theme',
        description: 'Switch to the next complete theme profile',
        keywords: 'theme appearance light dark matrix cycle motyw wygląd',
        icon: 'sun-moon',
        defaultShortcut: source.shortcut,
        enabled: () => [...sources].some(entry => entry.enabled()),
        handler(event) {
          const entry = [...sources].find(entry => entry.enabled());
          return Boolean(entry && (event.repeat || entry.next()));
        },
      }), themes: new Map() };
      action.sync = () => {
        const entries = new Map();
        for (const owner of sources) for (const entry of owner.getState().themes) {
          if (!entries.has(entry.id)) entries.set(entry.id, entry);
        }
        for (const [id, registered] of action.themes) {
          const entry = entries.get(id);
          if (!entry || registered.signature !== JSON.stringify([entry.label, entry.base])) {
            registered.unregister();
            action.themes.delete(id);
          }
        }
        for (const [id, entry] of entries) {
          if (action.themes.has(id)) continue;
          action.themes.set(id, {
            signature: JSON.stringify([entry.label, entry.base]),
            unregister: shortcuts.register({
              id: themeActionId(id), group: 'Themes', label: 'Theme: ' + entry.label,
              description: 'Apply the ' + entry.label + ' theme profile',
              keywords: ['theme', 'appearance', 'motyw', 'wygląd', id, entry.base],
              icon: entry.base === 'light' ? 'sun' : entry.base === 'matrix' ? 'terminal' : 'moon',
              searchable: true, defaultShortcut: null,
              enabled: () => [...sources].some(owner => owner.enabled() && owner.getState().themes.some(theme => theme.id === id)),
              handler() {
                const owner = [...sources].find(owner => owner.enabled() && owner.getState().themes.some(theme => theme.id === id));
                return Boolean(owner && owner.select(id));
              },
            }),
          });
        }
      };
      actions.set(shortcuts, action);
    } else action.sources.add(source);
    action.sync();
    const update = () => shortcuts.setDefault(shortcutId, action.sources.values().next().value.shortcut);
    return {
      update, sync: action.sync,
      destroy() {
        action.sources.delete(source);
        if (action.sources.size) { update(); action.sync(); }
        else {
          action.themes.forEach(entry => entry.unregister());
          action.unregister(); actions.delete(shortcuts);
        }
      },
    };
  }

  // A host can retain the action independently of optional visual controls.
  function create({ document, themes, target = document.documentElement,
    shortcuts = Shortcuts.create({ document }), shortcut = defaultShortcut,
    getThemes = () => [], eventTarget = target }) {
    let destroyed = false;
    const state = () => themes ? themes.getState() : {
      theme: target.dataset.dsTheme || 'light', themes: getThemes(),
    };
    function choose(id) {
      if (destroyed) return false;
      const entry = state().themes.find(entry => entry.id === id);
      if (!entry) return false;
      if (themes) { if (!themes.select(id)) return false; }
      else {
        target.dataset.dsTheme = id; target.dataset.theme = id;
        target.dataset.dsThemeBase = entry.base;
        document.dispatchEvent(new document.defaultView.CustomEvent('templify:theme-sync'));
      }
      eventTarget.dispatchEvent(new document.defaultView.CustomEvent('ui:theme-change', { bubbles: true, detail: { theme: id } }));
      return true;
    }
    function next() {
      const current = state();
      if (current.themes.length < 2) return false;
      return choose(current.themes[(current.themes.findIndex(entry => entry.id === current.theme) + 1) % current.themes.length].id);
    }
    const source = {
      shortcut: shortcut === null ? null : Shortcuts.normalise(shortcut) || defaultShortcut,
      enabled: () => !destroyed && state().themes.length > 1,
      next, select: choose, getState: state,
    };
    const action = registerAction(shortcuts, source);
    const unsubscribe = themes?.subscribe(action.sync);
    return {
      getState: state, select: choose, next, shortcuts,
      update() { if (!destroyed) action.sync(); },
      setDefaultShortcut(value) {
        if (destroyed) return;
        source.shortcut = value === null ? null : Shortcuts.normalise(value) || defaultShortcut;
        action.update();
      },
      destroy() { if (destroyed) return; destroyed = true; unsubscribe?.(); action.destroy(); },
    };
  }

  function mount(element, { themes, target = element.ownerDocument.documentElement, shortcuts, shortcut = defaultShortcut } = {}) {
    if (instances.has(element)) return instances.get(element);
    const document = element.ownerDocument;
    const select = element.querySelector('[data-theme-select]');
    const button = element.matches('[data-theme-next]') ? element : element.querySelector('[data-theme-next]');
    const shortcutDefault = () => {
      const value = element.getAttribute('data-theme-shortcut');
      return value === null ? shortcut : value === '' || value === 'false' ? null : Shortcuts.normalise(value) || shortcut;
    };
    const controller = create({
      document, themes, target, shortcuts, shortcut: shortcutDefault(), eventTarget: element,
      getThemes: () => Array.from(select?.options || []).map(option => ({ id: option.value, label: option.label, base: option.dataset.themeBase || option.value })),
    });
    const state = controller.getState;
    const syncShortcut = () => {
      const value = Shortcuts.aria(controller.shortcuts.get(shortcutId)?.shortcut);
      for (const control of [select, button].filter(Boolean)) {
        if (value) control.setAttribute('aria-keyshortcuts', value);
        else control.removeAttribute('aria-keyshortcuts');
      }
    };
    function sync() {
      const current = state(), list = current.themes;
      if (select) {
        if (themes) {
          const signature = JSON.stringify(list);
          if (select.dataset.themes !== signature) {
            select.replaceChildren(...list.map(entry => {
              const option = document.createElement('option');
              option.value = entry.id; option.textContent = entry.label;
              option.dataset.themeBase = entry.base;
              return option;
            }));
            select.dataset.themes = signature;
          }
        }
        select.value = current.theme;
        select.disabled = list.length < 2;
      }
      if (button) {
        const index = list.findIndex(entry => entry.id === current.theme);
        const next = list[(index + 1) % list.length], active = list[index];
        button.disabled = list.length < 2;
        button.dataset.theme = current.theme;
        button.setAttribute('aria-label', 'Theme: ' + (active?.label || current.theme) + (list.length > 1 ? '. Switch to ' + next.label : '. No other themes'));
        const label = button.querySelector('[data-theme-label]');
        if (label) label.textContent = next?.label || active?.label || current.theme;
      }
    }
    function choose(id) {
      const changed = controller.select(id);
      sync();
      return changed;
    }
    const change = () => choose(select.value);
    const next = () => controller.next();
    select?.addEventListener('change', change);
    button?.addEventListener('click', next);
    document.addEventListener('templify:theme-sync', sync);
    const unsubscribe = themes?.subscribe(sync);
    const unsubscribeShortcut = controller.shortcuts.subscribe(syncShortcut);
    const Observer = document.defaultView?.MutationObserver;
    const observer = !themes && Observer ? new Observer(sync) : null;
    observer?.observe(target, { attributes: true, attributeFilter: ['data-ds-theme'] });
    const shortcutObserver = Observer ? new Observer(() => controller.setDefaultShortcut(shortcutDefault())) : null;
    shortcutObserver?.observe(element, { attributes: true, attributeFilter: ['data-theme-shortcut'] });
    const themeObserver = !themes && select && Observer ? new Observer(() => { controller.update(); sync(); }) : null;
    themeObserver?.observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'data-theme-base'] });
    const view = { element, select: choose, next, shortcuts: controller.shortcuts, update() { controller.update(); sync(); }, destroy() {
      select?.removeEventListener('change', change); button?.removeEventListener('click', next);
      document.removeEventListener('templify:theme-sync', sync);
      unsubscribe?.(); unsubscribeShortcut(); observer?.disconnect(); shortcutObserver?.disconnect();
      themeObserver?.disconnect();
      controller.destroy();
      for (const control of [select, button].filter(Boolean)) control.removeAttribute('aria-keyshortcuts');
      instances.delete(element);
    } };
    instances.set(element, view); sync(); syncShortcut(); return view;
  }
  return { create, mount, shortcutId, defaultShortcut, themeActionId };
});
