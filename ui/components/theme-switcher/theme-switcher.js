(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemThemeSwitcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const instances = new WeakMap();
  function mount(element, { themes, target = element.ownerDocument.documentElement } = {}) {
    if (instances.has(element)) return instances.get(element);
    const document = element.ownerDocument;
    const select = element.querySelector('[data-theme-select]');
    const button = element.matches('[data-theme-next]') ? element : element.querySelector('[data-theme-next]');
    const fallback = () => ({
      theme: target.dataset.dsTheme || 'light',
      themes: Array.from(select?.options || []).map(option => ({ id: option.value, label: option.textContent, base: option.dataset.themeBase || option.value })),
    });
    const state = () => themes ? themes.getState() : fallback();
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
      const entry = state().themes.find(entry => entry.id === id);
      if (!entry) return false;
      if (themes) { if (!themes.select(id)) return false; }
      else {
        target.dataset.dsTheme = id; target.dataset.theme = id;
        target.dataset.dsThemeBase = entry.base;
        document.dispatchEvent(new document.defaultView.CustomEvent('templify:theme-sync'));
      }
      sync();
      element.dispatchEvent(new document.defaultView.CustomEvent('ui:theme-change', { bubbles: true, detail: { theme: id } }));
      return true;
    }
    const change = () => choose(select.value);
    const next = () => { const current = state(); choose(current.themes[(current.themes.findIndex(entry => entry.id === current.theme) + 1) % current.themes.length]?.id); };
    select?.addEventListener('change', change);
    button?.addEventListener('click', next);
    document.addEventListener('templify:theme-sync', sync);
    const unsubscribe = themes?.subscribe(sync);
    const Observer = document.defaultView?.MutationObserver;
    const observer = !themes && Observer ? new Observer(sync) : null;
    observer?.observe(target, { attributes: true, attributeFilter: ['data-ds-theme'] });
    const view = { element, select: choose, update: sync, destroy() {
      select?.removeEventListener('change', change); button?.removeEventListener('click', next);
      document.removeEventListener('templify:theme-sync', sync);
      unsubscribe?.(); observer?.disconnect(); instances.delete(element);
    } };
    instances.set(element, view); sync(); return view;
  }
  return { mount };
});
