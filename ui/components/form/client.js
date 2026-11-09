import { lifecycle, owned } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element);
  function validate() {
    owned(element, 'input,select,textarea').forEach(input => {
      const error = input.closest('.ds-field')?.querySelector('[data-field-error]');
      if (error) { error.textContent = input.validationMessage; error.hidden = input.validity.valid; }
      const field = input.closest('.ds-field');
      if (field) field.dataset.invalid = String(!input.validity.valid);
      input.setAttribute('aria-invalid', String(!input.validity.valid));
    });
    return [...element.elements].every(input => !input.willValidate || input.validity.valid);
  }
  view.on(element, 'invalid', () => validate(), true);
  view.on(element, 'input', event => { if (event.target.hasAttribute('aria-invalid')) validate(); });
  view.on(element, 'reset', () => {
    owned(element, '[data-field-error]').forEach(node => { node.hidden = true; node.textContent = ''; });
    owned(element, '[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    owned(element, '.ds-field').forEach(node => { node.dataset.invalid = 'false'; });
  });
  // No preventDefault: native submission and hx-post remain caller-owned.
  return { ...view, validate };
}
