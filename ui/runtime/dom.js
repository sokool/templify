export function lifecycle(element) {
  const cleanups = [];
  return {
    element,
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    },
    destroy() { cleanups.splice(0).reverse().forEach(off => off()); },
  };
}

export const bool = (value, fallback = true) => value == null ? fallback : value !== 'false';
export function emit(element, name, detail) {
  element.dispatchEvent(new element.ownerDocument.defaultView.CustomEvent('ui:' + name, { bubbles: true, detail }));
}

// Do not capture controls belonging to a nested instance of the same component.
export function owned(element, selector) {
  return [...element.querySelectorAll(selector)].filter(node => node.closest('[data-ui]') === element);
}
