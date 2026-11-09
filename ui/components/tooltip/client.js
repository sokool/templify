import Tooltip from './tooltip.js';
import { lifecycle } from '../../runtime/dom.js';
export function init(element) {
  const view = Tooltip.mount(element), life = lifecycle(element);
  const style = event => {
    const trigger = event.target.closest('[data-tooltip],[title]');
    if (!trigger) return;
    const computed = element.ownerDocument.defaultView.getComputedStyle(trigger);
    Object.values(Tooltip.tokens).forEach(token => { view.element.style.setProperty(token, computed.getPropertyValue(token)); });
  };
  life.on(element, 'pointerover', style, true);
  life.on(element, 'focusin', style, true);
  return { ...view, destroy() { life.destroy(); view.destroy(); } };
}
