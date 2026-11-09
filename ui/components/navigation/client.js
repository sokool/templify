import Navigation from './navigation.js';
import '../form/form.css';
import { emit } from '../../runtime/dom.js';
export function init(element) {
  const view = Navigation.mount(element, {
    viewport: element.parentElement,
    renderIcon: name => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="${name.includes('close') ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'}"/></svg>`,
    onNavigate(page) { view.select(page); emit(element, 'navigate', { page }); },
  });
  view.installMobile();
  return view;
}
