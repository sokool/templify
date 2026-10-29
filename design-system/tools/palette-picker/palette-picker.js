/* Generic palette picker tool. Components never import this editor module. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PalettePicker = api;
})(globalThis, function () {
  'use strict';
  let sequence = 0;
  function placement(anchor, size, viewport) {
    const gap = 6,
      pad = 8,
      width = Math.min(320, viewport.width - pad * 2),
      below = viewport.height - anchor.bottom - gap - pad,
      above = anchor.top - gap - pad,
      side = below >= size.height || below >= above ? 'below' : 'above',
      available = Math.max(60, side === 'below' ? below : above),
      height = Math.min(size.height, available);
    return {
      left: Math.max(pad, Math.min(anchor.left, viewport.width - width - pad)),
      top: side === 'below' ? anchor.bottom + gap : Math.max(pad, anchor.top - gap - height),
      width,
      maxHeight: available,
    };
  }
  const categories = ['brand', 'accent', 'greys'],
    hex = (value) => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value);
  function valid(value, roles) {
    return Boolean(
      value &&
      ((value.kind === 'custom' && hex(value.value)) ||
        (value.kind === 'semantic' && Object.hasOwn(roles, value.role)) ||
        (value.kind === 'palette' &&
          categories.includes(value.category) &&
          /^[a-z][a-z0-9-]*$/.test(value.id) &&
          hex(value.fallback))),
    );
  }
  function resolve(value, state, tokens) {
    if (value.kind === 'custom') return { css: value.value, colour: value.value, label: 'Custom' };
    if (value.kind === 'semantic')
      return {
        css: 'var(' + tokens[value.role] + ')',
        colour: state.palettes[state.theme][value.role],
        label: 'Theme · ' + value.role,
      };
    const item = state.colours[state.theme][value.category].find((c) => c.id === value.id);
    return {
      css: 'var(--ds-palette-' + value.category + '-' + value.id + ', ' + value.fallback + ')',
      colour: item?.value || value.fallback,
      label: item ? value.category + ' · ' + item.label : 'Saved fallback',
    };
  }
  function validForTheme(value, state, tokens) {
    return Boolean(
      valid(value, tokens) &&
      (value.kind === 'semantic' ||
        (value.kind === 'palette' &&
          state.colours[state.theme][value.category].some((item) => item.id === value.id))),
    );
  }
  function resolveTheme(value, state, tokens, defaultValue) {
    const selected = validForTheme(value, state, tokens) ? value : defaultValue;
    if (!validForTheme(selected, state, tokens))
      throw new TypeError('Supply a colour from the active theme.');
    const result = resolve(selected, state, tokens);
    if (selected.kind === 'palette')
      result.css = 'var(--ds-palette-' + selected.category + '-' + selected.id + ')';
    return result;
  }
  function mount(
    host,
    {
      themes,
      label = 'Colour',
      value,
      defaultValue = value,
      onChange,
      inherited,
      paletteOnly = false,
      Field = globalThis.DesignSystemFormField,
    } = {},
  ) {
    const doc = host.ownerDocument,
      tokens = globalThis.DesignSystemThemes.tokens;
    let selected = valid(value, tokens) ? value : defaultValue,
      state = themes.getState();
    if (!valid(selected, tokens)) throw new TypeError('Supply a valid initial colour selection.');
    if (!valid(defaultValue, tokens)) defaultValue = selected;
    if (paletteOnly && !validForTheme(defaultValue, state, tokens))
      throw new TypeError('Supply a default colour from the active theme.');
    const selectionValid = (value) =>
        paletteOnly ? validForTheme(value, state, tokens) : valid(value, tokens),
      selection = () =>
        paletteOnly
          ? resolveTheme(selected, state, tokens, defaultValue)
          : resolve(selected, state, tokens);
    const make = (tag, cls, text) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const trigger = make('button', 'palette-picker-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Choose ' + label.toLowerCase());
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const chip = make('i'),
      text = make('span'),
      name = make('strong', '', label),
      summary = make('small');
    text.append(name, summary);
    trigger.append(chip, text);
    host.append(trigger);
    const body = make('div', 'palette-picker-content'),
      note = make('p', 'palette-picker-note'),
      choices = make('div', 'palette-picker-groups'),
      custom = make('div', 'palette-picker-custom');
    body.append(note, choices, custom);
    const wellLabel = make('label');
    wellLabel.append(make('span', '', 'Custom'));
    const well = make('input');
    well.type = 'color';
    well.setAttribute('aria-label', label + ' custom colour');
    wellLabel.append(well);
    custom.append(wellLabel);
    const input = paletteOnly
      ? null
      : Field.mount(custom, {
          label: 'Custom HEX',
          attrs: { maxlength: 7, placeholder: '#123456' },
          onChange({ value }) {
            if (!hex(value)) {
              input.setError('Use six-digit HEX.');
              return;
            }
            input.setError('');
            choose({ kind: 'custom', value: value.toUpperCase() });
          },
        });
    if (paletteOnly) custom.remove();
    well.addEventListener('input', () =>
      choose({ kind: 'custom', value: well.value.toUpperCase() }),
    );
    const popup = make('div', 'palette-picker-popup ds-tool');
    popup.id = 'palette-picker-' + ++sequence;
    popup.setAttribute('popover', 'auto');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', label);
    trigger.setAttribute('aria-controls', popup.id);
    const header = make('div', 'palette-picker-header'),
      title = make('strong', '', label),
      dismiss = make('button', '', '×');
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Close colour picker');
    header.append(title, dismiss);
    popup.append(header, body);
    doc.body.append(popup);
    let opened = false,
      frame = null;
    function position() {
      if (!opened) return;
      const anchor = trigger.getBoundingClientRect(),
        viewport = { width: doc.documentElement.clientWidth, height: doc.defaultView.innerHeight };
      if (anchor.bottom < 0 || anchor.top > viewport.height) {
        close(false);
        return;
      }
      popup.style.maxHeight = 'none';
      const box = popup.getBoundingClientRect(),
        pos = placement(anchor, { height: box.height }, viewport);
      popup.style.left = pos.left + 'px';
      popup.style.top = pos.top + 'px';
      popup.style.width = pos.width + 'px';
      popup.style.maxHeight = pos.maxHeight + 'px';
    }
    function schedule() {
      if (!opened || frame !== null) return;
      frame = doc.defaultView.requestAnimationFrame(() => {
        frame = null;
        position();
      });
    }
    function close(restore = true) {
      if (!opened) return;
      opened = false;
      popup.hidePopover();
      trigger.setAttribute('aria-expanded', 'false');
      if (restore) trigger.focus({ preventScroll: true });
    }
    function toggle(event) {
      opened = event.newState === 'open';
      trigger.setAttribute('aria-expanded', String(opened));
    }
    function keydown(event) {
      if (opened && event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }
    function focusOutside(event) {
      if (opened && !popup.contains(event.target) && event.target !== trigger) close(false);
    }
    popup.addEventListener('toggle', toggle);
    popup.addEventListener('keydown', keydown);
    dismiss.addEventListener('click', () => close());
    doc.addEventListener('focusin', focusOutside);
    doc.addEventListener('scroll', schedule, true);
    doc.defaultView.addEventListener('resize', schedule);
    const reset = make('button', 'palette-picker-default', 'Use theme default');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      choose(defaultValue);
      close();
    });
    body.append(reset);
    trigger.addEventListener('click', () => {
      if (opened) {
        close();
        return;
      }
      input?.setError('');
      paint();
      popup.style.width = Math.min(320, doc.documentElement.clientWidth - 16) + 'px';
      popup.showPopover();
      opened = true;
      trigger.setAttribute('aria-expanded', 'true');
      position();
    });
    function choose(next) {
      if (!selectionValid(next)) return;
      selected = next;
      paint();
      onChange?.({ ...next }, selection().css);
    }
    function paint() {
      if (paletteOnly && !selectionValid(selected)) selected = defaultValue;
      const current =
        inherited && JSON.stringify(selected) === JSON.stringify(defaultValue)
          ? inherited()
          : selection();
      chip.style.background = current.colour;
      summary.textContent = current.colour + ' · ' + current.label;
      note.textContent =
        state.themes.find((t) => t.id === state.theme).label + ' · ' + current.label;
      well.value = current.colour;
      if (input && doc.activeElement !== input.control) input.control.value = current.colour;
      choices.replaceChildren();
      for (const category of categories) {
        const section = make('section');
        section.append(
          make(
            'h3',
            '',
            category === 'greys' ? 'Greys' : category[0].toUpperCase() + category.slice(1),
          ),
        );
        const row = make('div', 'palette-picker-swatches');
        for (const item of state.colours[state.theme][category]) {
          const button = make('button');
          button.type = 'button';
          button.style.background = item.value;
          button.setAttribute('aria-label', category + ' · ' + item.label + ' · ' + item.value);
          const active =
            selected.kind === 'palette' &&
            selected.category === category &&
            selected.id === item.id;
          button.setAttribute('aria-pressed', String(active));
          if (active) button.append(make('span', '', '✓'));
          button.addEventListener('click', () => {
            choose({ kind: 'palette', category, id: item.id, fallback: item.value });
            close();
          });
          row.append(button);
        }
        if (!row.childNodes.length) row.append(make('small', '', 'No colours'));
        section.append(row);
        choices.append(section);
      }
    }
    const off = themes.subscribe((next) => {
      state = next;
      paint();
    });
    paint();
    return {
      element: trigger,
      getValue: () => ({ ...selected }),
      getCSS: () => selection().css,
      update(value) {
        state = themes.getState();
        if (!selectionValid(value)) return false;
        selected = value;
        paint();
        return true;
      },
      destroy() {
        off();
        if (frame !== null) doc.defaultView.cancelAnimationFrame(frame);
        doc.removeEventListener('focusin', focusOutside);
        doc.removeEventListener('scroll', schedule, true);
        doc.defaultView.removeEventListener('resize', schedule);
        popup.removeEventListener('toggle', toggle);
        popup.removeEventListener('keydown', keydown);
        if (opened) popup.hidePopover();
        input?.destroy();
        popup.remove();
        trigger.remove();
      },
    };
  }
  return Object.freeze({ mount, valid, resolve, validForTheme, resolveTheme, placement });
});
