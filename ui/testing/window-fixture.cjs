const { createFixture } = require('./kanban-fixture.cjs');

// Deterministic dialog/pointer primitives, not a browser layout or inertness test.
function createWindowFixture() {
  const fixture = createFixture(), { document, window } = fixture;
  const createElement = document.createElement.bind(document);
  document.createElement = (tag) => {
    const node = createElement(tag);
    Object.defineProperty(node, 'childNodes', { get: () => node.children });
    if (tag === 'dialog') {
      node.showModal = () => { node.open = true; node.modal = true; };
      node.show = () => { node.open = true; node.modal = false; };
      node.close = (reason) => { node.open = false; node.returnValue = reason; node.emit('close'); };
    }
    return node;
  };
  document.documentElement = document.createElement('html');
  document.append(document.documentElement);
  document.documentElement.append(document.body);
  window.matchMedia = () => ({ matches: true });
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  return fixture;
}
function pointer(node, type, x, y = 0) {
  node.emit(type, { pointerId: 1, button: 0, clientX: x, clientY: y, preventDefault() {} });
}
module.exports = { createWindowFixture, pointer };
