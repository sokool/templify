export function init(element) {
  return { element, update({ loading } = {}) {
    if (loading === undefined) return;
    element.setAttribute('aria-busy', String(Boolean(loading)));
    element.querySelector('[data-loading-placeholder]').hidden = !loading;
    element.querySelector('[data-loading-content]').hidden = Boolean(loading);
  } };
}
