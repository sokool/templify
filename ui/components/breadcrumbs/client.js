import { lifecycle, owned } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element);
  const close = () => owned(element, 'details').forEach(node => { node.open = false; });
  view.on(element, 'click', event => { if (event.target.closest('a')) close(); });
  view.on(element, 'keydown', event => { if (event.key === 'Escape') { const open = owned(element, 'details[open]')[0]; close(); open?.querySelector('summary').focus(); } });
  view.on(element.ownerDocument, 'pointerdown', event => { if (!element.contains(event.target)) close(); });
  return { ...view, close };
}
