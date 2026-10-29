/* Generic shadow editor, shared by Palette and Tools. Components consume CSS variables. */
(function (root) {
  'use strict';

  function mount(
    host,
    {
      themes,
      title = 'Shadows',
      Field = root.DesignSystemFormField,
      Buttons = root.DesignSystemButtons,
      Picker = root.PalettePicker,
      Shadows = root.DesignSystemShadows,
    } = {},
  ) {
    const document = host.ownerDocument;
    const controls = [];
    const fields = {};
    function selectedProfile(state) {
      const value = themes.getComponentSettings(state.theme, 'shadows-tool')?.profile;
      return value !== 'none' && Object.hasOwn(Shadows.defaults, value) ? value : 'soft';
    }
    let selected = selectedProfile(themes.getState());

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    host.classList.add('palette-shadow-section');
    const heading = element('h2', 'palette-section-title', title);
    const description = element(
      'p',
      'palette-note',
      'Edit reusable shadow profiles for this theme. Colour comes from its palette.',
    );
    const samples = element('div', 'palette-shadow-samples');
    for (const [id, profile] of Object.entries(Shadows.defaults)) {
      const tile = element('div', 'palette-shadow-sample');
      const surface = element('div', 'palette-shadow-surface', 'Aa');
      surface.style.boxShadow = `var(--ds-shadow-${id})`;
      tile.append(surface, element('strong', '', profile.label));
      samples.append(tile);
    }

    const editor = element('div', 'palette-shadow-editor');
    editor.classList.add('ds-tool');
    const selection = element('div', 'palette-shadow-selection');
    const sliders = element('div', 'palette-shadow-sliders');
    const actions = element('div', 'palette-shadow-actions');
    const status = element('p', 'palette-note');
    status.setAttribute('role', 'status');
    editor.append(selection, sliders, actions, status);
    host.append(heading, description, samples, editor);

    function apply(values) {
      try {
        themes.setShadow(themes.getState().theme, selected, values);
      } catch (error) {
        status.textContent = error.message;
      }
    }

    const profile = Field.mount(selection, {
      kind: 'select',
      label: 'Shadow profile',
      value: selected,
      options: Object.entries(Shadows.defaults)
        .filter(([id]) => id !== 'none')
        .map(([value, definition]) => ({ value, label: definition.label })),
      onChange({ value }) {
        themes.setComponentSettings(themes.getState().theme, 'shadows-tool', { profile: value });
      },
    });
    controls.push(profile);

    const colourHost = element('div');
    selection.append(colourHost);
    const initial = themes.getState().shadows[themes.getState().theme][selected];
    const colour = Picker.mount(colourHost, {
      themes,
      Field,
      label: 'Shadow colour',
      paletteOnly: true,
      value: initial.colour,
      defaultValue: { kind: 'semantic', role: 'text' },
      onChange(value) {
        apply({ colour: value });
      },
    });
    controls.push(colour);

    for (const [key, label] of Object.entries({
      x: 'Horizontal offset',
      y: 'Vertical offset',
      blur: 'Blur',
      spread: 'Spread',
      opacity: 'Opacity',
    })) {
      const [min, max] = Shadows.ranges[key];
      fields[key] = Field.mount(sliders, {
        type: 'range',
        label,
        attrs: { value: initial[key], min, max, step: 1 },
        onChange({ value }) {
          apply({ [key]: Number(value) });
        },
      });
      controls.push(fields[key]);
    }

    controls.push(
      Buttons.mount(actions, {
        label: 'Reset shadow profile',
        variant: 'secondary',
        onClick() {
          themes.resetShadow(themes.getState().theme, selected);
        },
      }),
    );

    function update(state) {
      selected = selectedProfile(state);
      const definition = state.shadows[state.theme][selected];
      profile.control.value = selected;
      profile.sync();
      colour.update(definition.colour);
      for (const [key, field] of Object.entries(fields)) {
        const unit = key === 'opacity' ? '%' : 'px';
        field.control.value = String(definition[key]);
        field.control.setAttribute('aria-valuetext', `${definition[key]} ${unit}`);
        field.sync();
        field.element.querySelector('output').textContent = `${definition[key]} ${unit}`;
      }
      const name = state.themes.find((theme) => theme.id === state.theme).label;
      status.textContent = `${name} · ${definition.label} · saved automatically. None is always shadow-free.`;
    }

    update(themes.getState());
    const unsubscribe = themes.subscribe(update);
    return {
      destroy() {
        unsubscribe();
        controls.forEach((control) => control.destroy());
        host.replaceChildren();
        host.classList.remove('palette-shadow-section');
      },
    };
  }

  const api = { mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemShadowsTool = api;
})(globalThis);
