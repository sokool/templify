/* Authoring-only playground. Never imported by Window or the export entry point. */
(function (root) {
  'use strict';

  function mount(page, { windows } = {}) {
    const doc = page.ownerDocument;
    const resources = [], fields = new Map();
    const options = {
      mode: 'modal', side: 'right', size: 'md', duration: 220,
      resizable: true, closeOnEscape: true, closeOnBackdrop: true, showClose: true,
      lockScroll: true,
    };
    let view = null;
    let destroyed = false;
    const make = (tag, cls, text) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    };
    const demo = make('section', 'window-demo');
    page.append(demo);
    demo.append(make('p', 'example-lead', 'Try Window as a centred popup or a panel sliding from any screen edge.'));

    function button(host, label, onClick, variant = 'secondary') {
      const item = root.DesignSystemButtons.mount(host, { label, variant, onClick });
      resources.push(item);
      return item;
    }
    const toolbar = make('div', 'example-actions');
    demo.append(toolbar);
    const openButton = button(toolbar, 'Open window', () => view?.open(), 'primary');
    demo.append(make('p', 'example-status', 'Configure blocking windows before opening. Non-blocking windows allow live changes.'));

    const controls = make('div', 'window-demo-options');
    demo.append(controls);

    function group(title) {
      const node = make('fieldset', 'window-demo-group');
      node.append(make('legend', '', title));
      const body = make('div', 'window-demo-fields');
      node.append(body);
      controls.append(node);
      return body;
    }
    function field(host, key, config) {
      const item = root.DesignSystemFormField.mount(host, {
        id: 'window-demo-' + key, ...config,
        onChange({ value, eventType }) {
          if (eventType !== 'change') return;
          if (config.type === 'number') {
            if (!item.validate()) return;
            value = Number(value);
          }
          apply({ [key]: value });
        },
      });
      fields.set(key, item);
      resources.push(item);
      return item;
    }
    const select = (host, key, label, entries, hint) => field(host, key, {
      kind: 'select', label, hint, placeholder: key === 'size' ? 'Custom (resized)' : undefined,
      options: entries.map(([value, label]) => ({ value, label })),
    });
    const check = (host, key, label, hint) => field(host, key, { type: 'checkbox', switch: true, label, hint });
    const number = (host, key, label, min, max, unit) => field(host, key, {
      type: 'number', label, unit, attrs: { min, max, step: 1, required: true },
    });
    const layout = group('Layout and size');
    select(layout, 'mode', 'Layout', [['modal', 'Modal popup'], ['side', 'Side panel']]);
    select(layout, 'side', 'Side', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']], 'Used only by side panels.');
    select(layout, 'size', 'Size', [
      ['auto', 'Auto'], ['xs', 'XS'], ['sm', 'S'], ['md', 'M'], ['lg', 'L'], ['xl', 'XL'],
    ], 'Width for popups/left/right panels; height for top/bottom panels. Auto fits content.');
    check(layout, 'resizable', 'Resizable', 'Drag the handle, or focus it and use arrows (10 px), with Shift (50 px).');
    const behaviour = group('Behaviour');
    check(behaviour, 'lockScroll', 'Block background', 'lockScroll: blocks scrolling, background interaction and focus.');
    check(behaviour, 'closeOnEscape', 'Close on Escape');
    check(behaviour, 'closeOnBackdrop', 'Close on backdrop', 'Applies only when the background is blocked.');
    check(behaviour, 'showClose', 'Show close button');
    number(behaviour, 'duration', 'Animation duration', 0, 2000, 'ms');
    // Keep sample controls intact while updating the Window options.
    const body = make('div', 'window-demo-content'), footer = make('div', 'window-demo-footer');
    const add = item => (resources.push(item), item);
    const meta = make('div', 'window-demo-meta');
    meta.append(make('span', 'example-status', 'PRJ-2026-012 · Studio renovation'));
    body.append(meta, make('h3', '', 'A space for better ideas'),
      make('p', '', 'A warm, practical studio with oak storage, a generous worktop and softer lighting. Keep the final decisions together before the workshop starts production.'));
    const badge = add(root.DesignSystemBadges.mount(meta, { label: 'In progress' }));
    const owner = make('div');
    body.append(owner);
    add(root.DesignSystemUserIdentity.mount(owner, { name: 'Anna Kowalska', description: 'Project owner · Design team' }));
    const progressHost = make('div');
    body.append(progressHost);
    const progress = add(root.DesignSystemProgress.mount(progressHost, { label: 'Ready for production', value: 1, max: 3 }));
    let saved = false;
    const tasks = make('section', 'window-demo-tasks');
    tasks.append(make('h3', '', 'Before we begin'));
    body.append(tasks);
    const taskViews = ['Measurements approved', 'Materials selected', 'Drawings ready'].map((label, index) =>
      add(root.DesignSystemFormField.mount(tasks, {
        type: 'checkbox', label, attrs: { checked: index === 0 },
        onChange({ eventType }) { if (eventType === 'change') updateProject(); },
      })));
    add(root.DesignSystemFormField.mount(body, {
      kind: 'textarea', label: 'Project note', name: 'note',
      attrs: { rows: 3, placeholder: 'Add a material, finish or installation detail…' },
      onChange: markDirty,
    }));
    const noticeHost = make('div');
    body.append(noticeHost);
    const notice = add(root.DesignSystemNotifications.mount(noticeHost, {
      kind: 'info', title: 'Next review',
      message: 'Bring the approved drawings and material samples to the workshop on Friday.',
    }));
    button(footer, 'Cancel', () => { view.close('cancel'); refresh(); });
    const saveButton = button(footer, 'Save changes', () => {
      notice.update({ kind: 'success', title: 'Changes saved', message: 'Your note and checklist are ready for the next project review.' });
      saved = true;
      saveButton.update({ label: 'Saved' });
    }, 'primary');

    function markDirty() {
      if (!saved) return;
      saved = false;
      saveButton.update({ label: 'Save changes' });
    }
    function updateProject() {
      const completed = taskViews.filter(item => item.getValue()).length;
      progress.update({ value: completed });
      badge.update({ label: completed === taskViews.length ? 'Ready for production' : 'In progress' });
      markDirty();
    }

    function syncFields() {
      for (const [key, item] of fields) {
        const value = key === 'size' ? (view.element.dataset.size === 'custom' ? '' : view.element.dataset.size) : options[key];
        if (item.control.type === 'checkbox') item.control.checked = value;
        else item.control.value = value;
        item.control.disabled = key === 'side' && options.mode !== 'side';
        item.setError('');
        item.sync();
      }
    }
    function refresh() {
      openButton.update({ disabled: !view || view.element.open });
    }
    function apply(patch) {
      Object.assign(options, patch);
      view.update(patch);
      syncFields();
      refresh();
    }
    view = (windows?.forWindow('window.preview') || root.DesignSystemWindow).mount(demo, {
      ...options, title: 'Project details', content: body, footer,
      onOpen: refresh,
      onClose: refresh,
    });
    view.element.dataset.windowDemoPreview = 'true';
    const unsubscribe = view.subscribeResize(() => {
      syncFields();
      refresh();
    });
    syncFields();
    refresh();
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        unsubscribe();
        view.destroy();
        view = null;
        resources.reverse().forEach(item => item.destroy());
        demo.remove();
      },
    };
  }

  root.ExampleWindowDemo = Object.freeze({ mount });
})(globalThis);
