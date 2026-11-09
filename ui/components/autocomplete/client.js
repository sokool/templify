import Autocomplete from './autocomplete.js';
import '../form/form.css';
import { bool, emit } from '../../runtime/dom.js';
export function init(element) {
  const input = element.querySelector('input[role="combobox"]'), field = input.closest('.ds-field');
  const items = [...element.querySelectorAll('[data-value]')].map(node => ({
    id: node.dataset.value, label: node.dataset.label || node.textContent.trim(),
    detail: node.dataset.detail, group: node.dataset.group, keywords: node.dataset.keywords,
    disabled: node.getAttribute('aria-disabled') === 'true', node,
  }));
  const query = input.value;
  const view = Autocomplete.mount(element, {
    hydrate: true, items,
    size: element.dataset.size, multiple: bool(element.dataset.multiple, false),
    name: element.dataset.name, value: items.filter(item => item.node.getAttribute('aria-selected') === 'true').map(item => item.id),
    disabled: input.disabled,
    field: { element: field, control: input,
      setError(message) { input.setCustomValidity(message); }, reset() { input.value = input.defaultValue; } },
    onChange: (value, detail) => emit(element, 'change', { value, query: detail.query }),
  });
  if (query) view.setQuery(query);
  return view;
}
