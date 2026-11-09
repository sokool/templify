import { lifecycle } from '../../runtime/dom.js';
export function init(element) {
  const view = lifecycle(element), image = element.querySelector('img');
  if (image) {
    const fallback = () => { const avatar = image.parentElement; image.remove(); avatar.textContent = avatar.dataset.initials || ''; };
    view.on(image, 'error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  }
  return view;
}
