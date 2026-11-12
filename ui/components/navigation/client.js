import Navigation from './navigation.js';
import '../form/form.css';
import { emit } from '../../runtime/dom.js';
export function init(element) {
  const view = Navigation.mount(element, {
    viewport: element.parentElement,
    onNavigate(page) { view.select(page); emit(element, 'navigate', { page }); },
  });
  return view;
}
