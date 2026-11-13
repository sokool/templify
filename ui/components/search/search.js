/* Document search and command palette. No routing, storage or workspace dependencies. */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('../window/window.js') : root.DesignSystemWindow,
    typeof module === 'object' && module.exports ? require('../shortcuts/shortcuts.js') : root.DesignSystemShortcuts,
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemSearch = api;
})(globalThis, function (Window, Shortcuts) {
  'use strict';
  const mounted = new WeakMap();
  let sequence = 0;
  const searchIcon = '<svg class="ui-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg>';
  const defaults = Object.freeze({
    enabled: true, links: true, anchors: true, actions: true, showIcons: true,
    showDescriptions: true, showShortcuts: true, groupResults: true, showNavigationTrigger: true, compact: false,
    maxResults: 5, minLength: 0, width: 680, duration: 180, closeOnBackdrop: true,
  });
  function normalise(value) {
    let text = String(value ?? '');
    try { text = decodeURIComponent(text); } catch {}
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').trim();
  }
  function find(entries, query) {
    const text = normalise(query), words = text.split(/\s+/).filter(Boolean);
    return entries.map((entry, index) => {
      const title = normalise(entry.title);
      const fields = [entry.description, entry.keywords, entry.href, entry.url, entry.anchor, entry.group, entry.graphic?.alt];
      const haystack = [title, ...fields.map(normalise)].join(' ');
      const score = title === text ? 100 : title.startsWith(text) ? 70 : title.includes(text) ? 50 : 0;
      return { entry, index, score: score + words.filter(word => title.includes(word)).length * 5,
        matches: words.every(word => haystack.includes(word)) };
    }).filter(item => item.matches).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.entry);
  }
  function safeURL(value, base, image = false) {
    if (!value || /[\u0000-\u001f]/.test(value)) return null;
    try {
      const url = new URL(value, base || 'http://localhost/');
      return (image ? ['http:', 'https:', 'file:'] : ['http:', 'https:', 'mailto:', 'tel:', 'file:']).includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  function referenced(node, attribute) {
    return (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
      .map(id => node.ownerDocument.getElementById(id)?.textContent || '').join(' ').trim();
  }
  function graphic(node) {
    const data = node.dataset, image = node.querySelector('img'), svg = node.querySelector('svg');
    const src = data.searchImage || image?.getAttribute('src');
    if (src && safeURL(src, node.ownerDocument.baseURI, true)) {
      return { type: 'image', src, alt: image?.getAttribute('alt') || data.searchIcon || '' };
    }
    if (data.searchIcon) return { type: 'icon', name: data.searchIcon, alt: data.searchIcon };
    if (svg) return { type: 'svg', node: svg, alt: svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || '' };
    const icon = node.querySelector('.menu-nav-icon, .menu-sub-icon');
    return icon?.textContent.trim() ? { type: 'text', text: icon.textContent.trim(), alt: '' } : null;
  }
  function excluded(node, navigation, exclude) {
    if (node.disabled || node.getAttribute('aria-disabled') === 'true' || node.hidden) return true;
    if (node.closest('.ds-search, [data-search-ignore], [data-search-owned], template, script, style, dialog')) return true;
    try { if (exclude && node.closest(exclude)) return true; } catch {}
    // Collapsed navigation entries remain destinations; other hidden UI does not.
    if (!navigation?.contains(node)) {
      if (node.closest('[hidden], [inert], [aria-hidden="true"]')) return true;
      if (node.getClientRects && !node.getClientRects().length) return true;
      if (node.ownerDocument.defaultView.getComputedStyle?.(node).visibility === 'hidden') return true;
    }
    return false;
  }
  function collect(scope, { navigation, exclude, links = true, anchors = true } = {}) {
    if (!scope) return [];
    const candidates = new Set();
    if (links) scope.querySelectorAll('a[href], area[href]').forEach(node => candidates.add(node));
    if (anchors) scope.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], [id][data-search-title], [id][data-search-anchor]').forEach(node => candidates.add(node));
    if (navigation) navigation.querySelectorAll('[data-menu-page]').forEach(node => candidates.add(node));
    const unique = new Map();
    for (const node of candidates) {
      if (excluded(node, navigation, exclude)) continue;
      const data = node.dataset, page = data.menuPage;
      const raw = node.getAttribute('href') ?? data.searchHref ?? null;
      const anchor = raw === null && node.id ? node.id : raw?.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
      const href = raw ?? (node.id ? '#' + encodeURIComponent(node.id) : '');
      const url = href ? safeURL(href, node.ownerDocument.baseURI) : null;
      if ((href && !url) || (!href && !page)) continue;
      const picture = graphic(node);
      const label = node.querySelector('.menu-nav-label, .menu-sub-label') || node;
      const title = (data.searchTitle || referenced(node, 'aria-labelledby') || node.getAttribute('aria-label') ||
        label.textContent.trim() || node.getAttribute('title') || node.getAttribute('alt') || picture?.alt || href).trim();
      if (!title) continue;
      const parent = node.closest('.menu-section')?.querySelector('[data-menu-group]');
      const group = data.searchGroup || (page ? parent?.getAttribute('aria-label') || parent?.textContent.trim() || 'Menu' : raw === null ? 'On this page' : 'Links');
      const description = data.searchDescription || referenced(node, 'aria-describedby') ||
        (node.getAttribute('title') !== title ? node.getAttribute('title') : '') || '';
      const kind = page ? 'menu' : raw === null ? 'anchor' : 'link';
      const id = data.searchId || (page ? 'menu:' + page : [url, node.getAttribute('target') || '', title].join('|'));
      if (!unique.has(id)) unique.set(id, {
        id, kind, node, page, title, label: title, description, group, href, url, anchor,
        keywords: [data.searchKeywords || '', page || ''].join(' '), graphic: picture,
      });
    }
    return [...unique.values()];
  }
  // Copy only inert SVG geometry, never handlers, styles, scripts or external references.
  function copySVG(source, doc) {
    const tags = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'title']);
    const attributes = new Set(['viewBox', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
      'width', 'height', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'fill-rule', 'clip-rule', 'opacity', 'transform']);
    function copy(node) {
      if (!tags.has(node.localName)) return null;
      const result = doc.createElementNS('http://www.w3.org/2000/svg', node.localName);
      for (const attribute of Array.from(node.attributes)) {
        if (attributes.has(attribute.name) && !/url\s*\(/i.test(attribute.value)) result.setAttribute(attribute.name, attribute.value);
      }
      if (node.localName === 'title') result.textContent = node.textContent;
      else for (const child of node.children) { const safe = copy(child); if (safe) result.append(safe); }
      return result;
    }
    const svg = copy(source);
    if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.classList.add('ui-icon'); }
    return svg;
  }
  function mount(host, options = {}) {
    if (mounted.has(host)) return mounted.get(host);
    const doc = host.ownerDocument, win = doc.defaultView, id = 'ds-search-' + (++sequence);
    const shortcuts = options.shortcuts || Shortcuts.create({ document: doc });
    const shortcutId = options.shortcutId || host.dataset.shortcutId || 'search.open';
    const configuration = { ...defaults, ...options, shortcut: options.shortcut === undefined ? 'Mod+K' : options.shortcut };
    const state = { ...configuration };
    let destroyed = false, matches = [], index = -1, navigation = null, menuSection = null, trigger = null, scheduled = false;
    const listeners = [];
    function element(tag, cls, text) {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function listen(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    }
    function target(value, fallback = null) {
      try { return typeof value === 'string' && value ? doc.querySelector(value) : value || fallback; } catch { return null; }
    }
    function readAttributes() {
      Object.assign(state, configuration);
      for (const key of Object.keys(defaults)) {
        const value = host.dataset[key];
        if (value === undefined) continue;
        state[key] = typeof defaults[key] === 'boolean' ? value !== 'false' : Number.isFinite(Number(value)) ? Number(value) : defaults[key];
      }
      for (const key of ['navigation', 'scope', 'exclude', 'placeholder']) if (host.dataset[key] !== undefined) state[key] = host.dataset[key];
      state.maxResults = Math.max(1, Math.min(100, Math.trunc(Number(state.maxResults) || defaults.maxResults)));
      state.minLength = Math.max(0, Math.trunc(Number.isFinite(Number(state.minLength)) ? Number(state.minLength) : 0));
      state.shortcut = host.dataset.openShortcut !== undefined
        ? host.dataset.openShortcut === '' ? null : Shortcuts.normalise(host.dataset.openShortcut) || 'Mod+K'
        : configuration.shortcut;
    }
    readAttributes();
    host.classList.add('ds-search');
    const existing = host.querySelector('.ds-search-dialog');
    const windowView = Window.mount(existing || host, {
      hydrate: Boolean(existing), container: host, title: options.title || 'Search',
      width: state.width, duration: state.duration, showClose: false, resizable: false,
      closeOnBackdrop: state.closeOnBackdrop, initialFocus: '.ds-search-input',
      onOpen() { syncExpanded(); options.onOpen?.(); },
      onClose(reason) { syncExpanded(); input.value = ''; options.onClose?.(reason); },
    });
    const dialog = windowView.element, body = windowView.body;
    dialog.classList.add('ds-search-dialog');
    const bar = body.querySelector('.ds-search-bar') || element('div', 'ds-search-bar');
    if (!bar.parentNode) body.append(bar);
    if (!bar.querySelector('.ds-search-symbol')) {
      const symbol = element('span', 'ds-search-symbol');
      symbol.innerHTML = searchIcon;
      bar.prepend(symbol);
    }
    const input = bar.querySelector('input') || element('input', 'ds-search-input');
    input.type = 'search';
    input.id = input.id || id + '-input';
    input.setAttribute('aria-label', 'Search pages and actions');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    if (!input.parentNode) bar.append(input);
    const results = body.querySelector('.ds-search-results') || element('div', 'ds-search-results');
    results.id = results.id || id + '-results';
    results.setAttribute('role', 'listbox');
    results.setAttribute('aria-label', 'Search results');
    input.setAttribute('aria-controls', results.id);
    if (!results.parentNode) body.append(results);
    const status = body.querySelector('.ds-search-status') || element('p', 'ds-search-status');
    status.setAttribute('role', 'status');
    if (!status.parentNode) body.append(status);
    const help = body.querySelector('.ds-search-help') || element('p', 'ds-search-help', '↑ ↓ Navigate · Enter Open · Esc Close');
    if (!help.parentNode) body.append(help);

    function syncExpanded() {
      const opened = windowView.isOpen();
      input.setAttribute('aria-expanded', String(opened));
      trigger?.setAttribute('aria-expanded', String(opened));
    }
    function connectNavigation() {
      const next = target(state.navigation);
      const footer = next?.querySelector('.menu-sidebar-footer');
      if (next === navigation && state.showNavigationTrigger && menuSection?.parentNode === footer) return;
      trigger?.removeEventListener('click', open);
      menuSection?.remove();
      navigation = next;
      menuSection = trigger = null;
      if (!state.showNavigationTrigger || !footer) return;
      menuSection = element('section', 'menu-search-section');
      menuSection.dataset.searchOwned = '';
      trigger = element('button', 'menu-search-toggle menu-utility');
      trigger.type = 'button';
      trigger.innerHTML = searchIcon;
      trigger.append(element('span', 'menu-search-label menu-utility-label', 'Search'));
      trigger.setAttribute('aria-label', 'Search pages and actions');
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', dialog.id);
      // The section is replaced as a unit; no persistent listener retains old menus.
      trigger.addEventListener('click', open);
      menuSection.append(trigger);
      footer.prepend(menuSection);
      syncExpanded();
    }
    function sync() {
      if (destroyed) return;
      connectNavigation();
      dialog.classList.toggle('is-compact', state.compact);
      const shortcut = Shortcuts.aria(shortcuts.get(shortcutId)?.shortcut);
      for (const node of [input, trigger, ...host.querySelectorAll('[data-search-open]')].filter(Boolean)) {
        if (shortcut) node.setAttribute('aria-keyshortcuts', shortcut);
        else node.removeAttribute('aria-keyshortcuts');
      }
      if (input.disabled !== !state.enabled) input.disabled = !state.enabled;
      input.placeholder = state.placeholder || 'Search pages, links and actions…';
      if (menuSection && menuSection.hidden !== !state.enabled) menuSection.hidden = !state.enabled;
      if (trigger && trigger.disabled !== !state.enabled) trigger.disabled = !state.enabled;
      for (const node of host.querySelectorAll('[data-search-open]')) if (node.disabled !== !state.enabled) node.disabled = !state.enabled;
      if (!state.enabled && windowView.isOpen()) windowView.close('disabled', { immediate: true });
      syncExpanded();
    }
    function entries() {
      const scope = target(state.scope, doc);
      const list = collect(scope, { navigation, exclude: state.exclude, links: state.links, anchors: state.anchors });
      if (state.actions) for (const action of shortcuts.list()) {
        if (!action.searchable || !action.enabled || action.id === shortcutId) continue;
        list.push({ id: 'action:' + action.id, actionId: action.id, kind: 'action', title: action.label, label: action.label,
          description: action.description, keywords: action.keywords, group: action.group || 'Actions',
          shortcut: action.shortcut, graphic: action.image ? { type: 'image', src: action.image, alt: action.icon } :
            action.icon ? { type: 'icon', name: action.icon, alt: action.icon } : null });
      }
      return list;
    }
    function drawGraphic(entry) {
      const frame = element('span', 'ds-search-graphic'), picture = entry.graphic;
      frame.setAttribute('aria-hidden', 'true');
      if (picture?.type === 'image' && safeURL(picture.src, doc.baseURI, true)) {
        const image = element('img');
        image.setAttribute('src', picture.src);
        image.setAttribute('alt', '');
        image.setAttribute('referrerpolicy', 'no-referrer');
        frame.append(image);
      } else if (picture?.type === 'svg') {
        const svg = copySVG(picture.node, doc);
        if (svg) frame.append(svg);
      } else if (picture?.type === 'icon' && state.renderIcon) {
        // renderIcon is a trusted application renderer, never source HTML.
        frame.innerHTML = state.renderIcon(picture.name) || '';
      } else if (picture?.type === 'text') frame.textContent = picture.text;
      if (!frame.children.length && !frame.textContent) frame.textContent = entry.kind === 'action' ? '⌘' : entry.kind === 'anchor' ? '#' : '↗';
      return frame;
    }
    function select(next, scroll = false) {
      index = matches.length ? (next + matches.length) % matches.length : -1;
      const nodes = Array.from(results.querySelectorAll('[data-search-result]'));
      nodes.forEach((node, i) => {
        node.setAttribute('aria-selected', String(i === index));
        node.classList.toggle('is-active', i === index);
      });
      if (index >= 0) {
        input.setAttribute('aria-activedescendant', nodes[index].id);
        if (scroll) nodes[index].scrollIntoView?.({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    function setQuery(value) {
      if (destroyed) return [];
      input.value = state.enabled ? String(value ?? '') : '';
      matches = state.enabled && normalise(input.value).length >= state.minLength
        ? find(entries(), input.value).slice(0, state.maxResults) : [];
      if (state.groupResults) {
        const groups = new Map();
        for (const entry of matches) {
          if (!groups.has(entry.group)) groups.set(entry.group, []);
          groups.get(entry.group).push(entry);
        }
        matches = [...groups.values()].flat();
      }
      results.replaceChildren();
      for (const [i, entry] of matches.entries()) {
        const row = element(entry.href ? 'a' : 'button', 'ds-search-result');
        if (entry.href) {
          row.setAttribute('href', entry.href);
          for (const name of ['target', 'rel', 'download']) {
            const value = entry.node?.getAttribute(name);
            if (value !== null && value !== undefined) row.setAttribute(name, value);
          }
        } else row.type = 'button';
        row.id = id + '-result-' + i;
        row.dataset.searchResult = String(i);
        row.tabIndex = -1;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-label', entry.group ? entry.group + ' → ' + entry.title : entry.title);
        if (state.showIcons) row.append(drawGraphic(entry));
        const text = element('span', 'ds-search-text');
        text.append(element('span', 'ds-search-title', entry.title));
        const descriptions = [];
        if (state.showDescriptions && entry.description) {
          const description = element('span', 'ds-search-description', entry.description);
          description.id = row.id + '-description';
          descriptions.push(description.id);
          text.append(description);
        }
        if (entry.href) {
          const address = element('span', 'ds-search-address', entry.href);
          address.id = row.id + '-address';
          descriptions.push(address.id);
          text.append(address);
        }
        if (descriptions.length) row.setAttribute('aria-describedby', descriptions.join(' '));
        row.append(text);
        if (state.showShortcuts && entry.shortcut) row.append(element('kbd', 'ds-search-shortcut', Shortcuts.format(entry.shortcut)));
        if (state.groupResults && entry.group) {
          const category = element('span', 'ds-search-category', entry.group);
          category.setAttribute('title', entry.group);
          row.append(category);
        }
        results.append(row);
      }
      results.hidden = !matches.length;
      status.textContent = matches.length ? `${matches.length} result${matches.length === 1 ? '' : 's'}` :
        normalise(input.value).length < state.minLength ? `Type at least ${state.minLength} characters` : 'No matching results';
      select(0);
      return matches.slice();
    }
    function activate(entry, event) {
      if (!entry || !state.enabled) return false;
      if (entry.actionId) {
        const action = shortcuts.get(entry.actionId);
        if (!action?.searchable || !action.enabled) { setQuery(input.value); return false; }
      } else if (entry.node?.isConnected === false || excluded(entry.node, navigation, state.exclude) ||
        (entry.node.getAttribute('href') !== null && !safeURL(entry.node.getAttribute('href'), doc.baseURI))) {
        setQuery(input.value);
        return false;
      }
      // Release modal inertness before executing the original action. Do not let
      // a delayed Window close event steal focus from a newly opened component.
      windowView.close('select', { immediate: true, restoreFocus: false });
      input.value = '';
      const success = entry.actionId ? shortcuts.execute(entry.actionId, event) : entry.kind === 'anchor' ? (() => {
        win.location.hash = entry.href;
        entry.node.scrollIntoView?.({ block: 'start' });
        return true;
      })() : (() => {
        if (entry.node.click) entry.node.click();
        else if (entry.page && options.onNavigate) options.onNavigate(entry.page);
        else return false;
        return true;
      })();
      if (success) options.onSelect?.({ id: entry.id, title: entry.title, href: entry.href || null, actionId: entry.actionId || null });
      return success;
    }
    function open() {
      if (!state.enabled || destroyed) return false;
      sync();
      if (!windowView.isOpen()) { setQuery(''); windowView.open(); }
      input.focus({ preventScroll: true });
      return doc.activeElement === input;
    }
    function close(reason = 'api') {
      windowView.close(reason);
      syncExpanded();
    }
    const unregister = shortcuts.register({
      id: shortcutId, group: options.group || 'Search', label: options.label || 'Open search',
      defaultShortcut: state.shortcut, enabled: () => state.enabled && !destroyed, handler: open,
    });
    const unsubscribe = shortcuts.subscribe(() => { sync(); if (windowView.isOpen()) setQuery(input.value); });
    listen(input, 'input', () => setQuery(input.value));
    listen(input, 'search', () => setQuery(input.value));
    listen(input, 'keydown', event => {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); event.stopPropagation?.();
        select(index + (event.key === 'ArrowDown' ? 1 : -1), true);
      } else if (event.key === 'Enter') {
        event.preventDefault(); event.stopPropagation?.();
        activate(matches[index], event);
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation?.();
        close('escape');
      }
    });
    listen(results, 'click', event => {
      const row = event.target.closest('[data-search-result]');
      if (!row || !results.contains(row)) return;
      if (row.tagName === 'A' && (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      event.preventDefault();
      activate(matches[Number(row.dataset.searchResult)], event);
    });
    listen(results, 'pointermove', event => {
      const row = event.target.closest('[data-search-result]');
      if (row && results.contains(row)) select(Number(row.dataset.searchResult));
    });
    listen(host, 'click', event => { if (event.target.closest('[data-search-open]')) open(); });
    listen(doc, 'click', event => {
      const opener = event.target.closest?.('[data-search-open]');
      if (host.id && !host.contains(opener) && opener?.dataset.searchOpen === host.id) open();
    });
    const Observer = win.MutationObserver || globalThis.MutationObserver;
    const observer = Observer ? new Observer(records => {
      if (destroyed || records.every(record => host.contains(record.target) || record.target.closest?.('[data-search-owned]'))) return;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (destroyed) return;
        sync();
        if (windowView.isOpen()) setQuery(input.value);
      });
    }) : null;
    observer?.observe(doc.body || doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['href', 'target', 'rel', 'download', 'id', 'title', 'alt', 'src', 'class', 'style', 'hidden', 'inert', 'disabled', 'aria-disabled', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'data-menu-page', 'data-menu-group', 'data-search-anchor', 'data-search-href', 'data-search-title', 'data-search-description', 'data-search-keywords', 'data-search-group', 'data-search-icon', 'data-search-image', 'data-search-ignore'] });
    const attributes = Observer ? new Observer(() => { if (!destroyed) { readAttributes(); shortcuts.setDefault(shortcutId, state.shortcut); sync(); windowView.update({ width: state.width, duration: state.duration, closeOnBackdrop: state.closeOnBackdrop }); if (windowView.isOpen()) setQuery(input.value); } }) : null;
    attributes?.observe(host, { attributes: true, attributeFilter: [...Object.keys(defaults).map(key => 'data-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())),
      'data-navigation', 'data-scope', 'data-exclude', 'data-placeholder', 'data-open-shortcut'] });
    const view = {
      element: host, dialog, input, results, shortcuts, shortcutId, open, focus: open, close, isOpen: windowView.isOpen,
      setQuery, refresh() { sync(); return setQuery(input.value); }, syncLayout: sync,
      setEnabled(value) { if (typeof value !== 'boolean' || destroyed) return false; configuration.enabled = state.enabled = value; sync(); return true; },
      setShortcut: value => shortcuts.set(shortcutId, value),
      get shortcut() { return shortcuts.get(shortcutId)?.shortcut ?? null; },
      get enabled() { return state.enabled; },
      get trigger() { return trigger; },
      update(patch = {}) {
        if (destroyed) return [];
        Object.assign(configuration, patch); readAttributes();
        shortcuts.setDefault(shortcutId, state.shortcut);
        sync(); windowView.update({ width: state.width, duration: state.duration, closeOnBackdrop: state.closeOnBackdrop });
        return setQuery(input.value);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        observer?.disconnect(); attributes?.disconnect();
        unsubscribe(); unregister();
        listeners.splice(0).forEach(off => off());
        trigger?.removeEventListener('click', open);
        menuSection?.remove(); windowView.destroy();
        mounted.delete(host);
      },
    };
    mounted.set(host, view);
    sync();
    return view;
  }
  return Object.freeze({ mount, collect, find, normalise, safeURL, defaults });
});
