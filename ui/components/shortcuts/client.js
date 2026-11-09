import Shortcuts from './shortcuts.js';
import { lifecycle, emit } from '../../runtime/dom.js';
export function init(element) {
  const life = lifecycle(element), catalogue = Shortcuts.create({ document: element.ownerDocument });
  element.querySelectorAll('[data-shortcut-id]').forEach(row => {
    const input = row.querySelector('input'), reset = row.querySelector('button');
    catalogue.register({
      id: row.dataset.shortcutId, label: input.getAttribute('aria-label'),
      defaultShortcut: row.dataset.shortcut || null,
      handler() { return !element.dispatchEvent(new element.ownerDocument.defaultView.CustomEvent('ui:shortcut', { bubbles: true, cancelable: true, detail: { id: row.dataset.shortcutId } })); },
    });
    life.on(input, 'keydown', event => {
      if (['Tab', 'Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const clear = ['Backspace', 'Delete'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;
      const value = Shortcuts.fromEvent(event);
      if (clear || value) { catalogue.set(row.dataset.shortcutId, clear ? null : value); emit(element, 'change', { id: row.dataset.shortcutId, shortcut: clear ? null : value }); }
    });
    life.on(reset, 'click', () => {
      catalogue.reset(row.dataset.shortcutId);
      emit(element, 'change', { id: row.dataset.shortcutId, shortcut: catalogue.get(row.dataset.shortcutId).shortcut });
    });
    const sync = () => { input.value = Shortcuts.format(catalogue.get(row.dataset.shortcutId).shortcut); };
    catalogue.subscribe(sync); sync();
  });
  return { ...catalogue, element, destroy() { life.destroy(); catalogue.destroy(); } };
}
