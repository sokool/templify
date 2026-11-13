/* Shared native-control enhancements for HTML templates and the classic field API. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./pickers.js') : root.DesignSystemFormPickers);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemFormControls = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Pickers) {
  'use strict';
  let serial = 0;
  const hiddenState = new WeakMap();
  function node(doc, tag, className, text) {
    const element = doc.createElement(tag);
    element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }
  function button(doc, className, text, label) {
    const element = node(doc, 'button', className, text);
    element.type = 'button';
    if (label) element.setAttribute('aria-label', label);
    return element;
  }
  function events(control) {
    for (const type of ['input', 'change']) control.dispatchEvent(new control.ownerDocument.defaultView.Event(type, { bubbles: true }));
  }
  function name(control, root) {
    return root.querySelector('.ds-field-label')?.textContent || control.getAttribute('aria-label') || control.name || 'value';
  }
  function labelTarget(control, root, target) {
    const label = root.querySelector('.ds-field-label');
    if (label?.textContent) {
      label.id ||= control.id + '-label';
      target.setAttribute('aria-labelledby', label.id);
      if (label.tagName === 'LABEL') label.htmlFor = target.id;
    } else target.setAttribute('aria-label', control.getAttribute('aria-label') || control.name || 'Value');
  }
  function hide(control) {
    hiddenState.set(control, { tabindex: control.getAttribute('tabindex'), ariaHidden: control.getAttribute('aria-hidden') });
    control.classList.add('ds-field-native');
    control.tabIndex = -1;
    control.setAttribute('aria-hidden', 'true');
  }
  function restore(control) {
    control.classList.remove('ds-field-native');
    const saved = hiddenState.get(control);
    for (const [attribute, value] of [['tabindex', saved?.tabindex], ['aria-hidden', saved?.ariaHidden]]) {
      if (value == null) control.removeAttribute(attribute); else control.setAttribute(attribute, value);
    }
    hiddenState.delete(control);
    const label = control.closest('.ds-field')?.querySelector('.ds-field-label');
    if (label?.tagName === 'LABEL') label.htmlFor = control.id;
  }
  function popup(root, trigger, panel, listen) {
    let opened = false, topLayer = false;
    const win = root.ownerDocument.defaultView;
    if (typeof panel.showPopover === 'function') panel.setAttribute('popover', 'manual');
    panel.hidden = true;
    root.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id);
    function close(focus = false) {
      // Persistent controls must not mutate the document on unrelated clicks:
      // observers (for example Search) could otherwise replace the clicked row.
      if (!opened) { if (focus) trigger.focus(); return; }
      opened = false;
      if (topLayer) { panel.hidePopover(); topLayer = false; }
      panel.hidden = true;
      root.dataset.open = 'false';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (focus) trigger.focus();
    }
    function position() {
      if (!opened) return;
      const viewportWidth = Math.min(win.innerWidth, root.ownerDocument.documentElement.clientWidth || win.innerWidth);
      const viewportHeight = Math.min(win.innerHeight, root.ownerDocument.documentElement.clientHeight || win.innerHeight);
      const anchor = trigger.getBoundingClientRect();
      panel.style.position = topLayer ? 'fixed' : 'absolute';
      panel.style.insetInlineStart = topLayer ? anchor.left + 'px' : '0px';
      panel.style.top = topLayer ? anchor.bottom + 5 + 'px' : 'calc(100% + 5px)';
      panel.style.bottom = 'auto';
      if (topLayer && panel.classList.contains('ds-select-list')) panel.style.width = anchor.width + 'px';
      panel.style.maxHeight = '';
      const preferred = Number.parseFloat(win.getComputedStyle(panel).maxHeight) || Infinity;
      panel.style.maxHeight = Math.min(preferred, Math.max(100, viewportHeight - 24)) + 'px';
      const rect = panel.getBoundingClientRect();
      const shift = Math.max(12 - rect.left, Math.min(0, viewportWidth - 12 - rect.right));
      panel.style.insetInlineStart = (topLayer ? anchor.left + shift : shift) + 'px';
      const below = viewportHeight - anchor.bottom - 12, above = anchor.top - 12;
      if (rect.height > below && above > below) {
        panel.style.maxHeight = Math.min(preferred, Math.max(100, above - 5)) + 'px';
        if (topLayer) panel.style.top = Math.max(12, anchor.top - Math.min(rect.height, Math.max(100, above - 5)) - 5) + 'px';
        else { panel.style.top = 'auto'; panel.style.bottom = 'calc(100% + 5px)'; }
      } else panel.style.maxHeight = Math.min(preferred, Math.max(100, below - 5)) + 'px';
    }
    function open() {
      if (trigger.disabled) return;
      opened = true;
      panel.hidden = false;
      if (typeof panel.showPopover === 'function') {
        try { panel.showPopover(); topLayer = true; } catch { panel.removeAttribute('popover'); }
      }
      root.dataset.open = 'true';
      trigger.setAttribute('aria-expanded', 'true');
      position();
    }
    listen(root.ownerDocument, 'pointerdown', event => { if (!root.contains(event.target)) close(); });
    listen(root.ownerDocument, 'focusin', event => { if (!root.contains(event.target)) close(); });
    listen(root, 'keydown', event => {
      if (event.key === 'Escape' && opened) { event.preventDefault(); event.stopPropagation(); close(true); }
    });
    listen(win, 'resize', position);
    listen(root.ownerDocument, 'scroll', event => { if (!panel.contains(event.target)) position(); }, true);
    const observer = win.ResizeObserver ? new win.ResizeObserver(position) : null;
    observer?.observe(panel);
    return { open, close, destroy() { close(); observer?.disconnect(); }, get opened() { return opened; } };
  }
  function select(control, root, listen, options) {
    const doc = control.ownerDocument, body = control.parentNode, multiple = control.multiple;
    const trigger = multiple ? null : button(doc, 'ds-field-control ds-select-trigger');
    const list = node(doc, 'div', 'ds-select-list' + (multiple ? ' ds-select-multiple' : ' ds-field-popup'));
    list.id = control.id + '-list';
    list.setAttribute('role', 'listbox');
    if (multiple) { list.tabIndex = 0; list.setAttribute('aria-multiselectable', 'true'); }
    const target = trigger || list;
    target.id ||= control.id + '-trigger';
    labelTarget(control, root, target);
    if (multiple) {
      const label = root.querySelector('.ds-field-label');
      if (label?.tagName === 'LABEL') listen(label, 'click', event => { event.preventDefault(); target.focus(); });
    } else list.setAttribute(target.hasAttribute('aria-labelledby') ? 'aria-labelledby' : 'aria-label',
      target.getAttribute('aria-labelledby') || target.getAttribute('aria-label'));
    let value;
    if (trigger) {
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-haspopup', 'listbox');
      value = node(doc, 'span', 'ds-select-value');
      trigger.append(value, node(doc, 'span', 'ds-field-chevron'));
      body.append(trigger);
    }
    body.append(list);
    body.classList.add('ds-select');
    hide(control);
    const surface = trigger ? popup(root, trigger, list, listen) : null;
    let rows = [], active = -1, anchor = -1, keyboard = false, search = '', timer;
    const disabled = option => control.disabled || control.matches(':disabled') || option.disabled || option.parentElement?.disabled;
    function paint() {
      rows.forEach((row, index) => {
        row.dataset.active = String(keyboard && index === active);
        row.setAttribute('aria-selected', String(control.options[index].selected));
        row.setAttribute('aria-disabled', String(Boolean(disabled(control.options[index]))));
      });
      if (rows[active] && (multiple || surface.opened)) target.setAttribute('aria-activedescendant', rows[active].id);
      else target.removeAttribute('aria-activedescendant');
    }
    function choose(index, extend = false) {
      if (!control.options[index] || disabled(control.options[index])) return;
      if (multiple) {
        if (extend && anchor >= 0) {
          Array.from(control.options).forEach((option, i) => {
            if (i >= Math.min(anchor, index) && i <= Math.max(anchor, index) && !disabled(option)) option.selected = true;
          });
        } else { control.options[index].selected = !control.options[index].selected; anchor = index; }
      } else control.selectedIndex = index;
      active = index;
      sync();
      surface?.close();
      target.focus();
      events(control);
    }
    function rebuild() {
      rows = [];
      list.replaceChildren();
      let group = null, container = list;
      Array.from(control.options).forEach((option, index) => {
        if (option.parentElement.tagName === 'OPTGROUP' && option.parentElement !== group) {
          group = option.parentElement;
          container = node(doc, 'div', 'ds-select-options-group');
          container.setAttribute('role', 'group'); container.setAttribute('aria-label', group.label);
          const heading = node(doc, 'div', 'ds-select-group', option.parentElement.label);
          heading.setAttribute('aria-hidden', 'true'); container.append(heading); list.append(container);
        } else if (option.parentElement.tagName !== 'OPTGROUP') { group = null; container = list; }
        const row = node(doc, 'div', 'ds-select-option', option.label);
        row.id = list.id + '-' + index;
        row.setAttribute('role', 'option');
        row.dataset.placeholder = String(option.value === '');
        rows.push(row);
        container.append(row);
      });
    }
    function sync() {
      if (rows.length !== control.options.length || rows.some((row, i) => row.textContent !== control.options[i].label)) rebuild();
      const unavailable = control.disabled || control.matches(':disabled');
      if (trigger) {
        trigger.disabled = unavailable;
        value.textContent = control.selectedOptions[0]?.label || options.placeholder || control.dataset.placeholder || 'Choose an option…';
        trigger.dataset.placeholder = String(!control.value);
        if (unavailable) surface.close();
      } else {
        list.tabIndex = unavailable ? -1 : 0;
        list.setAttribute('aria-disabled', String(unavailable));
        list.style.setProperty('--ds-select-rows', String(control.size || 5));
      }
      paint();
    }
    function open() {
      surface.open();
      active = control.selectedIndex;
      keyboard = false;
      paint();
      rows[active]?.scrollIntoView?.({ block: 'nearest' });
    }
    function move(key) {
      const enabled = Array.from(control.options, (option, index) => disabled(option) ? -1 : index).filter(index => index >= 0);
      if (!enabled.length) return;
      const position = enabled.indexOf(active);
      active = key === 'Home' ? enabled[0] : key === 'End' ? enabled[enabled.length - 1]
        : enabled[Math.max(0, Math.min(enabled.length - 1, position + (key === 'ArrowDown' ? 1 : -1)))];
      keyboard = true;
      paint();
      rows[active]?.scrollIntoView?.({ block: 'nearest' });
    }
    listen(list, 'pointerdown', event => event.preventDefault());
    listen(list, 'click', event => {
      const index = rows.indexOf(event.target.closest('[role=option]'));
      if (index >= 0) { keyboard = false; choose(index, event.shiftKey); }
    });
    if (trigger) listen(trigger, 'click', () => surface.opened ? surface.close() : open());
    listen(target, 'keydown', event => {
      if (control.disabled || control.matches(':disabled')) return;
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (surface && !surface.opened) {
          open();
          if (event.key === 'Enter' || event.key === ' ') return;
        }
        if (event.key === 'Enter' || event.key === ' ') choose(active, event.shiftKey);
        else move(event.key);
      } else if (event.key === 'Tab') surface?.close();
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        search += event.key.toLocaleLowerCase();
        clearTimeout(timer);
        timer = setTimeout(() => { search = ''; }, 600);
        const index = Array.from(control.options).findIndex(option => !disabled(option) && option.label.toLocaleLowerCase().startsWith(search));
        if (index >= 0) {
          if (surface && !surface.opened) open();
          active = index; keyboard = true; paint();
          rows[active]?.scrollIntoView?.({ block: 'nearest' });
        }
      }
    });
    sync();
    return {
      target, sync, close: () => surface?.close(),
      destroy() { clearTimeout(timer); surface?.destroy(); target.remove(); if (trigger) list.remove(); restore(control); },
    };
  }
  function number(control, root, listen) {
    const doc = control.ownerDocument, body = control.parentNode, quantity = root.dataset.quantity === 'true';
    const wrapper = node(doc, 'div', quantity ? 'ds-number-buttons' : 'ds-number-arrows');
    const buttons = quantity
      ? [button(doc, 'ds-field-stepper', '−', 'Decrease ' + name(control, root)), button(doc, 'ds-field-stepper', '+', 'Increase ' + name(control, root))]
      : [button(doc, 'ds-number-arrow ds-number-up', '', 'Increase ' + name(control, root)), button(doc, 'ds-number-arrow ds-number-down', '', 'Decrease ' + name(control, root))];
    if (quantity) {
      root.classList.add('ds-field-quantity');
      body.prepend(buttons[0]); body.append(buttons[1]);
    } else { wrapper.append(...buttons); body.append(wrapper); root.classList.add('ds-field-number'); }
    function sync() {
      buttons.forEach((b, i) => {
        const up = quantity ? i === 1 : i === 0;
        b.disabled = control.disabled || control.matches(':disabled') || control.readOnly || control.step === 'any' ||
          (control.value !== '' && (up ? control.max !== '' && control.valueAsNumber >= Number(control.max) : control.min !== '' && control.valueAsNumber <= Number(control.min)));
      });
    }
    buttons.forEach((b, i) => listen(b, 'click', () => {
      if (b.disabled) return;
      try { (quantity ? i === 1 : i === 0) ? control.stepUp() : control.stepDown(); } catch { return; }
      sync(); events(control);
    }));
    sync();
    return {
      target: control, sync,
      destroy() { buttons.forEach(b => b.remove()); wrapper.remove(); root.classList.remove('ds-field-number'); root.classList.remove('ds-field-quantity'); },
    };
  }
  function range(control, root) {
    const originalValueText = control.getAttribute('aria-valuetext');
    function sync() {
      const min = control.min === '' ? 0 : Number(control.min), max = control.max === '' ? 100 : Number(control.max);
      const progress = max > min ? Math.max(0, Math.min(100, (Number(control.value) - min) / (max - min) * 100)) : 0;
      control.style.setProperty('--ds-range-progress', progress + '%');
      if (root.dataset.unit) control.setAttribute('aria-valuetext', control.value + ' ' + root.dataset.unit);
    }
    sync();
    return {
      target: control, sync,
      destroy() {
        control.style.removeProperty('--ds-range-progress');
        if (originalValueText == null) control.removeAttribute('aria-valuetext'); else control.setAttribute('aria-valuetext', originalValueText);
      },
    };
  }
  function suggestions(control, root, listen) {
    const doc = control.ownerDocument, id = control.getAttribute('list'), source = doc.getElementById(id);
    if (!source) return null;
    const list = node(doc, 'div', 'ds-select-list ds-field-popup');
    list.id = control.id + '-suggestions-' + (++serial);
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', name(control, root) + ' suggestions');
    control.parentNode.append(list);
    control.removeAttribute('list');
    control.setAttribute('role', 'combobox');
    control.setAttribute('aria-autocomplete', 'list');
    control.setAttribute('aria-haspopup', 'listbox');
    const surface = popup(root, control, list, listen);
    let matches = [], active = -1;
    function paint() {
      Array.from(list.children).forEach((row, index) => {
        row.dataset.active = String(index === active);
        row.setAttribute('aria-selected', String(matches[index].value === control.value));
      });
      if (list.children[active]) {
        control.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView?.({ block: 'nearest' });
      } else control.removeAttribute('aria-activedescendant');
    }
    function open() {
      if (control.disabled || control.readOnly) return;
      const query = control.value.toLocaleLowerCase();
      matches = Array.from(source.options).filter(option => (option.value + ' ' + option.label).toLocaleLowerCase().includes(query));
      list.replaceChildren(...matches.map((option, index) => {
        const row = node(doc, 'div', 'ds-select-option', option.label || option.value);
        row.id = list.id + '-' + index; row.setAttribute('role', 'option'); row.dataset.index = index;
        return row;
      }));
      active = -1; paint();
      if (matches.length) surface.open(); else surface.close();
    }
    function choose(index) {
      if (!matches[index]) return;
      control.value = matches[index].value;
      events(control); surface.close(true);
    }
    listen(control, 'input', open);
    listen(control, 'click', open);
    listen(list, 'pointerdown', event => event.preventDefault());
    listen(list, 'click', event => {
      const row = event.target.closest('[data-index]');
      if (row) choose(Number(row.dataset.index));
    });
    listen(control, 'keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!surface.opened) open();
        active = Math.max(0, Math.min(matches.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); paint();
      } else if (event.key === 'Enter' && surface.opened && active >= 0) { event.preventDefault(); choose(active); }
      else if (event.key === 'Tab') surface.close();
    });
    return {
      target: control, sync() { if (control.disabled || control.readOnly) surface.close(); }, close: surface.close,
      destroy() {
        surface.destroy(); list.remove(); control.setAttribute('list', id);
        for (const attr of ['role', 'aria-autocomplete', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-activedescendant']) control.removeAttribute(attr);
      },
    };
  }
  function enhance(control, root, listen, options = {}) {
    if (control.tagName === 'SELECT') return select(control, root, listen, options);
    if (control.type === 'number') return number(control, root, listen);
    if (control.type === 'range') return range(control, root);
    if (['date', 'time', 'datetime-local', 'month', 'week', 'color'].includes(control.getAttribute('type'))) {
      return Pickers.enhance(control, root, listen, { node, button, events, labelTarget, hide, restore, popup });
    }
    if (control.getAttribute('list')) return suggestions(control, root, listen);
    return null;
  }
  return Object.freeze({ enhance });
});
