import { lifecycle, owned, emit } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element), rows = [...element.querySelectorAll('tbody > tr')];
  let page = 1, pageSize = Math.max(1, Number(element.dataset.pageSize) || rows.length || 1);
  function render() {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(pages, Math.max(1, page));
    rows.forEach((row, index) => { row.hidden = index < (page - 1) * pageSize || index >= page * pageSize; });
    owned(element, '[data-list-page]').forEach(button => { button.disabled = button.dataset.listPage === 'previous' ? page === 1 : page === pages; });
    const status = element.querySelector('[data-list-summary]');
    if (status) status.textContent = rows.length ? `Items ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} of ${rows.length}` : 'No results';
  }
  function setPage(value) { page = Math.floor(Number(value) || 1); render(); emit(element, 'page', { page }); }
  function setDensity(value) {
    element.dataset.density = value === 'compact' ? 'compact' : 'normal';
    owned(element, '[data-list-density]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.listDensity === element.dataset.density)));
  }
  owned(element, '[data-list-page]').forEach(button => view.on(button, 'click', () => setPage(page + (button.dataset.listPage === 'previous' ? -1 : 1))));
  owned(element, '[data-list-density]').forEach(button => view.on(button, 'click', () => setDensity(button.dataset.listDensity)));
  render(); setDensity(element.dataset.density);
  return { ...view, setPage, setDensity, get page() { return page; } };
}
