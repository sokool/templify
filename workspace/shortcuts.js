/* Host-owned theme preferences; the Shortcuts component knows no theme/storage. */
(function (root) {
  function connect({ themes, shortcuts }) {
    let syncing = false;
    function sync() {
      if (syncing) return;
      syncing = true;
      try {
        const theme = themes.getState().theme;
        shortcuts.configure(themes.getComponentSettings(theme, 'shortcuts')?.bindings || {});
      } finally { syncing = false; }
    }
    const offThemes = themes.subscribe(sync);
    const offShortcuts = shortcuts.subscribe(({ type }) => {
      if (syncing) return;
      if (type === 'catalogue') { sync(); return; }
      if (type !== 'binding') return;
      const theme = themes.getState().theme, saved = themes.getComponentSettings(theme, 'shortcuts') || {};
      themes.setComponentSettings(theme, 'shortcuts', { ...saved, bindings: shortcuts.bindings() });
    });
    sync();
    return { destroy() { offThemes(); offShortcuts(); } };
  }
  if (typeof module === 'object' && module.exports) module.exports = { connect };
  else root.ExampleShortcuts = { connect };
})(globalThis);
