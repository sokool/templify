import Field from './field.js';
import { lifecycle } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element);
  function validate() {
    const fields = [...element.querySelectorAll('.ds-field')].filter(field => field.closest('form') === element);
    let valid = true;
    fields.forEach(field => {
      const view = Field.get(field);
      if (view && !view.validate()) valid = false;
    });
    [...element.elements].filter(input => !Field.get(input.closest('.ds-field'))).forEach(input => {
      const error = input.closest('.ds-field')?.querySelector('[data-field-error]');
      if (error) { error.textContent = input.validationMessage; error.hidden = input.validity.valid; }
      const field = input.closest('.ds-field');
      if (field) field.dataset.invalid = String(!input.validity.valid);
      input.setAttribute('aria-invalid', String(!input.validity.valid));
    });
    return valid && [...element.elements].every(input => !input.willValidate || input.validity.valid);
  }
  view.on(element, 'invalid', () => validate(), true);
  view.on(element, 'input', event => { if (event.target.hasAttribute('aria-invalid')) validate(); });
  view.on(element, 'reset', event => {
    queueMicrotask(() => { if (!event.defaultPrevented) element.querySelectorAll('.ds-field').forEach(field => Field.get(field)?.reset()); });
  });
  // No preventDefault: native submission and hx-post remain caller-owned.
  return { ...view, validate };
}
