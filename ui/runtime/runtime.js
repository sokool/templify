const components = new Map();
const instances = new WeakMap();
const documents = new WeakSet();

export function register(name, init) { components.set(name, init); }
export function get(element) { return instances.get(element); }

function nodes(scope) {
  return [...(scope?.matches?.('[data-ui]') ? [scope] : []), ...(scope?.querySelectorAll?.('[data-ui]') || [])];
}

export function init(scope = document) {
  for (const element of nodes(scope)) {
    if (instances.has(element)) continue;
    const enhance = components.get(element.dataset.ui);
    if (!enhance) continue;
    const instance = enhance(element) || {};
    instances.set(element, instance);
  }
}

export function destroy(scope) {
  for (const element of nodes(scope).reverse()) {
    const instance = instances.get(element);
    if (!instance) continue;
    instance.destroy?.();
    instances.delete(element);
  }
}

export function start(doc = document) {
  if (documents.has(doc)) return;
  documents.add(doc);
  doc.addEventListener('htmx:afterSwap', event => init(event.detail.elt));
  doc.addEventListener('htmx:load', event => init(event.detail.elt));
  doc.addEventListener('htmx:beforeCleanupElement', event => destroy(event.detail.elt));
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => init(doc), { once: true });
  else init(doc);
}
