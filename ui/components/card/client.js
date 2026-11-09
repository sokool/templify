import Card from './card.js';
import { bool } from '../../runtime/dom.js';
export function init(element) {
  const actions = [...element.querySelectorAll('.ds-card-menu button,.ds-card-menu a')];
  return Card.mount(element, {
    hydrate: true,
    title: element.querySelector('.ds-card__title')?.textContent || '',
    actions,
    menuEnabled: bool(element.dataset.menu) && Boolean(element.querySelector('.ds-card__menu-trigger')),
    size: element.dataset.size,
  });
}
