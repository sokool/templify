/* Host composition for generic tools; implementations live under design-system/tools. */
(function (root) {
  'use strict';

  function mount(host, { kind, themes } = {}) {
    if (kind === 'shadows')
      return root.DesignSystemShadowsTool.mount(host, { themes, title: 'Shadow profiles' });
    if (kind === 'contrast-checker')
      return root.DesignSystemContrastCheckerTool.mount(host, { themes });

    const document = host.ownerDocument;
    const Picker = root.PalettePicker;
    const defaults = {
      palette: { kind: 'semantic', role: 'accent' },
      custom: { kind: 'semantic', role: 'panel' },
    };
    const controls = document.createElement('div');
    controls.className = 'ds-tool example-tools-controls';
    const description = document.createElement('p');
    description.className = 'example-status';
    description.textContent =
      'The shared picker in palette-only and custom-enabled modes. Selections are saved to the active theme.';
    host.append(description, controls);
    const pickers = {};

    function selections(state) {
      const saved = themes.getComponentSettings(state.theme, 'palette-picker-tool') || {};
      return {
        palette: Picker.validForTheme(saved.palette, state, root.DesignSystemThemes.tokens)
          ? saved.palette
          : defaults.palette,
        custom: Picker.valid(saved.custom, root.DesignSystemThemes.tokens)
          ? saved.custom
          : defaults.custom,
      };
    }

    for (const [key, label] of Object.entries({
      palette: 'Palette only',
      custom: 'Custom allowed',
    })) {
      const holder = document.createElement('div');
      controls.append(holder);
      pickers[key] = Picker.mount(holder, {
        themes,
        label,
        paletteOnly: key === 'palette',
        value: selections(themes.getState())[key],
        defaultValue: defaults[key],
        onChange(value) {
          const state = themes.getState();
          themes.setComponentSettings(state.theme, 'palette-picker-tool', {
            ...selections(state),
            [key]: value,
          });
        },
      });
    }

    const actions = document.createElement('div');
    controls.append(actions);
    const reset = root.DesignSystemButtons.mount(actions, {
      label: 'Reset to defaults',
      variant: 'secondary',
      onClick() {
        themes.setComponentSettings(themes.getState().theme, 'palette-picker-tool', defaults);
      },
    });
    const status = document.createElement('p');
    status.className = 'example-status';
    host.append(status);

    function update(state) {
      const values = selections(state);
      for (const [key, picker] of Object.entries(pickers)) picker.update(values[key]);
      const name = state.themes.find((theme) => theme.id === state.theme).label;
      status.textContent = `Saved to ${name}. Shared by Card, Buttons, Progress and the shadow editor.`;
    }

    update(themes.getState());
    const unsubscribe = themes.subscribe(update);
    return {
      destroy() {
        unsubscribe();
        Object.values(pickers).forEach((picker) => picker.destroy());
        reset.destroy();
        host.replaceChildren();
      },
    };
  }

  root.ExampleTools = { mount };
})(globalThis);
