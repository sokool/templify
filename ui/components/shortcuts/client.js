import Shortcuts from './shortcuts.js';
import { emit } from '../../runtime/dom.js';
export function init(element) {
  const catalogue = Shortcuts.create({ document: element.ownerDocument }), unregister = [];
  element.querySelectorAll('[data-shortcut-id]').forEach(row => {
    // Rows without a declared default reference actions registered by components.
    if (catalogue.get(row.dataset.shortcutId) || !row.hasAttribute('data-shortcut')) return;
    const input = row.querySelector('input');
    unregister.push(catalogue.register({
      id: row.dataset.shortcutId, label: input.getAttribute('aria-label'),
      defaultShortcut: row.dataset.shortcut || null,
      handler() { return !element.dispatchEvent(new element.ownerDocument.defaultView.CustomEvent('ui:shortcut', { bubbles: true, cancelable: true, detail: { id: row.dataset.shortcutId } })); },
    }));
  });
  const editor = Shortcuts.mount(element, { shortcuts: catalogue, onChange: detail => emit(element, 'change', detail) });
  return { ...catalogue, element, destroy() { editor.destroy(); unregister.forEach(off => off()); } };
}
