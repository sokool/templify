function snapshot(state) {
  return {
    theme: state.theme,
    themes: state.themes.map(entry => ({ ...entry })),
  };
}

export function create(configuration, target = document.documentElement) {
  const state = {
    theme: configuration.theme,
    themes: configuration.themes.map(entry => ({ ...entry })),
  };
  const listeners = new Set();

  function apply(id, notify = true) {
    const entry = state.themes.find(theme => theme.id === id);
    if (!entry) return false;
    state.theme = id;
    target.dataset.dsTheme = id;
    target.dataset.dsThemeBase = entry.base;
    target.dataset.theme = id;
    if (notify) {
      const current = snapshot(state);
      listeners.forEach(listener => listener(current));
      target.ownerDocument.dispatchEvent(new target.ownerDocument.defaultView.CustomEvent('templify:theme-sync'));
    }
    return true;
  }

  apply(state.theme, false);
  return Object.freeze({
    getState: () => snapshot(state),
    select: apply,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
