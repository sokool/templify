import { lifecycle, bool, owned, emit } from '../../runtime/dom.js';

export function init(element) {
  const view = lifecycle(element), entries = owned(element, 'details');
  function sync(entry) {
    if (entry.open && !bool(element.dataset.multiple)) entries.forEach(other => { if (other !== entry) other.open = false; });
    entries.forEach(item => item.querySelector('summary').setAttribute('aria-expanded', String(item.open)));
  }
  entries.forEach(entry => {
    sync(entry);
    view.on(entry, 'toggle', () => { sync(entry); emit(element, 'change', { id: entry.id, open: entry.open }); });
  });
  return { ...view, setOpen(id, open = true) { const entry = entries.find(item => item.id === id); if (!entry) return false; entry.open = open; sync(entry); return true; } };
}
