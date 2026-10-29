/* Generic compact contrast checker. Colour math and theme state are injected. */
(function (root) {
  'use strict';

  function mount(
    host,
    {
      themes,
      contrast = root.PaletteGenerator?.contrast,
      Picker = root.PalettePicker,
      Buttons = root.DesignSystemButtons,
      tokens = root.DesignSystemThemes.tokens,
    } = {},
  ) {
    if (typeof contrast !== 'function') throw new TypeError('Supply a contrast calculator.');
    const document = host.ownerDocument;
    const defaults = {
      foreground: { kind: 'semantic', role: 'text' },
      background: { kind: 'semantic', role: 'panel' },
    };
    const pickers = {};

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function selections(state) {
      const saved = themes.getComponentSettings(state.theme, 'contrast-checker-tool') || {};
      return Object.fromEntries(
        Object.entries(defaults).map(([key, fallback]) => {
          const value = saved[key];
          const valid =
            value?.kind === 'custom'
              ? Picker.valid(value, tokens)
              : Picker.validForTheme(value, state, tokens);
          return [key, valid ? value : fallback];
        }),
      );
    }

    const description = element(
      'p',
      'example-status',
      'Compare two palette colours or custom HEX values. Choices follow the selected theme.',
    );
    const controls = element('div', 'ds-tool contrast-tool-controls');
    const preview = element('div', 'contrast-tool-preview', 'The quick brown fox · Aa 012');
    const result = element('p', 'contrast-tool-result');
    result.setAttribute('role', 'status');
    const note = element(
      'p',
      'example-status',
      'WCAG: AA text 4.5:1 · AAA text 7:1 · Large text / UI 3:1. This checks a pair, not the entire interface.',
    );
    host.append(description, controls, preview, result, note);

    for (const [key, label] of Object.entries({
      foreground: 'Foreground',
      background: 'Background',
    })) {
      const holder = element('div');
      controls.append(holder);
      pickers[key] = Picker.mount(holder, {
        themes,
        label,
        value: selections(themes.getState())[key],
        defaultValue: defaults[key],
        onChange(value) {
          const state = themes.getState();
          themes.setComponentSettings(state.theme, 'contrast-checker-tool', {
            ...selections(state),
            [key]: value,
          });
        },
      });
    }

    const actions = element('div');
    controls.append(actions);
    const reset = Buttons.mount(actions, {
      label: 'Use theme Text / Panel',
      variant: 'secondary',
      onClick() {
        themes.setComponentSettings(themes.getState().theme, 'contrast-checker-tool', defaults);
      },
    });

    function update(state) {
      const values = selections(state);
      for (const [key, picker] of Object.entries(pickers)) picker.update(values[key]);
      const foreground = Picker.resolve(values.foreground, state, tokens);
      const background = Picker.resolve(values.background, state, tokens);
      const comparison = contrast(foreground.colour, background.colour);
      preview.style.color = foreground.css;
      preview.style.background = background.css;
      result.textContent = `${comparison.ratio.toFixed(2)}:1 · AA ${comparison.aa ? '✓' : '✗'} · AAA ${comparison.aaa ? '✓' : '✗'} · Large text / UI ${comparison.large ? '✓' : '✗'}`;
      result.dataset.pass = String(comparison.aa);
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

  const api = { mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemContrastCheckerTool = api;
})(globalThis);
