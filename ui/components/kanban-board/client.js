import Board from './kanban-board.js';
import { get } from '../../runtime/runtime.js';
import { emit } from '../../runtime/dom.js';

export function init(element) {
  const lanes = [...element.querySelectorAll('.ds-kanban__column')];
  const nodes = new Map(), items = [];
  const columns = lanes.map(lane => {
    const id = lane.dataset.columnId;
    lane.querySelectorAll('.ds-kanban__item').forEach(host => {
      const node = host.firstElementChild;
      nodes.set(host.dataset.itemId, node);
      items.push({ id: host.dataset.itemId, columnId: id, title: node.querySelector('.ds-card__title')?.textContent || node.textContent.trim() });
    });
    return { id, label: lane.querySelector('.ds-kanban__heading > span')?.textContent || id };
  });
  // Preserve the actual server-rendered item nodes, including hx-* attributes,
  // controls and nested component instances. The board adopts its layout too.
  const view = Board.mount(element, {
    columns, items, hydrate: true,
    renderItem(item) {
      const node = nodes.get(item.id);
      return { element: node,
        focus() { (node.querySelector('button,a[href]') || node).focus(); },
        canDrag(target) { return !target.closest('.ds-card__menu-trigger,.ds-card-menu,a,input,select,textarea'); },
        closeMenu() { get(node)?.closeMenu?.(); },
      };
    },
    onMove: detail => emit(element, 'move', detail),
  });
  return view;
}
