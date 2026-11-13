import Switcher from './theme-switcher.js';
export function init(element) {
  return Switcher.mount(element, { themes: globalThis.Templify?.themes });
}
