/* One field lifecycle shared by server-rendered HTML, exports and the classic mount API. */
(function (root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./validation.js') : root.DesignSystemFormValidation,
    common ? require('./controls.js') : root.DesignSystemFormControls);
  if (common) module.exports = api;
  else root.DesignSystemFormField = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Validation, Controls) {
  'use strict';
  let serial = 0;
  const instances = new WeakMap(), invalidForms = new WeakSet();
  const booleanAttrs = new Set(['required', 'disabled', 'readonly', 'multiple', 'checked', 'autofocus', 'formnovalidate']);
  const allowedAttrs = new Set(['name', 'value', ...booleanAttrs, 'placeholder', 'minlength', 'maxlength', 'min', 'max', 'step', 'pattern', 'autocomplete', 'form', 'accept', 'rows', 'cols', 'size', 'src', 'alt', 'inputmode', 'title', 'spellcheck', 'capture', 'dirname', 'formaction', 'formmethod', 'formenctype', 'formtarget']);
  function attrs(node, values = {}) {
    Object.entries(values).forEach(([key, value]) => {
      const name = key.toLowerCase();
      if (!allowedAttrs.has(name) && !name.startsWith('aria-')) return;
      if (value == null || value === false) return;
      node.setAttribute(name, booleanAttrs.has(name) ? '' : String(value));
    });
  }
  function node(doc, tag, className, text) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }
  function enhance(root, options = {}) {
    if (instances.has(root)) return instances.get(root);
    const doc = root.ownerDocument, kind = options.kind || root.dataset.kind || 'input';
    const controls = options.controls || ['input', 'textarea', 'select', 'button'].flatMap(tag => Array.from(root.querySelectorAll(tag))).filter(control =>
      !control.closest('.ds-field') || control.closest('.ds-field') === root);
    const control = controls[0];
    if (!control) return null;
    const type = control.getAttribute('type') || control.type || 'text';
    const caption = root.querySelector('.ds-field-caption'), label = root.querySelector('.ds-field-label');
    const error = root.querySelector('.ds-field-error'), hint = root.querySelector('.ds-field-hint');
    control.id ||= 'ds-field-' + (++serial);
    const config = {
      ...options, kind, label: options.label ?? label?.textContent ?? '',
      required: options.required ?? root.dataset.required === 'true',
    };
    const group = kind === 'checkbox-group' || kind === 'radio-group';
    const listeners = [];
    const listen = (target, type, callback, settings) => {
      target.addEventListener(type, callback, settings);
      listeners.push(() => target.removeEventListener(type, callback, settings));
    };
    const helper = !group ? Controls.enhance(control, root, listen, config) : null;
    const focusTarget = helper?.target || control;
    if (error) { error.id ||= control.id + '-error'; error.setAttribute('data-field-error', ''); }
    let touched = false, forcedError = '', groupError = '', groupMarker = null, groupMarkerText = '';
    function value() {
      if (group) return controls.filter(control => control.checked).map(control => control.value);
      if (type === 'checkbox' || type === 'radio') return control.checked;
      if (control.tagName === 'SELECT' && control.multiple) return Array.from(control.selectedOptions, option => option.value);
      if (type === 'file') return Array.from(control.files || []);
      return control.value;
    }
    function groupValidity() {
      if (!group) return;
      if (groupMarker && (groupMarker.validationMessage === groupMarkerText || !groupMarker.willValidate)) groupMarker.setCustomValidity('');
      groupMarker = null;
      groupError = root.disabled ? '' : Validation.groupMessage(controls, {
        ...config, required: config.required || config.attrs?.required || kind === 'radio-group' && controls.some(control => control.required),
      });
      const first = controls.find(control => !control.disabled && !control.matches(':disabled'));
      if (first && kind === 'checkbox-group' && groupError && !first.validity.customError) {
        first.setCustomValidity(groupError); groupMarker = first; groupMarkerText = groupError;
      }
    }
    function getError() {
      if (root.disabled) return '';
      if (group) { groupValidity(); return groupError || controls.map(control => Validation.message(control, config)).find(Boolean) || ''; }
      if (kind === 'actions') return '';
      return Validation.message(control, config);
    }
    function setError(text) {
      const message = String(text || ''), check = type === 'checkbox' || type === 'radio';
      if (error) { error.textContent = message ? (config.label && !check ? ' · ' : '') + message : ''; error.hidden = !message; }
      if (caption) caption.hidden = ['submit', 'reset', 'button', 'image'].includes(type) || (!config.label && !message);
      root.dataset.invalid = String(Boolean(message));
      for (const target of new Set([...controls, focusTarget])) {
        if (message) target.setAttribute('aria-invalid', 'true'); else target.removeAttribute('aria-invalid');
        const ids = new Set((target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        if (error) ids.delete(error.id);
        if (hint?.id) ids.add(hint.id);
        if (message && error) ids.add(error.id);
        if (ids.size) target.setAttribute('aria-describedby', [...ids].join(' ')); else target.removeAttribute('aria-describedby');
      }
    }
    function validate() {
      touched = true;
      const message = getError();
      setError(forcedError || message);
      return !message;
    }
    function sync() {
      helper?.sync();
      groupValidity();
      const output = root.querySelector('.ds-field-output');
      if (output) {
        output.textContent = type === 'file'
          ? (Array.from(control.files || [], file => file.name).join(', ') || 'No files selected.')
          : kind === 'textarea' ? control.value.length + (control.maxLength > 0 ? ' / ' + control.maxLength : '')
            : control.value + (root.dataset.unit ? ' ' + root.dataset.unit : '');
      }
    }
    function reset() {
      touched = false; forcedError = ''; setError(''); helper?.close?.();
      root.querySelectorAll('details').forEach(details => { details.open = false; }); sync();
    }
    controls.forEach(control => {
      for (const eventType of ['input', 'change']) listen(control, eventType, event => {
        sync();
        if (touched) validate();
        options.onChange?.({ value: value(), control, eventType, event });
      });
      listen(control, 'invalid', event => {
        event.preventDefault(); validate();
        const owner = control.form || root;
        if (!invalidForms.has(owner)) {
          invalidForms.add(owner); focusTarget.focus();
          queueMicrotask(() => invalidForms.delete(owner));
        }
      });
    });
    listen(doc, 'reset', event => {
      if (controls.some(control => control.form === event.target)) queueMicrotask(() => { if (!event.defaultPrevented) reset(); });
    }, true);
    const Observer = doc.defaultView?.MutationObserver;
    const observer = Observer ? new Observer(sync) : null;
    observer?.observe(group ? root : control, {
      attributes: true, subtree: true, childList: control.tagName === 'SELECT',
      attributeFilter: ['disabled', 'readonly', 'min', 'max', 'step', 'size', 'selected', 'value', 'required'],
    });
    if (options.onClick) listen(control, 'click', event => options.onClick({ control, event }));
    setError(''); sync();
    const api = {
      element: root, control, controls, focusTarget, getValue: value, getError, validate, setError, sync, reset,
      previewError(enabled, message) { forcedError = enabled ? (message || config.messages?.required || 'Check this value.') : ''; setError(forcedError || (touched ? getError() : '')); },
      focus() { focusTarget.focus(); },
      destroy() {
        observer?.disconnect();
        listeners.reverse().forEach(off => off());
        helper?.destroy();
        instances.delete(root);
        if (options.removeOnDestroy) root.remove();
      },
    };
    instances.set(root, api);
    return api;
  }
  function mount(host, config = {}) {
    const doc = host.ownerDocument, kind = config.kind || 'input', type = config.type || config.attrs?.type || 'text';
    const id = config.id || 'ds-field-' + (++serial), group = kind === 'checkbox-group' || kind === 'radio-group';
    const root = node(doc, group ? 'fieldset' : 'div', 'ds-component ds-field');
    root.dataset.kind = kind; root.dataset.type = type;
    if (config.quantity) root.dataset.quantity = 'true';
    if (config.required) root.dataset.required = 'true';
    if (config.unit) root.dataset.unit = config.unit;
    const caption = node(doc, group ? 'legend' : 'div', 'ds-field-caption');
    const label = node(doc, group ? 'span' : 'label', 'ds-field-label', config.label || '');
    if (!group) label.htmlFor = id;
    const error = node(doc, 'span', 'ds-field-error');
    error.id = id + '-error'; error.hidden = true; error.setAttribute('aria-live', 'polite');
    caption.append(label, error);
    const body = node(doc, 'div', 'ds-field-body');
    root.append(caption, body); host.append(root);
    const controls = [];
    function native(tag, inputType, values, controlId) {
      const control = node(doc, tag, 'ds-field-control');
      if (inputType) control.type = inputType;
      control.id = controlId; attrs(control, values);
      if (values.value != null && inputType !== 'file') control.defaultValue = control.value = String(values.value);
      controls.push(control); return control;
    }
    if (group) {
      root.classList.add('ds-field-choice-group');
      if (config.disabled) root.disabled = true;
      (config.options || []).forEach((option, index) => {
        const row = node(doc, 'label', 'ds-field-choice');
        const control = native('input', kind === 'radio-group' ? 'radio' : 'checkbox', {
          ...config.attrs, required: kind === 'radio-group' && config.required, ...option, name: config.name || config.attrs?.name,
        }, id + '-' + index);
        row.append(control, node(doc, 'span', '', option.label)); body.append(row);
      });
    } else if (kind === 'actions') {
      // Compatibility only; command menus are not showcased as form fields.
      const details = node(doc, 'details', 'ds-field-actions'), summary = node(doc, 'summary', 'ds-field-action-trigger', config.label || 'Form actions');
      summary.id = id; controls.push(summary); details.append(summary); label.hidden = true;
      for (const item of config.options || []) {
        const action = node(doc, 'button', 'ds-field-action', item.label);
        action.type = item.type || 'button'; attrs(action, item);
        action.addEventListener('click', event => { details.open = false; item.onClick?.(event); config.onAction?.(item, event); });
        details.append(action);
      }
      body.append(details);
    } else {
      const tag = kind === 'textarea' ? 'textarea' : kind === 'select' ? 'select' : kind === 'button' ? 'button' : 'input';
      const control = native(tag, tag === 'input' || tag === 'button' ? type : null, { ...config.attrs, name: config.name ?? config.attrs?.name }, id);
      if (tag === 'button') control.textContent = config.text || config.label || 'Continue';
      if (kind === 'select') {
        function appendOption(parent, option) {
          if (option.options) {
            const group = node(doc, 'optgroup'); group.label = option.label; group.disabled = Boolean(option.disabled);
            option.options.forEach(option => appendOption(group, option)); parent.append(group);
          } else {
            const element = node(doc, 'option', '', option.label);
            element.value = String(option.value ?? ''); element.disabled = Boolean(option.disabled); element.defaultSelected = Boolean(option.selected); parent.append(element);
          }
        }
        (config.options || []).forEach(option => appendOption(control, option));
        if (config.value !== undefined) {
          const values = new Set([].concat(config.value).map(String));
          Array.from(control.options).forEach(option => { option.selected = values.has(option.value); option.defaultSelected = option.selected; });
        }
      }
      if (type === 'checkbox' || type === 'radio') {
        root.classList.add('ds-field-check'); label.removeAttribute('for');
        const row = node(doc, 'label', 'ds-field-choice');
        row.htmlFor = id; row.append(control, node(doc, 'span', '', config.text || config.label)); body.append(row);
        if (config.switch) { control.setAttribute('role', 'switch'); control.classList.add('ds-field-switch'); }
      } else body.append(control);
      if (type === 'hidden') root.hidden = true;
      if (config.unit && type !== 'range') {
        root.classList.add('ds-field-unit'); body.append(node(doc, 'span', 'ds-field-unit-text', config.unit));
      }
      if (config.suggestions) {
        const list = node(doc, 'datalist'); list.id = id + '-suggestions';
        config.suggestions.forEach(value => { const option = node(doc, 'option'); option.value = typeof value === 'string' ? value : value.value; if (value.label) option.label = value.label; list.append(option); });
        control.setAttribute('list', list.id); body.append(list);
      }
      if (['range', 'color', 'file'].includes(type) || kind === 'textarea') {
        const output = node(doc, 'output', 'ds-field-output'); output.htmlFor = id; root.append(output);
      }
      if (!config.label && !config.text) control.setAttribute('aria-label', config.accessibleLabel || config.name || 'Value');
      if (['submit', 'reset', 'button', 'image'].includes(type)) {
        root.classList.add('ds-field-button'); caption.hidden = true;
        if (tag === 'input' && !control.value && type !== 'image') control.value = config.text || config.label || type;
      }
    }
    if (config.hint) {
      const hint = node(doc, 'p', 'ds-field-hint', config.hint); hint.id = id + '-hint'; root.append(hint);
    }
    if (!config.label) caption.hidden = true;
    return enhance(root, { ...config, kind, controls, removeOnDestroy: true });
  }
  return Object.freeze({ mount, enhance, get: element => instances.get(element) });
});
