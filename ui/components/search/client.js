import Search from './search.js';
import '../window/window.css';
import { emit } from '../../runtime/dom.js';

export function init(element) {
  return Search.mount(element, { onSelect: detail => emit(element, 'search-select', detail) });
}
