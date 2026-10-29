/* Card authoring only. Settings belong to the selected Palette theme. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemCardTool = api;
})(globalThis, function (root) {
  'use strict';

  const defaults = {
    background: { kind: 'semantic', role: 'panel' },
    border: { kind: 'semantic', role: 'border' },
  };
  const defaultSize = 360;
  const defaultShadows = { rest: 'none', interactive: 'soft' };
  const tokens = {
    background: '--ds-card-background',
    border: '--ds-card-accent',
    rest: '--ds-card-shadow',
    interactive: '--ds-card-shadow-interactive',
  };
  const copy = (value) => JSON.parse(JSON.stringify(value));

  function validSize(value) {
    return Number.isInteger(value) && value >= 160 && value <= 1200 && value % 10 === 0;
  }

  function create({
    themes,
    settings,
    previewSettings,
    target,
    Picker = root.PalettePicker,
    Field = root.DesignSystemFormField,
    Button = root.DesignSystemButtons,
    themeTokens = root.DesignSystemThemes.tokens,
  } = {}) {
    const listeners = new Set();
    const previous = Object.fromEntries(
      Object.values(tokens).map((token) => [token, target.style.getPropertyValue(token)]),
    );
    let configuration;

    function normalise(saved = {}) {
      const themeState = themes.getState();
      const profiles = themeState.shadows[themeState.theme];
      const colours = {};
      // Older preferences had independent width/height. Keep their chosen width.
      const savedSize = typeof saved?.size === 'number' ? saved.size : saved?.size?.width;
      const roundedSize = Number.isInteger(savedSize) ? Math.round(savedSize / 10) * 10 : null;
      const size = validSize(roundedSize) ? roundedSize : defaultSize;
      const shadows = {};

      for (const [key, fallback] of Object.entries(defaults)) {
        const value = saved?.colours?.[key];
        colours[key] = Picker.validForTheme(value, themeState, themeTokens)
          ? copy(value)
          : copy(fallback);
      }
      for (const [key, fallback] of Object.entries(defaultShadows)) {
        const value = saved?.shadows?.[key];
        shadows[key] = Object.hasOwn(profiles, value) ? value : fallback;
      }
      const menuEnabled = typeof saved?.menuEnabled === 'boolean' ? saved.menuEnabled : true;
      return { colours, size, shadows, menuEnabled };
    }

    // Import the old global Card preferences once, into the active theme only.
    const initialTheme = themes.getState().theme;
    const legacyColours = settings?.get('colours', null);
    if (!settings?.get('migratedToTheme', false) && legacyColours) {
      if (!themes.getComponentSettings(initialTheme, 'card')) {
        persist(
          normalise({
            colours: legacyColours,
            size: previewSettings?.snapshot(),
          }),
        );
      }
      settings.set('migratedToTheme', true);
    }

    function getState() {
      return copy(configuration);
    }

    function cssVariables(value, themeState) {
      const variables = {};
      for (const [key, fallback] of Object.entries(defaults)) {
        variables[tokens[key]] = Picker.resolveTheme(
          value.colours[key],
          themeState,
          themeTokens,
          fallback,
        ).css;
      }
      for (const [key, profile] of Object.entries(value.shadows))
        variables[tokens[key]] = `var(--ds-shadow-${profile})`;
      return variables;
    }

    function sync() {
      const themeState = themes.getState();
      configuration = normalise(themes.getComponentSettings(themeState.theme, 'card'));
      for (const [name, value] of Object.entries(cssVariables(configuration, themeState)))
        target.style.setProperty(name, value);
      listeners.forEach((listener) => listener(getState()));
    }

    function persist(next) {
      const themeState = themes.getState();
      themes.setComponentSettings(themeState.theme, 'card', {
        ...next,
        css: cssVariables(next, themeState),
      });
    }

    function setColour(key, value) {
      if (
        !Object.hasOwn(defaults, key) ||
        !Picker.validForTheme(value, themes.getState(), themeTokens)
      )
        return false;
      persist({ ...configuration, colours: { ...configuration.colours, [key]: copy(value) } });
      return true;
    }

    function setSize(value) {
      if (!validSize(value)) return false;
      persist({ ...configuration, size: value });
      return true;
    }

    function setShadow(key, profile) {
      const state = themes.getState();
      if (
        !Object.hasOwn(defaultShadows, key) ||
        !Object.hasOwn(state.shadows[state.theme], profile)
      )
        return false;
      persist({ ...configuration, shadows: { ...configuration.shadows, [key]: profile } });
      return true;
    }

    function reset() {
      persist(normalise());
    }

    function setMenuEnabled(value) {
      if (typeof value !== 'boolean') return false;
      persist({ ...configuration, menuEnabled: value });
      return true;
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function mount(host, { preview } = {}) {
      const document = host.ownerDocument;
      const fields = [];
      const pickers = {};
      const shadowFields = {};
      host.classList.add('card-tool');
      host.classList.add('ds-tool');

      function group(className) {
        const element = document.createElement('div');
        element.className = className;
        host.append(element);
        return element;
      }

      const colours = group('card-tool-colours');
      for (const [key, label] of Object.entries({
        background: 'Background',
        border: 'Border and lower edge',
      })) {
        const holder = document.createElement('div');
        colours.append(holder);
        pickers[key] = Picker.mount(holder, {
          themes,
          Field,
          label,
          paletteOnly: true,
          value: configuration.colours[key],
          defaultValue: defaults[key],
          onChange: (value) => setColour(key, value),
        });
      }

      const controls = group('card-tool-fields');
      const size = Field.mount(controls, {
        type: 'range',
        label: 'Size',
        attrs: { value: configuration.size, min: 160, max: 1200, step: 10 },
        onChange({ value }) {
          setSize(Number(value));
        },
      });
      fields.push(size);

      const menu = Field.mount(controls, {
        type: 'checkbox',
        switch: true,
        label: 'Card menu',
        attrs: { checked: configuration.menuEnabled },
        onChange({ value }) {
          setMenuEnabled(value);
        },
      });
      fields.push(menu);

      const profiles = themes.getState().shadows[themes.getState().theme];
      for (const [key, label] of Object.entries({
        rest: 'Shadow',
        interactive: 'Hover / focus shadow',
      })) {
        shadowFields[key] = Field.mount(controls, {
          kind: 'select',
          label,
          value: configuration.shadows[key],
          options: Object.entries(profiles).map(([value, profile]) => ({
            value,
            label: profile.label,
          })),
          onChange({ value }) {
            setShadow(key, value);
          },
        });
        fields.push(shadowFields[key]);
      }

      const actions = group('card-tool-actions');
      const resetButton = Button.mount(actions, {
        label: 'Reset to defaults',
        variant: 'secondary',
        onClick: reset,
      });
      const link = document.createElement('a');
      link.className = 'example-link';
      link.href = '#topschrank.tools.shadows';
      link.textContent = 'Edit shadow profiles →';
      actions.append(link);
      const note = document.createElement('p');
      note.className = 'card-tool-note';
      host.append(note);

      function update(state) {
        for (const [key, picker] of Object.entries(pickers)) picker.update(state.colours[key]);
        size.control.value = String(state.size);
        menu.control.checked = state.menuEnabled;
        for (const [key, field] of Object.entries(shadowFields))
          field.control.value = state.shadows[key];
        fields.forEach((field) => field.sync());
        size.element.querySelector('output').textContent = `${state.size} × ${state.size} px`;
        size.control.setAttribute('aria-valuetext', `${state.size} by ${state.size} pixels`);
        preview.style.setProperty('--card-preview-size', state.size + 'px');
        const themeState = themes.getState();
        const name = themeState.themes.find((theme) => theme.id === themeState.theme).label;
        note.textContent = `Saved to ${name} · Appearance/menu shared with Kanban · Size: preview only`;
      }

      update(getState());
      const unsubscribe = subscribe(update);
      return {
        destroy() {
          unsubscribe();
          fields.forEach((field) => field.destroy());
          Object.values(pickers).forEach((picker) => picker.destroy());
          resetButton.destroy();
          host.replaceChildren();
          host.classList.remove('card-tool');
          host.classList.remove('ds-tool');
          preview.style.removeProperty('--card-preview-size');
        },
      };
    }

    sync();
    const unsubscribeTheme = themes.subscribe(sync);
    return {
      getState,
      setColour,
      setSize,
      setShadow,
      setMenuEnabled,
      reset,
      subscribe,
      mount,
      destroy() {
        unsubscribeTheme();
        listeners.clear();
        for (const [token, value] of Object.entries(previous)) {
          if (value) target.style.setProperty(token, value);
          else target.style.removeProperty(token);
        }
      },
    };
  }

  return Object.freeze({ create, defaults, defaultSize, defaultShadows, validSize });
});
