/* Development tool only: excluded from Window runtime and export. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({ mode: 'modal', side: 'right', width: 480, duration: 220,
    closeOnEscape: true, closeOnBackdrop: true, showClose: true, lockScroll: true, resizable: true });
  function mount(host, { component, settings, Field = root.DesignSystemFormField } = {}) {
    const doc = host.ownerDocument, bar = doc.createElement('div');
    bar.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:18px;margin:24px 0';
    host.append(bar);
    settings?.defaults(defaults);
    const saved = settings?.snapshot() || {}, config = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof saved[key] === typeof defaults[key]) config[key] = saved[key];
    }
    component.update(config);
    const fields = [];
    function select(label, key, options) {
      const field = Field.mount(bar, {
        kind: 'select', label, value: String(config[key]),
        options: options.map(([value, label]) => ({ value, label })),
        onChange({ value }) {
          const next = key === 'width' || key === 'duration' ? Number(value) : value;
          component.update({ [key]: next });
          settings?.set(key, next);
        },
      });
      fields.push(field);
      return field;
    }
    select('Window mode', 'mode', [['modal', 'Popup'], ['side', 'Side panel']]);
    select('Panel side', 'side', [['right', 'Right'], ['left', 'Left']]);
    const width = Field.mount(bar, {
      type: 'number', label: 'Width (px)', unit: 'px',
      attrs: { value: config.width, min: 240, max: 1200, step: 1 }, suggestions: [320, 480, 720, 960],
      onChange({ value }) {
        const next = Number(value);
        if (!Number.isFinite(next) || next < 240 || next > 1200) return;
        component.update({ width: next });
        settings?.set('width', next);
      },
    });
    fields.push(width);
    select('Animation', 'duration', [['0', 'None'], ['220', 'Quick · 220 ms'], ['450', 'Smooth · 450 ms'], ['700', 'Slow · 700 ms']]);
    for (const [label, key, hint] of [
      ['Escape closes', 'closeOnEscape'], ['Backdrop click closes', 'closeOnBackdrop'], ['Show close button', 'showClose'],
      ['Lock page scroll', 'lockScroll', 'Off opens a non-modal window: the page behind it remains scrollable and interactive. Applies to workspace windows.'],
      ['Allow manual resize', 'resizable', 'Drag the corner or panel edge; keyboard arrows also resize. Each workspace window remembers its own size.'],
    ]) {
      fields.push(Field.mount(bar, {
        type: 'checkbox', switch: true, label, text: label, hint, attrs: { checked: config[key] },
        onChange({ value }) { component.update({ [key]: value }); settings?.set(key, value); },
      }));
    }
    function syncWidth(size) {
      if (!width.control || !size) return;
      width.control.value = String(size.width);
      width.sync();
    }
    const offResize = component.subscribeResize?.(syncWidth);
    // The host may restore an instance-specific size after mounting this tool.
    // Refresh the displayed width when opening without changing that size.
    const syncOnFocus = () => syncWidth(component.getSize?.());
    component.element.addEventListener('focusin', syncOnFocus);
    return { destroy() {
      offResize?.();
      component.element.removeEventListener('focusin', syncOnFocus);
      fields.forEach(field => field.destroy());
      bar.remove();
    } };
  }
  root.DesignSystemWindowTool = { mount, defaults };
})(globalThis);
