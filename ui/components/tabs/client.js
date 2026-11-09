import { lifecycle, owned, emit } from '../../runtime/dom.js';

export function init(element) {
  const view = lifecycle(element), tabs = owned(element, '[role="tab"]');
  const panel = tab => owned(element, '[role="tabpanel"]').find(node => node.id === tab.getAttribute('aria-controls'));
  function select(id, notify = false) {
    const active = tabs.find(tab => tab.id === id && !tab.disabled);
    if (!active) return false;
    tabs.forEach(tab => { const selected = tab === active; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; if (panel(tab)) panel(tab).hidden = !selected; });
    if (notify) emit(element, 'change', { value: id });
    return true;
  }
  tabs.forEach(tab => view.on(tab, 'click', () => select(tab.id, true)));
  view.on(element, 'keydown', event => {
    const enabled = tabs.filter(tab => !tab.disabled), current = enabled.indexOf(event.target);
    if (current < 0) return;
    let index;
    if (event.key === 'ArrowRight') index = (current + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') index = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = enabled.length - 1;
    else return;
    event.preventDefault();
    enabled[index].focus();
    if (element.dataset.activation !== 'manual') select(enabled[index].id, true);
    else tabs.forEach(tab => { tab.tabIndex = tab === enabled[index] ? 0 : -1; });
  });
  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true' && !tab.disabled)?.id || tabs.find(tab => !tab.disabled)?.id);
  return { ...view, select };
}
