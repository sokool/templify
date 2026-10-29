/* Per-user, per-window sizes. No runtime storage or template configuration. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExampleWindows = api;
})(globalThis, function () {
  'use strict';
  function create({ settings, Window = globalThis.DesignSystemWindow }) {
    const configuration = settings.scope('components.window');
    function mount(host, id, options = {}) {
      const preferences = settings.scope('preview.windows.' + id);
      function size() {
        const saved = preferences.get('size', {}), result = {};
        if (saved && Number.isFinite(saved.width) && saved.width >= 240 && saved.width <= 1200) result.width = saved.width;
        if (saved && (saved.height === null || Number.isFinite(saved.height) && saved.height >= 160 && saved.height <= 2400)) result.height = saved.height;
        return result;
      }
      function behaviour() {
        const value = key => {
          if (typeof options[key] === 'boolean') return options[key];
          const saved = configuration.get(key);
          return typeof saved === 'boolean' ? saved : true;
        };
        return { lockScroll: value('lockScroll'), resizable: value('resizable') };
      }
      let current = behaviour();
      const view = Window.mount(host, {
        ...options, ...current, ...size(),
        onResize(value) { preferences.set('size', value); options.onResize?.(value); },
      });
      const off = configuration.subscribe(() => {
        const next = behaviour();
        if (next.lockScroll === current.lockScroll && next.resizable === current.resizable) return;
        current = next;
        view.update(next);
      });
      return {
        ...view,
        restoreSize() { view.update(size()); },
        destroy() { off(); view.destroy(); },
      };
    }
    return { mount, forWindow: id => ({ mount: (host, options) => mount(host, id, options) }) };
  }
  return Object.freeze({ create });
});
