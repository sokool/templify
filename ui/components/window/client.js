import Window from './window.js';
import { bool, lifecycle, emit } from '../../runtime/dom.js';
export function init(element) {
  const life = lifecycle(element);
  const view = Window.mount(element, {
    hydrate: true,
    mode: element.dataset.mode,
    side: element.dataset.side,
    size: element.dataset.size,
    width: element.dataset.width,
    height: element.dataset.height,
    duration: element.dataset.duration ?? 220,
    closeOnEscape: bool(element.dataset.closeOnEscape),
    closeOnBackdrop: bool(element.dataset.closeOnBackdrop),
    showClose: bool(element.dataset.showClose),
    lockScroll: bool(element.dataset.lockScroll),
    resizable: bool(element.dataset.resizable, false),
    onOpen: () => emit(element, 'open', {}),
    onClose: reason => emit(element, 'close', { reason }),
    onResize: size => emit(element, 'resize', size),
  });
  life.on(element.ownerDocument, 'click', event => {
    const trigger = event.target.closest('[data-ui-open]');
    if (trigger?.dataset.uiOpen === element.id) view.open();
    if (element.contains(event.target) && event.target.closest('[data-ui-close]')) view.close('button');
  });
  return { ...view, destroy() { life.destroy(); view.destroy(); } };
}
