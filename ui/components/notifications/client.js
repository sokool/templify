import { lifecycle, owned, emit } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element);
  function dismiss() { element.hidden = true; emit(element, 'dismiss', {}); }
  owned(element, '.ds-notification__dismiss').forEach(button => view.on(button, 'click', dismiss));
  return { ...view, dismiss };
}
