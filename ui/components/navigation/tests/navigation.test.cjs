const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { readFileSync } = require('node:fs'),
  path = require('node:path');
const { Document } = require('../../../testing/dom-fixture.cjs');
const shell = require('../navigation.js');
function setup(width = 1440, saved = {}, attributes = {}) {
  const doc = new Document(),
    frames = [],
    observers = [];
  const create = doc.createElement.bind(doc);
  doc.createElement = (tag) => {
    const n = create(tag);
    n.hidden = false;
    n.clientHeight = 40;
    n.scrollHeight = 40;
    n.offsetHeight = 64;
    n.offsetWidth = 220;
    n.scrollTop = 0;
    n.clientWidth = width;
    n.inert = false;
    n.classList.add = (...names) => {
      n.className = [...new Set([...n.className.split(' '), ...names])].filter(Boolean).join(' ');
    };
    n.classList.toggle = (name, on) => (on ? n.classList.add(name) : n.classList.remove(name));
    n.classList.contains = name => n.className.split(' ').includes(name);
    n.matches = (selector) => {
      if (selector.includes(',')) return selector.split(',').some(part => n.matches(part));
      if (selector === ':popover-open') return !!n.popoverOpen;
      if (selector[0] === '#') return n.id === selector.slice(1);
      if (selector[0] === '.') return n.className.split(' ').includes(selector.slice(1));
      if (selector === 'button' || selector === 'a') return n.tagName === selector.toUpperCase();
      const tag = selector.match(/^([a-z][a-z0-9-]*)(\[.*)$/i);
      if (tag) return n.tagName === tag[1].toUpperCase() && n.matches(tag[2]);
      const attributes = selector.match(/\[[^\]]+\]/g);
      if (attributes?.length > 1) return attributes.every(attribute => n.matches(attribute));
      const a = selector.match(/^\[([^=\]]+)(?:="?([^"\]]+)"?)?\]$/);
      if (a) {
        const value = a[1].startsWith('data-')
          ? n.dataset[a[1].slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())]
          : a[1] === 'id' ? n.id || null : n.getAttribute(a[1]);
        return a[2] === undefined ? value !== null && value !== undefined : value === a[2];
      }
      return false;
    };
    const all = n.querySelectorAll.bind(n);
    n.querySelectorAll = (selector) => {
      const i = selector.indexOf(' ');
      if (i < 0) return all(selector);
      return all(selector.slice(0, i)).flatMap((parent) =>
        parent.querySelectorAll(selector.slice(i + 1)),
      );
    };
    n.before = (node) => {
      const parent = n.parentNode;
      const index = parent.children.indexOf(n);
      if (node.parentNode)
        node.parentNode.children = node.parentNode.children.filter((c) => c !== node);
      node.parentNode = parent;
      parent.children.splice(index, 0, node);
    };
    n.getBoundingClientRect = () => ({
      top: 100,
      left: 0,
      right: 45,
      height: n.offsetHeight,
      width: n.offsetWidth,
    });
    n.hasAttribute = (name) => n.getAttribute(name) !== null;
    n.showPopover = () => (n.popoverOpen = true);
    n.hidePopover = () => (n.popoverOpen = false);
    n.scrollBy = ({ top }) => (n.scrollTop += top);
    Object.defineProperty(n, 'childNodes', { get: () => n.children });
    Object.defineProperty(n, 'isConnected', { get: () => doc.contains(n) });
    n.click = () => n.emit('click', { target: n, preventDefault() {} });
    if (tag === 'dialog') {
      n.showModal = () => { n.open = true; };
      n.close = reason => { n.open = false; n.returnValue = reason; n.emit('close'); };
    }
    return n;
  };
  doc.getElementById = (id) => doc.querySelector('#' + id);
  doc.defaultView = doc.createElement('window');
  doc.defaultView.innerHeight = 800;
  doc.defaultView.innerWidth = width;
  doc.defaultView.matchMedia = () => ({ matches: true });
  doc.defaultView.clearTimeout = clearTimeout;
  doc.defaultView.location = {};
  doc.documentElement = doc.createElement('html');
  doc.body = doc;
  global.matchMedia = () => ({ matches: false });
  global.requestAnimationFrame = (fn) => {
    frames.push(fn);
    return frames.length;
  };
  global.cancelAnimationFrame = () => {};
  global.ResizeObserver = global.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target, options) {
      this.targets ||= [];
      this.targets.push({ target, options });
    }
    disconnect() {
      this.disconnected = true;
    }
  };
  const el = (tag, id, parent, cls = '') => {
    const n = doc.createElement(tag);
    n.id = id;
    n.className = cls;
    parent?.append(n);
    return n;
  };
  const viewport = el('div', 'preview', doc);
  viewport.clientWidth = width;
  const root = el('div', 'menu-live', viewport, 'menu-live ds-navigation');
  for (const [name, value] of Object.entries(attributes)) {
    root.setAttribute(name, value);
    root.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  const header = el('header', '', root, 'menu-live-header');
  el('nav', 'workspace-breadcrumbs', header);
  el('div', '', header, 'menu-header-actions');
  const nav = el('nav', 'menu-live-nav', root, 'menu-live-nav');
  const items = el('div', '', nav, 'workspace-nav-items');
  const dash = el('button', '', items, 'menu-nav-action');
  dash.dataset.menuPage = 'dashboard';
  dash.textContent = 'Dashboard';
  const section = el('div', '', items, 'menu-section'),
    parent = el('button', '', section, 'menu-nav-action');
  parent.dataset.menuGroup = 'components';
  parent.setAttribute('aria-controls', 'submenu-components');
  parent.setAttribute('aria-label', 'Components');
  const panel = el('div', 'submenu-components', section, 'menu-submenu');
  panel.hidden = true;
  const leaf = el('button', '', panel, 'menu-sub-action');
  leaf.dataset.menuPage = 'forms';
  leaf.textContent = 'Forms';
  const footer = el('div', '', nav, 'menu-sidebar-footer'),
    toggle = el('button', 'menu-sidebar-toggle', footer);
  el('span', '', toggle, 'sidebar-toggle-icon');
  el('div', '', root, 'menu-live-content');
  const storage = {
      getItem: (key) => saved[key] ?? null,
      setItem: (key, value) => (saved[key] = value),
    },
    navigated = [],
    status = { textContent: '' };
  const control = shell.mount(root, {
    viewport,
    storage,
    storageKey: 'test',
    statusElement: status,
    renderIcon: (name) => '<svg>' + name + '</svg>',
    onNavigate: (page) => navigated.push(page),
  });
  return {
    doc,
    root,
    viewport,
    nav,
    items,
    footer,
    toggle,
    parent,
    panel,
    leaf,
    dash,
    control,
    saved,
    navigated,
    frames,
    observers,
  };
}
test('restores sidebar and groups without starting an initial animation', () => {
  const f = setup(1440, {
    'test-sidebar-collapsed': 'true',
    'test-menu-groups': '{"components":true}',
  });
  assert.equal(f.root.dataset.sidebarCollapsed, 'true');
  assert.equal(f.control.hasSavedGroups, true);
  assert.equal(f.panel.hidden, true);
  f.control.setCollapsed(false);
  assert.equal(f.panel.hidden, false);
  assert.equal(f.saved['test-sidebar-collapsed'], 'false');
  f.parent.emit('click');
  assert.equal(f.panel.hidden, true);
  assert.equal(JSON.parse(f.saved['test-menu-groups']).components, false);
});
test('collapsed flyout, selection, outside click and keyboard preserve focus/state', () => {
  const f = setup();
  f.control.setCollapsed(true);
  f.parent.emit('click');
  assert.equal(f.control.openFlyout, 'components');
  assert.equal(f.panel.hidden, false);
  f.control.select('forms');
  assert.equal(f.leaf.getAttribute('aria-current'), 'page');
  assert.equal(f.parent.className.includes('has-current-page'), true);
  assert.equal(f.control.openFlyout, null);
  assert.equal(f.doc.activeElement, f.parent);
  f.leaf.emit('click');
  assert.deepEqual(f.navigated, ['forms']);
  f.control.select('dashboard');
  assert.equal(f.leaf.getAttribute('aria-current'), null);
  assert.equal(f.parent.className.includes('has-current-page'), false);
  f.parent.emit('keydown', { key: 'ArrowRight', preventDefault() {} });
  assert.equal(f.doc.activeElement, f.leaf);
  f.nav.emit('keydown', { key: 'Escape', target: f.leaf, preventDefault() {} });
  assert.equal(f.panel.hidden, true);
  f.parent.emit('click');
  f.doc.emit('pointerdown', { target: f.root });
  assert.equal(f.panel.hidden, true);
});
test('mobile uses inline groups and hamburger; Escape closes and restores focus', () => {
  const f = setup(390, { 'test-sidebar-collapsed': 'true' });
  const mobile = f.control.installMobile();
  assert.equal(f.control.isCompact(), false);
  assert.equal(f.nav.inert, true);
  mobile.toggle.emit('click');
  assert.equal(f.root.dataset.mobileMenuOpen, 'true');
  assert.equal(f.nav.inert, false);
  assert.equal(f.doc.activeElement, mobile.close);
  f.parent.emit('click');
  assert.equal(f.panel.hidden, false);
  f.doc.emit('keydown', { key: 'Escape', defaultPrevented: false, preventDefault() {} });
  assert.equal(f.root.dataset.mobileMenuOpen, 'false');
  assert.equal(f.doc.activeElement, mobile.toggle);
  mobile.setOpen(true);
  mobile.close.emit('click');
  assert.equal(f.nav.inert, true);
  assert.equal(f.doc.activeElement, mobile.toggle);
  mobile.setOpen(true);
  f.nav.emit('click', { target: f.leaf });
  assert.equal(f.nav.inert, true);
});
test('desktop/tablet breakpoint, independent scroll regions, both disabled directions and flush flyout', () => {
  const f = setup(768);
  f.control.setCollapsed(true);
  const overflow = f.control.installOverflow({ items: f.items, footer: f.footer, nav: f.nav });
  f.items.clientHeight = 100;
  f.items.scrollHeight = 500;
  overflow.regions[0].region.clientHeight = 130;
  overflow.update();
  const primary = overflow.regions[0];
  assert.equal(primary.up.hidden, false);
  assert.equal(primary.down.hidden, false);
  assert.equal(primary.up.disabled, true);
  assert.equal(primary.down.disabled, false);
  f.items.scrollTop = 400;
  overflow.update();
  assert.equal(primary.up.disabled, false);
  assert.equal(primary.down.disabled, true);
  assert.equal(overflow.regions[1].up.hidden, true);
  f.parent.emit('click');
  overflow.position();
  assert.equal(f.panel.popoverOpen, true);
  assert.equal(f.panel.style.left, '45px');
  f.viewport.clientWidth = 390;
  overflow.position();
  assert.equal(f.panel.hasAttribute('popover'), false);
  assert.equal(f.panel.popoverOpen, false);
});
test('destroy detaches listeners and observers', () => {
  const f = setup();
  f.control.installMobile();
  f.control.installOverflow({ items: f.items, footer: f.footer, nav: f.nav });
  f.control.destroy();
  assert(f.observers.every((o) => o.disconnected));
  f.leaf.emit('click');
  assert.deepEqual(f.navigated, []);
  assert.equal(f.toggle.listeners.get('click').size, 0);
});
test('export has no demo/router/editor dependency and main uses a single controller', () => {
  const dir = path.resolve(__dirname, '..'),
    workspace = path.resolve(dir, '../../..'),
    source = readFileSync(path.join(dir, 'navigation.js'), 'utf8'),
    html = readFileSync(path.join(workspace, 'index.html'), 'utf8'),
    host = readFileSync(path.join(workspace, 'workspace/workspace.js'), 'utf8');
  assert(
    !/demoOrders|actualWorkspacePages|selectMenuPage\(|BreadcrumbPlayground|localStorage/.test(
      source,
    ),
  );
  assert(html.includes('./ui/components/navigation/navigation.js'));
  assert(html.includes('./workspace/workspace.js'));
  assert.equal((host.match(/DesignSystemNavigation\.mount\(/g) || []).length, 1);
  assert(host.includes('DesignSystemNavigation.renderStructure'));
  assert(!host.includes('function setSubmenuVisible('));
  assert(!host.includes('function positionScrollableSubmenus(){\n const floating'));
  assert.deepEqual(shell.scrollState(100, 300, 0), { overflow: true, up: false, down: true });
  assert.deepEqual(shell.scrollState(100, 300, 200), { overflow: true, up: true, down: false });
});
test('submenu animation is gated until restoration finishes and respects reduced motion', async () => {
  const f = setup();
  const animations = [];
  f.panel.animate = (frames, options) => {
    const animation = {
      frames,
      options,
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
      finished: Promise.resolve(),
    };
    animations.push(animation);
    return animation;
  };
  f.parent.emit('click');
  assert.equal(animations.length, 0);
  f.parent.emit('click');
  f.root.dataset.motionReady = 'true';
  f.parent.emit('click');
  assert.equal(animations.length, 1);
  assert.equal(animations[0].options.duration, 180);
  await Promise.resolve();
  assert.equal(f.panel.hidden, false);
  global.matchMedia = () => ({ matches: true });
  f.parent.emit('click');
  assert.equal(animations.length, 1);
  assert.equal(f.panel.hidden, true);
  global.matchMedia = () => ({ matches: false });
});
test('storage failures do not prevent mounting, selection or mobile navigation', () => {
  const f = setup();
  f.control.destroy();
  const control = shell.mount(f.root, {
    viewport: f.viewport,
    renderIcon: () => '',
    storage: {
      getItem() {
        throw Error('denied');
      },
      setItem() {
        throw Error('denied');
      },
    },
  });
  assert.doesNotThrow(() => {
    control.setCollapsed(true);
    control.remember();
    control.select('forms');
  });
  assert.equal(f.leaf.getAttribute('aria-current'), 'page');
  control.destroy();
});
test('pointer use clears retained keyboard focus styling without blurring the toggle', () => {
  const f = setup();
  f.toggle.focus();
  f.doc.emit('keydown', { key: 'Tab' });
  assert.equal(f.root.dataset.inputModality, 'keyboard');
  f.root.emit('pointerdown', { target: f.toggle });
  assert.equal(f.root.dataset.inputModality, 'pointer');
  assert.equal(f.doc.activeElement, f.toggle);
  f.doc.emit('keydown', { key: ' ' });
  assert.equal(f.root.dataset.inputModality, 'keyboard');
  f.control.destroy();
  assert.equal(f.root.dataset.inputModality, undefined);
});

test('fold and unfold retain the open submenu in both presentations', () => {
  const f = setup();
  f.parent.emit('click');
  assert.equal(f.panel.hidden, false);
  f.control.setCollapsed(true);
  assert.equal(f.panel.hidden, false);
  assert.equal(f.control.openFlyout, 'components');
  assert.equal(f.parent.getAttribute('aria-expanded'), 'true');
  f.control.setCollapsed(false);
  assert.equal(f.panel.hidden, false);
  assert.equal(f.control.expandedGroups.components, true);
  assert.equal(f.control.openFlyout, null);
});

test('fold fades inline submenu before hiding, unfold fades the retained group in', async () => {
  const f = setup(),
    pending = [],
    motions = [];
  f.parent.animate = () => {};
  f.panel.animate = (frames, options) => {
    motions.push({ frames, options });
    let resolve;
    const finished = new Promise((done) => (resolve = done));
    pending.push(resolve);
    return { finished, cancel() {} };
  };
  f.parent.emit('click');
  f.control.setCollapsed(true);
  assert.equal(f.root.dataset.sidebarFolding, 'collapse');
  assert.equal(f.panel.hidden, false);
  assert.deepEqual(motions[0].frames, [{ opacity: 1 }, { opacity: 0 }]);
  pending.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.panel.hidden, true);
  assert.equal(f.control.expandedGroups.components, true);
  f.control.setCollapsed(false);
  assert.equal(f.panel.hidden, false);
  assert.deepEqual(motions[1].frames, [{ opacity: 0 }, { opacity: 1 }]);
  pending.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.panel.hidden, false);
  f.control.destroy();
});

test('search matches all destinations and group names, including closed submenus, without changing group state', () => {
  const fixture = setup();
  assert(fixture.control.search.dialog.className.split(' ').includes('ds-search-dialog'));
  assert(fixture.control.search.input.className.split(' ').includes('ds-search-input'));
  assert.equal(fixture.control.search.input.type, 'search');
  assert.equal(fixture.control.search.input.getAttribute('aria-label'), 'Search pages and actions');
  assert(
    !readFileSync(path.resolve(__dirname, '../navigation.css'), 'utf8').includes(
      '.menu-search-input',
    ),
  );
  const results = fixture.control.search.setQuery('components FORMS');
  assert.equal(results.length, 1);
  assert.equal(results[0].page, 'forms');
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.control.expandedGroups.components, false);
  const result = fixture.control.search.results.querySelector('button');
  assert.equal(result.getAttribute('aria-label'), 'Components → Forms');
  fixture.control.search.results.emit('click', { target: result, preventDefault() {} });
  assert.deepEqual(fixture.navigated, ['forms']);
  assert.equal(fixture.control.search.input.value, '');
  fixture.control.search.setQuery('not a destination');
  assert.equal(fixture.control.search.results.hidden, true);
  assert.match(
    fixture.control.slots.search.querySelector('.ds-search-status').textContent,
    /No matching/,
  );
  fixture.control.destroy();
});

test('Search owns a central Window, keyboard selection, dismissal and runtime disabling', () => {
  const fixture = setup();
  fixture.control.setCollapsed(true);
  const search = fixture.control.search;
  const trigger = search.trigger;
  const panel = search.dialog;
  assert.equal(trigger.closest('.menu-sidebar-footer'), fixture.footer);
  search.update({ showNavigationTrigger: false });
  assert.equal(search.trigger, null);
  assert.equal(search.enabled, true);
  assert.equal(search.shortcut, 'Mod+K');
  assert.equal(search.setQuery('forms').length, 1);
  search.update({ showNavigationTrigger: true });
  assert.equal(search.trigger.closest('.menu-sidebar-footer'), fixture.footer);
  const footerTrigger = search.trigger;
  footerTrigger.focus();
  footerTrigger.emit('click');
  assert(panel.open);
  assert.equal(fixture.doc.activeElement, search.input);
  search.setQuery('forms');
  search.input.emit('keydown', { key: 'ArrowDown', target: search.input, preventDefault() {} });
  assert.equal(fixture.doc.activeElement, search.input);
  assert.equal(search.input.getAttribute('aria-activedescendant'), search.results.querySelector('button').id);
  search.input.emit('keydown', { key: 'Escape', target: search.input, preventDefault() {} });
  assert(!panel.open);
  assert.equal(fixture.doc.activeElement, footerTrigger);
  footerTrigger.emit('click');
  search.setQuery('forms');
  fixture.control.setSearchEnabled(false);
  assert.equal(search.enabled, false);
  assert(search.trigger.parentNode.hidden);
  assert(!panel.open);
  assert.deepEqual(search.setQuery('forms'), []);
  fixture.control.setSearchEnabled(true);
  assert(!search.trigger.parentNode.hidden);
  fixture.control.setCollapsed(false);
  assert.equal(panel.hasAttribute('popover'), false);
  assert.equal(fixture.control.setSearchEnabled('false'), false);
  fixture.control.destroy();
  assert.equal(fixture.root.querySelector('.menu-search-section'), null);
});

test('search is not positioned against the rail and keeps its Window size across navigation layouts', () => {
  const fixture = setup();
  fixture.doc.defaultView.innerWidth = 1024;
  fixture.nav.getBoundingClientRect = () => ({ right: 62 });
  fixture.control.setCollapsed(true);
  fixture.control.focusSearch();
  const panel = fixture.control.search.dialog;
  assert.equal(panel.style.left, undefined);
  assert.equal(panel.style.getPropertyValue('--ds-window-width'), '680px');
  assert.equal(panel.hasAttribute('popover'), false);
  fixture.doc.defaultView.innerWidth = 330;
  fixture.doc.defaultView.emit('resize');
  assert.equal(panel.style.left, undefined);
  assert.equal(panel.style.getPropertyValue('--ds-window-width'), '680px');
  fixture.nav.getBoundingClientRect = () => ({ right: 72 });
  fixture.doc.defaultView.emit('scroll');
  assert.equal(panel.style.left, undefined);
  fixture.control.setCollapsed(false);
  assert.equal(panel.hasAttribute('popover'), false);
  fixture.control.destroy();
});

test('search normalization is case/accent insensitive, supports multiword paths and treats labels as text', () => {
  const entries = [
    { page: 'lodz', label: 'Zażółć Łódź', group: 'Narzędzia' },
    { page: 'card', label: '<b>Card</b>', group: 'Components' },
  ];
  assert.equal(shell.findMenuItems(entries, 'NARZEDZIA lodz')[0].page, 'lodz');
  assert.equal(shell.findMenuItems(entries, '<b>Card</b>')[0].page, 'card');
  assert.deepEqual(shell.findMenuItems(entries, '   '), []);
  assert.deepEqual(shell.findMenuItems(entries, 'missing'), []);
});

test('Cmd/Ctrl+K opens Search globally and respects disabled/prevented events without replacing browser Find', () => {
  const fixture = setup();
  let intercepted = 0;
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
    fixture.leaf.focus();
    fixture.doc.emit('keydown', {
      key: 'k',
      ...modifiers,
      preventDefault() {
        intercepted++;
      },
    });
    assert.equal(fixture.doc.activeElement, fixture.control.search.input);
  }
  assert.equal(intercepted, 2);
  assert.equal(fixture.control.search.input.getAttribute('aria-keyshortcuts'), 'Control+K Meta+K');
  fixture.control.search.close();
  fixture.leaf.focus();
  fixture.doc.emit('keydown', { key: 'f', ctrlKey: true, preventDefault() { intercepted++; } });
  assert.equal(fixture.doc.activeElement, fixture.leaf);
  assert.equal(intercepted, 2);
  fixture.control.setCollapsed(true);
  fixture.doc.emit('keydown', {
    key: 'k',
    ctrlKey: true,
    preventDefault() {
      intercepted++;
    },
  });
  assert(fixture.control.search.dialog.open);
  fixture.control.setSearchEnabled(false);
  fixture.leaf.focus();
  fixture.doc.emit('keydown', {
    key: 'k',
    ctrlKey: true,
    preventDefault() {
      intercepted++;
    },
  });
  assert.equal(intercepted, 3);
  assert.equal(fixture.doc.activeElement, fixture.leaf);
  fixture.control.setSearchEnabled(true);
  fixture.doc.emit('keydown', {
    key: 'k',
    ctrlKey: true,
    defaultPrevented: true,
    preventDefault() {
      intercepted++;
    },
  });
  assert.equal(intercepted, 3);
  fixture.control.destroy();
});

test('custom shortcuts match modifiers exactly, support disabling and are removed on destroy', () => {
  const fixture = setup();
  assert(fixture.control.setSearchShortcut('Ctrl+Shift+K'));
  assert.equal(fixture.control.search.shortcut, 'Mod+Shift+K');
  let intercepted = 0;
  fixture.leaf.focus();
  const press = (modifiers) =>
    fixture.doc.emit('keydown', {
      key: 'k',
      ...modifiers,
      preventDefault() {
        intercepted++;
      },
    });
  press({ ctrlKey: true });
  press({ ctrlKey: true, shiftKey: true, altKey: true });
  assert.equal(intercepted, 0);
  press({ ctrlKey: true, shiftKey: true });
  assert.equal(intercepted, 1);
  assert.equal(fixture.doc.activeElement, fixture.control.search.input);
  assert.equal(fixture.control.setSearchShortcut('K'), false);
  assert(fixture.control.setSearchShortcut(null));
  press({ ctrlKey: true, shiftKey: true });
  assert.equal(intercepted, 1);
  assert.equal(fixture.control.search.input.getAttribute('aria-keyshortcuts'), null);
  fixture.control.setSearchShortcut('Mod+Shift+K');
  fixture.control.destroy();
  press({ ctrlKey: true, shiftKey: true });
  assert.equal(intercepted, 1);
});

test('shortcut parsing is portable and ignores unsupported keys, IME and AltGraph', () => {
  assert.equal(shell.normaliseSearchShortcut('cmd + shift + k'), 'Mod+Shift+K');
  assert.equal(shell.normaliseSearchShortcut('Alt+1'), 'Alt+1');
  assert.equal(shell.normaliseSearchShortcut('Shift+F'), 'Shift+F');
  assert.equal(shell.normaliseSearchShortcut('Control+Shift'), 'Mod+Shift');
  assert.equal(shell.normaliseSearchShortcut('Command+Alt'), 'Mod+Alt');
  assert.equal(shell.normaliseSearchShortcut('Alt+Shift'), 'Alt+Shift');
  for (const value of ['F', 'Shift', 'Mod+Mod+F', 'Mod+Escape', 'Mod+<script>', '', 12]) {
    assert.equal(shell.normaliseSearchShortcut(value), null);
  }
  assert.equal(
    shell.searchShortcutFromEvent({ code: 'KeyK', key: '˚', metaKey: true, altKey: true }),
    'Mod+Alt+K',
  );
  assert.equal(shell.searchShortcutFromEvent({ key: 'f', ctrlKey: true, isComposing: true }), null);
  assert.equal(
    shell.searchShortcutFromEvent({ key: 'f', ctrlKey: true, getModifierState: () => true }),
    null,
  );
});

test('Cmd/Ctrl+B toggles the desktop sidebar once, persists it and works with search disabled', () => {
  const fixture = setup();
  const editor = fixture.doc.createElement('input');
  fixture.root.append(editor);
  editor.focus();
  fixture.control.setSearchEnabled(false);
  let prevented = 0;
  const press = (event = {}) =>
    fixture.doc.emit('keydown', {
      key: 'b',
      ctrlKey: true,
      preventDefault() {
        prevented++;
      },
      ...event,
    });
  assert.equal(fixture.control.sidebarToggle.getAttribute('aria-keyshortcuts'), 'Control+B Meta+B');
  press();
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'true');
  assert.equal(fixture.saved['test-sidebar-collapsed'], 'true');
  assert.equal(fixture.doc.activeElement, editor);
  press({ repeat: true });
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'true');
  press({ ctrlKey: false, metaKey: true });
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'false');
  assert.equal(fixture.saved['test-sidebar-collapsed'], 'false');
  press({ shiftKey: true });
  press({ defaultPrevented: true });
  press({ isComposing: true });
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'false');
  assert.equal(prevented, 3);
  fixture.leaf.focus();
  press();
  assert.equal(fixture.doc.activeElement, fixture.control.sidebarToggle);
  fixture.control.destroy();
  press();
  assert.equal(prevented, 4);
});

test('sidebar shortcut references the shared registry, supports rebinding, disabling and reset', () => {
  const fixture = setup();
  const registry = fixture.control.search.shortcuts;
  assert.equal(registry.get(shell.sidebarShortcutId).shortcut, 'Mod+B');
  assert(fixture.control.setSidebarShortcut('Ctrl+Shift+M'));
  assert.equal(registry.get(shell.sidebarShortcutId).shortcut, 'Mod+Shift+M');
  assert.equal(fixture.control.setSidebarShortcut('M'), false);
  let prevented = 0;
  const press = (event) =>
    fixture.doc.emit('keydown', {
      ...event,
      preventDefault() {
        prevented++;
      },
    });
  press({ key: 'b', ctrlKey: true });
  assert.equal(prevented, 0);
  press({ key: 'm', metaKey: true, shiftKey: true });
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'true');
  assert.equal(prevented, 1);
  assert(fixture.control.setSidebarShortcut(null));
  assert.equal(fixture.control.sidebarToggle.getAttribute('aria-keyshortcuts'), null);
  press({ key: 'm', ctrlKey: true, shiftKey: true });
  assert.equal(prevented, 1);
  registry.reset(shell.sidebarShortcutId);
  press({ key: 'b', ctrlKey: true });
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'false');
  fixture.control.destroy();
});

test('sidebar shortcut toggles the mobile menu without changing desktop collapse preference', () => {
  const fixture = setup(390, { 'test-sidebar-collapsed': 'true' });
  let prevented = 0;
  const press = () =>
    fixture.doc.emit('keydown', {
      key: 'b',
      ctrlKey: true,
      preventDefault() {
        prevented++;
      },
    });
  // mount installs the mobile adapter; explicit installation remains idempotent.
  const mobile = fixture.control.installMobile();
  assert.equal(mobile.toggle.getAttribute('aria-keyshortcuts'), 'Control+B Meta+B');
  assert.equal(mobile.close.getAttribute('aria-keyshortcuts'), 'Control+B Meta+B');
  press();
  assert.equal(fixture.root.dataset.mobileMenuOpen, 'true');
  assert.equal(mobile.nav.inert, false);
  assert.equal(fixture.doc.activeElement, mobile.close);
  press();
  assert.equal(fixture.root.dataset.mobileMenuOpen, 'false');
  assert.equal(mobile.nav.inert, true);
  assert.equal(fixture.doc.activeElement, mobile.toggle);
  assert.equal(fixture.root.dataset.sidebarCollapsed, 'true');
  assert.equal(fixture.saved['test-sidebar-collapsed'], 'true');
  assert.equal(prevented, 2);
  fixture.control.destroy();
  assert.equal(mobile.toggle.getAttribute('aria-keyshortcuts'), null);
  assert.equal(mobile.close.getAttribute('aria-keyshortcuts'), null);
});

test('feature attributes and JS setters control the same state and preserve shortcut bindings', () => {
  const f = setup(1440, { 'test-sidebar-collapsed': 'true' }, { 'data-collapse': 'false', 'data-search': 'false' });
  assert.equal(f.root.dataset.sidebarCollapsed, 'false');
  assert.equal(f.toggle.hidden, true);
  assert.equal(f.control.edgeToggle.hidden, true);
  assert.equal(f.control.search.enabled, false);
  assert.equal(f.control.toggleSidebar(), false);
  assert.equal(f.control.focusSearch(), false);
  const shortcuts = f.control.search.shortcuts;
  shortcuts.set(shell.sidebarShortcutId, 'Mod+M');
  shortcuts.set(shell.searchShortcutId, 'Mod+K');
  assert.equal(f.control.setCollapse('true'), false);
  f.control.setCollapse(true);
  f.control.setSearch(true);
  assert.equal(f.root.dataset.collapse, 'true');
  assert.equal(f.root.dataset.search, 'true');
  f.control.edgeToggle.emit('click');
  assert.equal(f.root.dataset.sidebarCollapsed, 'true');
  f.control.setCollapse(false);
  f.control.setSearch(false);
  assert.equal(f.root.dataset.sidebarCollapsed, 'false');
  assert.equal(shortcuts.get(shell.sidebarShortcutId).shortcut, 'Mod+M');
  assert.equal(shortcuts.get(shell.searchShortcutId).shortcut, 'Mod+K');
  f.control.destroy();
  assert.equal(shortcuts.get(shell.sidebarShortcutId), null);
  assert.equal(shortcuts.get(shell.searchShortcutId), null);
});

test('shortcut attributes declare shared registration defaults, not separate bindings', () => {
  const f = setup(1440, {}, { 'data-search-shortcut': 'Mod+K', 'data-collapse-shortcut': 'Mod+Shift+M' });
  const registry = f.control.search.shortcuts;
  assert.equal(registry.get(shell.searchShortcutId).defaultShortcut, 'Mod+K');
  assert.equal(registry.get(shell.sidebarShortcutId).defaultShortcut, 'Mod+Shift+M');
  f.control.setSearchShortcut('Mod+J');
  registry.reset(shell.searchShortcutId);
  assert.equal(registry.get(shell.searchShortcutId).shortcut, 'Mod+K');
  f.control.destroy();
});

test('setItems renders text, native links and callbacks, validates IDs and detaches old handlers', () => {
  const f = setup();
  let calls = 0;
  const entries = [
    { id: 'home', label: '<b>Home</b>', href: '/home', icon: 'home' },
    { id: 'projects', label: 'Projects', children: [
      { id: 'create', label: 'Create project', onClick: () => calls++ },
    ] },
  ];
  f.control.setItems(entries);
  assert.equal(f.dash.listeners.get('click').size, 0);
  const link = f.root.querySelector('[data-menu-page="home"]');
  assert.equal(link.tagName, 'A');
  assert.equal(link.getAttribute('href'), '/home');
  assert.equal(link.querySelector('.menu-nav-label').textContent, '<b>Home</b>');
  const action = f.root.querySelector('[data-menu-page="create"]');
  action.emit('click');
  assert.equal(calls, 1);
  assert.equal(f.control.search.setQuery('create')[0].page, 'create');
  f.control.setItems(entries);
  action.emit('click');
  assert.equal(calls, 1);
  f.root.querySelector('[data-menu-page="create"]').emit('click');
  assert.equal(calls, 2);
  assert.throws(() => f.control.setItems([{ id: 'same' }, { id: 'same' }]), /unique/);
  assert.equal(f.root.querySelectorAll('[data-menu-page]').length, 2);
  f.control.destroy();
});

test('Navigation shadow declarations use shared profiles instead of fixed shadow values', () => {
  const css = readFileSync(path.resolve(__dirname, '../navigation.css'), 'utf8');
  const declarations = [...css.matchAll(/(?:box-shadow|--pattern-shadow)\s*:\s*([^;}\n]+)/g)];
  assert(declarations.length > 0);
  for (const [, value] of declarations) {
    assert.match(value.trim(), /^(?:none|var\(--[a-z0-9-]+(?:,\s*none)?\))$/, value);
  }
  assert.match(css, /--pattern-shadow:\s*var\(--ds-shadow-medium,\s*none\)/);
  assert.match(css, /--pattern-shadow:\s*var\(--ds-shadow-soft,\s*none\)/);
});
