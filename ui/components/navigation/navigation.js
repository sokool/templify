/* Navigation: HTML-first application shell. Classic script for file:// use. */
(function (global) {
  const Shortcuts =
    typeof module === 'object' && module.exports
      ? require('../shortcuts/shortcuts.js')
      : global.DesignSystemShortcuts;
  const Search =
    typeof module === 'object' && module.exports
      ? require('../search/search.js')
      : global.DesignSystemSearch;
  function scrollState(height, content, top) {
    return { overflow: content > height + 2, up: top > 2, down: top + height < content - 2 };
  }
  const structure = `
    <header class="menu-live-header">
      <nav class="wordmark workspace-wordmark" id="workspace-breadcrumbs" aria-label="Breadcrumb"></nav>
      <div class="menu-header-actions">
        <button type="button" class="workspace-theme-toggle" data-theme-toggle
          role="switch" aria-checked="false" aria-label="Dark mode"></button>
        <span class="menu-avatar" aria-label="Account"></span>
      </div>
    </header>
    <nav class="menu-live-nav" id="menu-live-nav" aria-label="Workspace navigation">
      <div class="menu-sidebar-footer">
        <button class="menu-sidebar-toggle" id="menu-sidebar-toggle" type="button"
          aria-expanded="true" aria-controls="menu-live-nav" aria-label="Collapse sidebar">
          <span class="sidebar-toggle-icon" aria-hidden="true">
            <svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M9 3v18"></path>
              <path d="m16 15-3-3 3-3"></path>
            </svg>
          </span>
        </button>
      </div>
    </nav>
    <div class="menu-live-content">
      <p class="eyebrow">Workspace navigation preview</p>
      <h3 id="menu-page-title" class="sr-only"></h3>
      <p class="small" id="menu-page-description"></p>
      <p class="small sr-only" id="menu-search-help" aria-live="polite">Choose a page from the menu.</p>
      <div class="menu-content-items" id="menu-content-items"></div>
    </div>
  `;
  function renderStructure(root, { user, themeControl = false } = {}) {
    if (root.id && root.id !== 'menu-live')
      throw new TypeError('Navigation 0.1 requires root id "menu-live"');
    root.id = 'menu-live';
    root.classList.add('menu-live', 'ds-navigation');
    root.dataset.menuDesign = 'sidebar';
    root.dataset.sidebarCollapsed = root.dataset.sidebarCollapsed || 'false';
    root.innerHTML = structure;
    const avatar = root.querySelector('.menu-avatar');
    if (user) {
      avatar.textContent = user.initials || '';
      avatar.setAttribute('aria-label', user.label || 'Account');
    } else avatar.remove();
    if (!themeControl) root.querySelector('[data-theme-toggle]').remove();
    return root;
  }

  function escapeText(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  }
  const itemActions = new WeakMap();
  const mounted = new WeakMap();
  function renderIcon(name) {
    const paths = {
      search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      x: '<path d="m6 6 12 12M6 18 18 6"/>',
      'chevron-right': '<path d="m9 6 6 6-6 6"/>',
      'chevron-left': '<path d="m15 6-6 6 6 6"/>',
      'chevron-up': '<path d="m6 15 6-6 6 6"/>',
      'chevron-down': '<path d="m6 9 6 6 6-6"/>',
      'panel-left-open': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m4-12 3 3-3 3"/>',
      'panel-left-close': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m7-12-3 3 3 3"/>',
      home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
      dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      folder: '<path d="M3 7V4h6l2 3h10v13H3Z"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      plus: '<path d="M12 4v16M4 12h16"/>',
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || '<rect x="4" y="4" width="16" height="16" rx="3"/>'}</svg>`;
  }
  function normaliseItems(entries, submenuIcons = {}) {
    if (!Array.isArray(entries)) throw new TypeError('Navigation items must be an array');
    const ids = new Set();
    function normalise(entry) {
      if (Array.isArray(entry)) entry = { id: entry[0], label: entry[1], icon: submenuIcons[entry[0]] };
      if (!entry || typeof entry !== 'object') throw new TypeError('Navigation items must be objects');
      const id = String(entry.id ?? entry.group ?? entry.page ?? '');
      if (!id || ids.has(id)) throw new TypeError('Navigation item IDs must be nonempty and unique: ' + id);
      if (entry.onClick != null && typeof entry.onClick !== 'function') throw new TypeError('Navigation onClick must be a function');
      ids.add(id);
      const children = entry.children ?? entry.pages;
      if (children != null && !Array.isArray(children)) throw new TypeError('Navigation children must be an array');
      return { ...entry, id, icon: entry.icon ?? submenuIcons[id], label: String(entry.label ?? ''), children: children?.map(normalise) };
    }
    return entries.map(normalise);
  }
  function navigationItem(document, item, uiIcon, nested = false) {
    const node = document.createElement(item.href != null ? 'a' : 'button');
    if (item.href != null) {
      const href = String(item.href);
      node.setAttribute('href', /^(?:javascript|data|vbscript):/i.test(href.replace(/[\u0000-\u0020]/g, '')) ? '#' : href);
      for (const name of ['target', 'rel']) if (item[name]) node.setAttribute(name, item[name]);
    } else node.type = 'button';
    node.className = nested ? 'menu-sub-action' : 'menu-nav-action';
    node.dataset.menuPage = item.id;
    for (const [name, value] of Object.entries({
      searchDescription: item.description, searchKeywords: item.keywords,
      searchIcon: item.icon, searchImage: item.image,
    })) if (value) node.dataset[name] = Array.isArray(value) ? value.join(' ') : String(value);
    node.setAttribute('aria-label', item.label);
    const icon = document.createElement('span');
    icon.className = nested ? 'menu-sub-icon' : 'menu-nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (item.icon) icon.innerHTML = uiIcon(item.icon);
    else icon.textContent = Array.from(item.label.trim())[0] || '•';
    node.append(icon);
    const label = document.createElement('span');
    label.className = nested ? 'menu-sub-label' : 'menu-nav-label';
    label.textContent = item.label;
    node.append(label);
    if (item.disabled) {
      node.setAttribute('aria-disabled', 'true');
      if (node.tagName === 'BUTTON') node.disabled = true;
      else node.tabIndex = -1;
    }
    if (item.onClick) itemActions.set(node, item.onClick);
    return node;
  }
  function createNavItem(root, page, label, icon, uiIcon) {
    const document = root.ownerDocument;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-nav-action';
    button.dataset.menuPage = page;
    button.setAttribute('aria-label', label);
    button.innerHTML =
      '<span class="menu-nav-icon" aria-hidden="true">' +
      uiIcon(icon) +
      '</span><span class="menu-nav-label">' +
      escapeText(label) +
      '</span>';
    return button;
  }
  function renderNavigation(
    root,
    entries,
    { renderIcon: uiIcon = renderIcon, submenuIcons = {} } = {},
  ) {
    const items = normaliseItems(entries, submenuIcons), document = root.ownerDocument;
    let container = root.querySelector('.workspace-nav-items');
    if (!container) {
      container = document.createElement('div');
      container.className = 'workspace-nav-items';
      Array.from(root.querySelector('.menu-live-nav').children)
        .filter(node => node.matches('.menu-nav-action') || node.matches('.menu-section'))
        .forEach(node => container.append(node));
      root.querySelector('.menu-sidebar-footer').before(container);
    }
    function append(parent, entries, nested = false) {
      for (const entry of entries) {
        if (!entry.children) { parent.append(navigationItem(document, entry, uiIcon, nested)); continue; }
        const section = document.createElement('div'), button = navigationItem(document, { ...entry, href: null }, uiIcon, nested);
        section.className = 'menu-section';
        delete button.dataset.menuPage;
        button.dataset.menuGroup = entry.id;
        button.classList.add('menu-nav-parent');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'submenu-' + encodeURIComponent(entry.id));
        const chevron = document.createElement('span');
        chevron.className = 'menu-group-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.innerHTML = uiIcon('chevron-right');
        button.append(chevron);
        const panel = document.createElement('div'), heading = document.createElement('span');
        panel.className = 'menu-submenu';
        panel.id = button.getAttribute('aria-controls');
        panel.hidden = true;
        heading.className = 'submenu-heading';
        heading.textContent = entry.label;
        panel.append(heading);
        append(panel, entry.children, true);
        section.append(button, panel);
        parent.append(section);
      }
    }
    // Build off-DOM first so validation/rendering failures leave the current menu intact.
    const staging = document.createElement('div');
    append(staging, items);
    container.replaceChildren(...Array.from(staging.children));
    return container;
  }
  function normaliseMenuQuery(value) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l')
      .trim();
  }

  function findMenuItems(entries, query) {
    const words = normaliseMenuQuery(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return entries.filter((entry) => {
      const text = normaliseMenuQuery(`${entry.group || ''} ${entry.label} ${entry.page}`);
      return words.every((word) => text.includes(word));
    });
  }

  const defaultSearchShortcut = 'Mod+K';
  const searchShortcutId = 'navigation.search';
  const defaultSidebarShortcut = 'Mod+B';
  const sidebarShortcutId = 'navigation.toggleSidebar';
  // Compatibility aliases; parsing belongs to the shared Shortcuts component.
  const normaliseSearchShortcut = Shortcuts.normalise;
  const searchShortcutFromEvent = Shortcuts.fromEvent;

  function createMenuSearch(root, { enabled, shortcut, shortcuts, renderIcon, onNavigate }) {
    // Compatibility facade only: Search owns the dialog, index and menu trigger.
    const host = root.ownerDocument.createElement('section');
    root.append(host);
    const view = Search.mount(host, {
      navigation: root, enabled, shortcuts, renderIcon, onNavigate,
      shortcutId: searchShortcutId, group: 'Navigation', label: 'Menu search',
      shortcut: shortcut === undefined ? defaultSearchShortcut : shortcut,
    });
    // Retain the public Navigation search target while replacing its presentation.
    view.dialog.id = 'menu-search-panel';
    view.trigger?.setAttribute('aria-controls', view.dialog.id);
    const destroy = view.destroy;
    view.destroy = () => { destroy(); host.remove(); };
    return view;
  }

  function mount(root, options = {}) {
    if (!root) throw new TypeError('Navigation requires a root element');
    if (mounted.has(root)) return mounted.get(root);
    const document = root.ownerDocument,
      window = document.defaultView || global;
    const viewport = options.viewport || root.parentElement;
    const uiIcon = options.renderIcon || renderIcon,
      storage = options.storage || {
        getItem() {
          return null;
        },
        setItem() {},
      };
    const storageKey = options.storageKey || 'navigation';
    const status = options.statusElement || { textContent: '' };
    if (options.items) renderNavigation(root, options.items, { renderIcon: uiIcon });
    for (const [name, value] of [['collapse', options.collapse], ['search', options.search ?? options.searchEnabled]]) {
      if (value !== undefined && root.dataset[name] === undefined) root.dataset[name] = String(value);
    }
    let collapseEnabled = root.dataset.collapse !== 'false';
    const shortcutDefault = (attribute, fallback) => {
      const value = root.getAttribute(attribute);
      return value === null ? fallback : value === '' || value === 'false' ? null : Shortcuts.normalise(value) || fallback;
    };
    root.style.setProperty('--navigation-fold-duration', (options.foldDuration ?? 700) + 'ms');
    const observers = [],
      listeners = [];
    let destroyed = false,
      searchController = null,
      disposeSidebarShortcut = () => {};
    function listen(target, type, handler, settings) {
      target.addEventListener(type, handler, settings);
      listeners.push(() => target.removeEventListener(type, handler, settings));
    }
    function observe(observer) {
      observers.push(observer);
      return observer;
    }
    // A focused button can keep :focus-visible after a keyboard → pointer switch.
    // Track input modality without blurring it or losing keyboard focus restoration.
    listen(
      root,
      'pointerdown',
      () => {
        root.dataset.inputModality = 'pointer';
      },
      true,
    );
    listen(
      document,
      'keydown',
      () => {
        root.dataset.inputModality = 'keyboard';
      },
      true,
    );
    let afterSync = () => {};
    const nav = root.querySelector('.menu-live-nav'), footer = root.querySelector('.menu-sidebar-footer');
    const sidebarToggle = root.querySelector('#menu-sidebar-toggle');
    let items = root.querySelector('.workspace-nav-items');
    if (!items) {
      items = document.createElement('div');
      items.className = 'workspace-nav-items';
      Array.from(nav.children).filter(node => node !== footer && !node.classList.contains('menu-search-section')).forEach(node => items.append(node));
      footer.before(items);
    }
    const edgeToggle = document.createElement('button');
    edgeToggle.type = 'button';
    edgeToggle.className = 'menu-sidebar-edge-toggle';
    edgeToggle.setAttribute('aria-controls', nav.id);
    nav.append(edgeToggle);
    let foldLabel = sidebarToggle.querySelector('.menu-sidebar-toggle-label');
    if (!foldLabel) {
      foldLabel = document.createElement('span');
      foldLabel.className = 'menu-sidebar-toggle-label';
      foldLabel.textContent = 'Sidebar';
      sidebarToggle.append(foldLabel);
    }
    const sidebarGroups = Array.from(document.querySelectorAll('#menu-live [data-menu-group]'));
    const expandedMenuGroups = Object.assign(Object.create(null), Object.fromEntries(
      sidebarGroups.map((button) => [button.dataset.menuGroup, false]),
    ));
    let hasSavedMenuGroups = false;
    try {
      const savedGroups = JSON.parse(storage.getItem(storageKey + '-menu-groups'));
      if (savedGroups && typeof savedGroups === 'object') {
        hasSavedMenuGroups = true;
        Object.keys(expandedMenuGroups).forEach((key) => {
          if (typeof savedGroups[key] === 'boolean') expandedMenuGroups[key] = savedGroups[key];
        });
      }
    } catch {}
    function rememberWorkspaceMenu() {
      try {
        storage.setItem(
          storageKey + '-sidebar-collapsed',
          document.getElementById('menu-live').dataset.sidebarCollapsed,
        );
        storage.setItem(storageKey + '-menu-groups', JSON.stringify(expandedMenuGroups));
      } catch {}
    }

    function syncEdgeBackground() {
      const collapsed = root.dataset.sidebarCollapsed === 'true';
      function fillAt(content, y) {
        const row = Array.from(content.querySelectorAll('button,a')).find(node => {
          const box = node.getBoundingClientRect();
          return box.height > 0 && y >= box.top && y < box.bottom;
        });
        const active = row && (row.getAttribute('aria-current') === 'page' || row.getAttribute('aria-pressed') === 'true' || row.classList.contains('has-current-page') || (collapsed && row.getAttribute('aria-expanded') === 'true'));
        return active ? row.classList.contains('menu-sub-action') ? 'var(--submenu-selection,var(--ds-colour-selection))' : 'var(--menu-selection,var(--ds-colour-selection))' : 'var(--surface,var(--ds-colour-soft))';
      }
      const box = edgeToggle.getBoundingClientRect();
      edgeToggle.style.setProperty('--notch-fill', collapsed ? fillAt(items, box.top + box.height / 2) : 'var(--panel,var(--ds-colour-panel))');
      root.querySelectorAll('.menu-scroll-indicator').forEach(arrow => {
        const box = arrow.getBoundingClientRect(), content = arrow.parentNode.querySelector('.workspace-nav-items') || arrow.parentNode.querySelector('.menu-sidebar-footer');
        if (content) arrow.style.setProperty('--notch-fill', fillAt(content, box.top + box.height / 2 + (arrow.classList.contains('up') ? 2 : -2)));
      });
    }
    function syncFoldControls() {
      const collapsed = root.dataset.sidebarCollapsed === 'true';
      sidebarToggle.hidden = !collapseEnabled;
      edgeToggle.hidden = !collapseEnabled;
      edgeToggle.setAttribute('aria-expanded', String(!collapsed));
      edgeToggle.setAttribute('aria-label', (collapsed ? 'Expand' : 'Collapse') + ' sidebar from edge');
      edgeToggle.innerHTML = uiIcon(collapsed ? 'chevron-right' : 'chevron-left');
      syncEdgeBackground();
    }

    let openSidebarFlyout = null;
    function isSidebarCompact() {
      return (
        viewport.clientWidth > 620 &&
        root.dataset.sidebarCollapsed === 'true' &&
        root.dataset.sidebarFolding !== 'collapse'
      );
    }
    let foldAnimations = [],
      foldVersion = 0;
    function clearFoldAnimations() {
      foldVersion++;
      foldAnimations.forEach((animation) => animation.cancel());
      foldAnimations = [];
      delete root.dataset.sidebarFolding;
    }
    const submenuAnimations = new WeakMap();
    function setSubmenuVisible(panel, open, animate) {
      const desired = String(Boolean(open));
      if (panel.dataset.open === desired && panel.hidden === !open) return;
      const previous = submenuAnimations.get(panel);
      const fromHeight = panel.hidden ? 0 : panel.getBoundingClientRect().height;
      panel.dataset.open = desired;
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
      if (previous) previous.cancel();
      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!animate || reduced || typeof panel.animate !== 'function') {
        panel.hidden = !open;
        panel.style.overflow = '';
        submenuAnimations.delete(panel);
        return;
      }
      panel.hidden = false;
      const compact = isSidebarCompact();
      panel.style.overflow = 'hidden';
      const frames = compact
        ? [
            { opacity: open ? 0 : 1, transform: open ? 'translateY(-4px)' : 'translateY(0)' },
            { opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(-4px)' },
          ]
        : [
            { height: fromHeight + 'px', opacity: open ? 0 : 1 },
            { height: (open ? panel.scrollHeight : 0) + 'px', opacity: open ? 1 : 0 },
          ];
      const animation = panel.animate(frames, {
        duration: 180,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      });
      submenuAnimations.set(panel, animation);
      animation.finished
        .then(() => {
          if (submenuAnimations.get(panel) !== animation) return;
          panel.hidden = !open;
          panel.style.overflow = '';
          submenuAnimations.delete(panel);
        })
        .catch(() => {});
    }
    function syncSidebarSubmenus(animate = true) {
      const compact = isSidebarCompact();
      const ready = document.getElementById('menu-live').dataset.motionReady === 'true';
      sidebarGroups.forEach((button) => {
        const group = button.dataset.menuGroup;
        const open = compact ? openSidebarFlyout === group : expandedMenuGroups[group];
        button.setAttribute('aria-expanded', String(Boolean(open)));
        setSubmenuVisible(
          document.getElementById(button.getAttribute('aria-controls')),
          Boolean(open),
          animate && ready,
        );
      });
      searchController?.syncLayout();
      afterSync();
    }
    function setSidebarCollapsed(collapsed, remember = true) {
      const value = collapseEnabled && Boolean(collapsed);
      const wasCollapsed = root.dataset.sidebarCollapsed === 'true';
      const visibleFlyout = openSidebarFlyout;
      clearFoldAnimations();
      if (!value && visibleFlyout) expandedMenuGroups[visibleFlyout] = true;
      openSidebarFlyout = null;
      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = options.foldDuration ?? 700;
      const fading =
        remember &&
        wasCollapsed !== value &&
        viewport.clientWidth > 620 &&
        !reduced &&
        typeof sidebarGroups[0]?.animate === 'function';
      if (value && !fading && remember) openSidebarFlyout = sidebarGroups.find(button => expandedMenuGroups[button.dataset.menuGroup])?.dataset.menuGroup || null;
      // During collapse retain inline submenus until their fade completes. Their
      // expanded state remains stored, ready for the next unfold.
      if (fading && value) root.dataset.sidebarFolding = 'collapse';
      document.getElementById('menu-live').dataset.sidebarCollapsed = String(value);
      sidebarToggle.setAttribute('aria-expanded', String(!value));
      sidebarToggle.setAttribute('aria-label', value ? 'Expand sidebar' : 'Collapse sidebar');
      document.querySelector('#menu-sidebar-toggle .sidebar-toggle-icon').innerHTML = uiIcon(
        value ? 'panel-left-open' : 'panel-left-close',
      );
      status.textContent = value
        ? 'Icon rail · collapsed · click an icon to open its submenu'
        : 'Workspace sidebar · expanded · groups contain nested pages';
      syncSidebarSubmenus(false);
      syncFoldControls();
      if (fading) {
        const version = foldVersion;
        const panels = sidebarGroups
          .map((button) => document.getElementById(button.getAttribute('aria-controls')))
          .filter((panel) => !panel.hidden);
        foldAnimations = panels.map((panel) =>
          panel.animate([{ opacity: value ? 1 : 0 }, { opacity: value ? 0 : 1 }], {
            duration,
            easing: 'ease',
            fill: 'both',
          }),
        );
        Promise.all(foldAnimations.map((animation) => animation.finished))
          .then(() => {
            if (version !== foldVersion || destroyed) return;
            delete root.dataset.sidebarFolding;
            syncSidebarSubmenus(false);
            foldAnimations.forEach((animation) => animation.cancel());
            foldAnimations = [];
          })
          .catch(() => {});
      }
      if (remember) {
        try {
          storage.setItem(storageKey + '-sidebar-collapsed', String(value));
        } catch {}
      }
    }
    function toggleSidebarGroup(group) {
      if (isSidebarCompact()) openSidebarFlyout = openSidebarFlyout === group ? null : group;
      else expandedMenuGroups[group] = !expandedMenuGroups[group];
      rememberWorkspaceMenu();
      syncSidebarSubmenus();
    }
    const itemListeners = [];
    function bindItems() {
      itemListeners.splice(0).forEach(off => off());
      items.querySelectorAll('.menu-nav-action').forEach(node => {
        if (node.querySelector('.menu-nav-icon')) return;
        const label = node.getAttribute('aria-label') || node.textContent.trim(), icon = document.createElement('span');
        node.setAttribute('aria-label', label);
        icon.className = 'menu-nav-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = Array.from(label)[0] || '•';
        node.prepend(icon);
      });
      function on(node, type, handler) {
        node.addEventListener(type, handler);
        itemListeners.push(() => node.removeEventListener(type, handler));
      }
      sidebarGroups.forEach((button) => {
        on(button, 'click', () => {
          if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') toggleSidebarGroup(button.dataset.menuGroup);
        });
        on(button, 'keydown', (event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (button.getAttribute('aria-expanded') !== 'true') toggleSidebarGroup(button.dataset.menuGroup);
            document.getElementById(button.getAttribute('aria-controls')).querySelector('[data-menu-page]')?.focus();
          } else if (event.key === 'ArrowLeft' && button.getAttribute('aria-expanded') === 'true') {
            event.preventDefault();
            toggleSidebarGroup(button.dataset.menuGroup);
          }
        });
      });
      root.querySelectorAll('[data-menu-page]').forEach(node => on(node, 'click', event => {
        if (node.disabled || node.getAttribute('aria-disabled') === 'true') { event.preventDefault?.(); return; }
        if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        itemActions.get(node)?.(event);
        if (event.defaultPrevented) return;
        options.onNavigate?.(node.dataset.menuPage, event);
      }));
    }
    bindItems();
    function refreshItems() {
      sidebarGroups.splice(0, sidebarGroups.length, ...Array.from(root.querySelectorAll('[data-menu-group]')));
      const keys = new Set(sidebarGroups.map(button => button.dataset.menuGroup));
      for (const key of Object.keys(expandedMenuGroups)) if (!keys.has(key)) delete expandedMenuGroups[key];
      keys.forEach(key => { expandedMenuGroups[key] ??= false; });
      if (!keys.has(openSidebarFlyout)) openSidebarFlyout = null;
      bindItems();
      syncSidebarSubmenus(false);
      if (searchController) searchController.setQuery(searchController.input.value);
    }
    listen(sidebarToggle, 'click', () =>
      setSidebarCollapsed(document.getElementById('menu-live').dataset.sidebarCollapsed !== 'true'),
    );
    listen(edgeToggle, 'click', () => setSidebarCollapsed(root.dataset.sidebarCollapsed !== 'true'));
    listen(document.getElementById('menu-live-nav'), 'keydown', (event) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'Escape' && event.key !== 'ArrowLeft') return;
      const group =
        sidebarGroups.find((button) =>
          document.getElementById(button.getAttribute('aria-controls')).contains(event.target),
        ) ||
        (event.key === 'Escape'
          ? sidebarGroups.find((button) => button.dataset.menuGroup === openSidebarFlyout)
          : null);
      if (!group) return;
      event.preventDefault();
      if (isSidebarCompact()) openSidebarFlyout = null;
      else expandedMenuGroups[group.dataset.menuGroup] = false;
      syncSidebarSubmenus();
      group.focus();
    });
    listen(document, 'pointerdown', (event) => {
      if (openSidebarFlyout && !document.getElementById('menu-live-nav').contains(event.target)) {
        openSidebarFlyout = null;
        syncSidebarSubmenus();
      }
    });
    let initialSidebarCollapsed = false;
    try {
      initialSidebarCollapsed = storage.getItem(storageKey + '-sidebar-collapsed') === 'true';
    } catch {}
    setSidebarCollapsed(initialSidebarCollapsed, false);
    if (typeof ResizeObserver !== 'undefined') {
      let sidebarWasCompact = isSidebarCompact();
      const sidebarObserver = observe(
        new ResizeObserver(() => {
          const compact = isSidebarCompact();
          if (compact !== sidebarWasCompact) {
            openSidebarFlyout = null;
            sidebarWasCompact = compact;
            syncSidebarSubmenus(false);
          }
        }),
      );
      sidebarObserver.observe(viewport);
    }
    const api = {
      root,
      slots: {
        header: root.querySelector('.menu-live-header'),
        breadcrumbs: root.querySelector('#workspace-breadcrumbs'),
        actions: root.querySelector('.menu-header-actions'),
        navigation: root.querySelector('.menu-live-nav'),
        footer: root.querySelector('.menu-sidebar-footer'),
        content: root.querySelector('.menu-live-content'),
      },
      sidebarToggle,
      edgeToggle,
      sidebarGroups,
      expandedGroups: expandedMenuGroups,
      get hasSavedGroups() {
        return hasSavedMenuGroups;
      },
      get openFlyout() {
        return openSidebarFlyout;
      },
      set openFlyout(value) {
        openSidebarFlyout = value;
      },
      isCompact: isSidebarCompact,
      syncSubmenus: syncSidebarSubmenus,
      setCollapsed: setSidebarCollapsed,
      setCollapse(value) {
        if (typeof value !== 'boolean' || destroyed) return false;
        if (root.dataset.collapse !== String(value)) root.dataset.collapse = String(value);
        collapseEnabled = value;
        if (!value) setSidebarCollapsed(false, false);
        syncFoldControls();
        if (api.mobile) {
          api.mobile.toggle.hidden = !value;
          api.mobile.close.hidden = !value;
          api.mobile.setOpen(!value || root.dataset.mobileMenuOpen === 'true');
        }
        return true;
      },
      setItems(entries) {
        if (destroyed) return false;
        const selected = nav.querySelector('[aria-current="page"]')?.dataset.menuPage;
        // Validate before closing or replacing the currently displayed menu.
        normaliseItems(entries);
        clearFoldAnimations();
        sidebarGroups.forEach(button => {
          const panel = document.getElementById(button.getAttribute('aria-controls'));
          submenuAnimations.get(panel)?.cancel();
          if (panel.matches(':popover-open')) panel.hidePopover();
        });
        renderNavigation(root, entries, { renderIcon: uiIcon });
        openSidebarFlyout = null;
        refreshItems();
        if (selected) api.select(selected);
        searchController.setQuery(searchController.input.value);
        api.overflow?.schedule();
        return true;
      },
      toggleSidebar() {
        if (!collapseEnabled || destroyed) return false;
        if (viewport.clientWidth <= 620) {
          if (!api.mobile) return false;
          api.mobile.setOpen(root.dataset.mobileMenuOpen !== 'true', true);
        } else {
          const focusInNavigation = api.slots.navigation.contains(document.activeElement);
          setSidebarCollapsed(root.dataset.sidebarCollapsed !== 'true');
          if (focusInNavigation) sidebarToggle.focus();
        }
        return true;
      },
      toggleGroup: toggleSidebarGroup,
      remember: rememberWorkspaceMenu,
      select(page) {
        root.querySelectorAll('[data-menu-page]').forEach((button) => {
          if (button.dataset.menuPage === page) button.setAttribute('aria-current', 'page');
          else button.removeAttribute('aria-current');
        });
        sidebarGroups.forEach((button) => {
          const panel = document.getElementById(button.getAttribute('aria-controls'));
          button.classList.toggle(
            'has-current-page',
            button.dataset.menuGroup === page ||
              Boolean(Array.from(panel?.querySelectorAll('[data-menu-page]') || []).some(node => node.dataset.menuPage === page)),
          );
        });
        if (isSidebarCompact() && openSidebarFlyout) {
          const group = sidebarGroups.find(
            (button) => button.dataset.menuGroup === openSidebarFlyout,
          );
          openSidebarFlyout = null;
          syncSidebarSubmenus();
          group?.focus();
        }
        if (api.mobile?.isMobile() && collapseEnabled) api.mobile.setOpen(false, true);
      },
      installMobile() {
        if (api.mobile) return api.mobile;
        const mobileWorkspace = document.getElementById('menu-live'),
          mobileWorkspaceNav = document.getElementById('menu-live-nav');
        const mobileWorkspaceToggle = document.createElement('button');
        mobileWorkspaceToggle.type = 'button';
        mobileWorkspaceToggle.className = 'workspace-hamburger';
        mobileWorkspaceToggle.setAttribute('aria-label', 'Open navigation');
        mobileWorkspaceToggle.setAttribute('aria-expanded', 'false');
        mobileWorkspaceToggle.setAttribute('aria-controls', 'menu-live-nav');
        mobileWorkspaceToggle.innerHTML = uiIcon('menu');
        mobileWorkspace.querySelector('.menu-live-header').prepend(mobileWorkspaceToggle);
        const mobileClose = document.createElement('button');
        mobileClose.type = 'button';
        mobileClose.className = 'menu-mobile-close';
        mobileClose.setAttribute('aria-label', 'Close navigation');
        mobileClose.setAttribute('aria-controls', mobileWorkspaceNav.id);
        mobileClose.innerHTML = uiIcon('x');
        mobileWorkspaceNav.prepend(mobileClose);
        function isMobileWorkspace() {
          return viewport.clientWidth <= 620;
        }
        function syncMobilePosition() {
          if (!isMobileWorkspace()) return;
          mobileWorkspace.style.setProperty('--mobile-nav-left', viewport.getBoundingClientRect().left + 'px');
        }
        function setMobileWorkspaceMenu(open, restoreFocus = false) {
          const mobile = isMobileWorkspace(),
            value = mobile && (!collapseEnabled || Boolean(open)),
            wasOpen = mobileWorkspace.dataset.mobileMenuOpen === 'true';
          mobileWorkspace.dataset.mobileMenuOpen = String(value);
          mobileWorkspaceToggle.setAttribute('aria-expanded', String(value));
          mobileWorkspaceToggle.setAttribute(
            'aria-label',
            value ? 'Close navigation' : 'Open navigation',
          );
          mobileWorkspaceToggle.innerHTML = uiIcon(value ? 'x' : 'menu');
          mobileWorkspaceNav.inert = mobile && !value;
          syncMobilePosition();
          if (mobile)
            status.textContent = value
              ? 'Mobile navigation · choose a page or expand a group'
              : 'Mobile navigation · open the menu in the top-left corner';
          if (mobile && value && collapseEnabled && (!wasOpen || restoreFocus))
            mobileClose.focus({ preventScroll: true });
          else if (restoreFocus && mobile) mobileWorkspaceToggle.focus({ preventScroll: true });
        }
        listen(mobileWorkspaceToggle, 'click', () =>
          setMobileWorkspaceMenu(mobileWorkspace.dataset.mobileMenuOpen !== 'true'),
        );
        listen(mobileClose, 'click', () => setMobileWorkspaceMenu(false, true));
        listen(window, 'resize', syncMobilePosition);
        listen(mobileWorkspaceNav, 'click', (event) => {
          if (isMobileWorkspace() && event.target.closest('[data-menu-page]'))
            setMobileWorkspaceMenu(false, true);
        });
        listen(document, 'pointerdown', (event) => {
          if (
            isMobileWorkspace() &&
            mobileWorkspace.dataset.mobileMenuOpen === 'true' &&
            !mobileWorkspaceNav.contains(event.target) &&
            !mobileWorkspaceToggle.contains(event.target)
          )
            setMobileWorkspaceMenu(false);
        });
        listen(document, 'keydown', (event) => {
          if (
            event.key === 'Escape' &&
            collapseEnabled &&
            !event.defaultPrevented &&
            isMobileWorkspace() &&
            mobileWorkspace.dataset.mobileMenuOpen === 'true'
          ) {
            event.preventDefault();
            setMobileWorkspaceMenu(false, true);
          }
        });
        let workspaceWasMobile = isMobileWorkspace();
        if (typeof ResizeObserver !== 'undefined') {
          const mobileWorkspaceObserver = observe(
            new ResizeObserver(() => {
              const mobile = isMobileWorkspace();
              if (mobile !== workspaceWasMobile) {
                workspaceWasMobile = mobile;
                openSidebarFlyout = null;
                setMobileWorkspaceMenu(false);
                syncSidebarSubmenus(false);
                if (!mobile)
                  status.textContent =
                    mobileWorkspace.dataset.sidebarCollapsed === 'true'
                      ? 'Icon rail · collapsed · click an icon to open its submenu'
                      : 'Workspace sidebar · expanded · groups contain nested pages';
              } else if (mobile) syncMobilePosition();
            }),
          );
          mobileWorkspaceObserver.observe(viewport);
        }
        setMobileWorkspaceMenu(false);
        syncSidebarSubmenus(false);

        api.mobile = {
          root: mobileWorkspace,
          nav: mobileWorkspaceNav,
          toggle: mobileWorkspaceToggle,
          close: mobileClose,
          isMobile: isMobileWorkspace,
          setOpen: setMobileWorkspaceMenu,
        };
        syncSidebarShortcut();
        return api.mobile;
      },
      installOverflow({ items: workspaceNavItems, footer: pinnedFooter, nav: pinnedNav }) {
        if (api.overflow) return api.overflow;
        const previewViewport = viewport;
        // Overflow affordances for the main navigation and the pinned utility rail.
        const navScrollRegions = [];
        function menuScrollState(height, content, top) {
          return { overflow: content > height + 2, up: top > 2, down: top + height < content - 2 };
        }
        function updateMenuScrollIndicators() {
          navScrollRegions.forEach(({ region, content, up, down }) => {
            const state = menuScrollState(
              content.clientHeight,
              content.scrollHeight,
              content.scrollTop,
            );
            const overflow = content.scrollHeight > region.clientHeight + 2;
            region.dataset.overflow = String(overflow);
            up.hidden = !overflow;
            down.hidden = !overflow;
            up.disabled = !state.up;
            down.disabled = !state.down;
          });
        }
        [
          [workspaceNavItems, 'primary'],
          [pinnedFooter, 'footer'],
        ].forEach(([content, kind]) => {
          const region = document.createElement('div');
          region.className = 'menu-scroll-region menu-scroll-' + kind;
          content.before(region);
          region.append(content);
          const makeIndicator = (direction) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'menu-scroll-indicator ' + direction;
            button.hidden = true;
            button.setAttribute(
              'aria-label',
              'Scroll ' +
                (kind === 'primary' ? 'navigation' : 'appearance controls') +
                ' ' +
                direction,
            );
            button.innerHTML = uiIcon(direction === 'up' ? 'chevron-up' : 'chevron-down');
            listen(button, 'click', () =>
              content.scrollBy({
                top: (direction === 'up' ? -1 : 1) * Math.max(40, content.clientHeight * 0.7),
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'auto'
                  : 'smooth',
              }),
            );
            region.append(button);
            return button;
          };
          const up = makeIndicator('up'),
            down = makeIndicator('down');
          navScrollRegions.push({ region, content, up, down });
          listen(
            content,
            'scroll',
            () => {
              updateMenuScrollIndicators();
              positionScrollableSubmenus();
            },
            { passive: true },
          );
        });
        // Top-layer flyouts remain visible outside the scrolling icon rail.
        function positionScrollableSubmenus() {
          const floating = isSidebarCompact() && previewViewport.clientWidth > 620;
          sidebarGroups.forEach((button) => {
            const panel = document.getElementById(button.getAttribute('aria-controls'));
            const open = button.getAttribute('aria-expanded') === 'true' && !panel.hidden;
            if (floating) {
              if (!panel.hasAttribute('popover')) panel.setAttribute('popover', 'manual');
              if (open) {
                if (!panel.matches(':popover-open')) panel.showPopover();
                const box = button.getBoundingClientRect();
                const rail = pinnedNav.getBoundingClientRect();
                const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
                panel.style.left = rail.right + 'px';
                panel.style.right = 'auto';
                panel.style.top = Math.max(8, Math.min(box.top, maxTop)) + 'px';
                panel.style.bottom = 'auto';
              } else if (panel.matches(':popover-open')) panel.hidePopover();
            } else if (panel.hasAttribute('popover')) {
              if (panel.matches(':popover-open')) panel.hidePopover();
              panel.removeAttribute('popover');
              ['left', 'right', 'top', 'bottom'].forEach((key) => panel.style.removeProperty(key));
            }
          });
        }
        afterSync = () => {
          if (destroyed) return;
          positionScrollableSubmenus();
          requestAnimationFrame(() => {
            if (!destroyed) updateMenuScrollIndicators();
          });
        };
        let menuScrollUpdateFrame = 0;
        function scheduleMenuScrollUpdate() {
          cancelAnimationFrame(menuScrollUpdateFrame);
          menuScrollUpdateFrame = requestAnimationFrame(() => {
            if (!destroyed) {
              updateMenuScrollIndicators();
              positionScrollableSubmenus();
            }
          });
        }
        const menuScrollResizeObserver = observe(new ResizeObserver(scheduleMenuScrollUpdate));
        navScrollRegions.forEach(({ region, content }) => {
          menuScrollResizeObserver.observe(region);
          menuScrollResizeObserver.observe(content);
          Array.from(content.children).forEach((child) => menuScrollResizeObserver.observe(child));
        });
        menuScrollResizeObserver.observe(pinnedNav);
        listen(window, 'resize', scheduleMenuScrollUpdate);
        listen(window, 'scroll', positionScrollableSubmenus, { passive: true });
        observe(new MutationObserver(scheduleMenuScrollUpdate)).observe(
          document.getElementById('menu-live'),
          { attributes: true, attributeFilter: ['data-sidebar-collapsed'] },
        );
        scheduleMenuScrollUpdate();

        return (api.overflow = {
          regions: navScrollRegions,
          update: updateMenuScrollIndicators,
          position: positionScrollableSubmenus,
          schedule: scheduleMenuScrollUpdate,
        });
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        mounted.delete(root);
        itemListeners.splice(0).forEach(off => off());
        disposeSidebarShortcut();
        searchController?.destroy();
        clearFoldAnimations();
        delete root.dataset.inputModality;
        afterSync = () => {};
        sidebarGroups.forEach((button) =>
          submenuAnimations
            .get(document.getElementById(button.getAttribute('aria-controls')))
            ?.cancel(),
        );
        listeners.splice(0).forEach((remove) => remove());
        observers.splice(0).forEach((observer) => observer.disconnect());
        root.querySelectorAll('[popover]').forEach((panel) => {
          if (panel.matches(':popover-open')) panel.hidePopover();
        });
        root.dataset.motionReady = 'false';
        api.mobile?.toggle.remove();
        api.mobile?.close.remove();
        root.style.removeProperty('--mobile-nav-left');
        api.slots.navigation.inert = false;
        edgeToggle.remove();
        api.overflow?.regions.forEach(({ region, content }) => { region.before(content); region.remove(); });
      },
    };
    searchController = createMenuSearch(root, {
      enabled: root.dataset.search !== 'false',
      shortcut: shortcutDefault('data-search-shortcut', options.searchShortcut === undefined ? defaultSearchShortcut : options.searchShortcut),
      shortcuts: options.shortcuts,
      renderIcon: uiIcon,
      onNavigate(page) {
        options.onNavigate?.(page);
        if (api.mobile?.isMobile()) api.mobile.setOpen(false, true);
      },
    });
    api.search = searchController;
    api.slots.search = searchController.element;
    api.setSearch = (value) => {
      if (typeof value !== 'boolean' || destroyed) return false;
      if (root.dataset.search !== String(value)) root.dataset.search = String(value);
      return searchController.setEnabled(value);
    };
    api.setSearchEnabled = api.setSearch;
    api.setSearchShortcut = (value) => searchController.setShortcut(value);
    api.focusSearch = () => searchController.focus();
    const shortcuts = searchController.shortcuts;
    const unregisterSidebarShortcut = shortcuts.register({
      id: sidebarShortcutId,
      group: 'Navigation',
      label: 'Toggle sidebar',
      description: 'Expand or collapse the navigation sidebar',
      keywords: 'menu navigation panel',
      icon: 'panel-left-close',
      searchable: true,
      defaultShortcut: shortcutDefault('data-collapse-shortcut', options.sidebarShortcut === undefined ? defaultSidebarShortcut : options.sidebarShortcut),
      enabled: () => collapseEnabled && (viewport.clientWidth > 620 || Boolean(api.mobile)),
      handler(event) {
        // Holding the keys must not repeatedly collapse and expand the menu.
        return event.repeat ? true : api.toggleSidebar();
      },
    });
    function syncSidebarShortcut() {
      const value = Shortcuts.aria(shortcuts.get(sidebarShortcutId)?.shortcut);
      for (const control of [sidebarToggle, edgeToggle, api.mobile?.toggle, api.mobile?.close].filter(Boolean)) {
        if (value) control.setAttribute('aria-keyshortcuts', value);
        else control.removeAttribute('aria-keyshortcuts');
      }
    }
    const unsubscribeSidebarShortcut = shortcuts.subscribe(syncSidebarShortcut);
    syncSidebarShortcut();
    api.setSidebarShortcut = (value) => shortcuts.set(sidebarShortcutId, value);
    disposeSidebarShortcut = () => {
      unsubscribeSidebarShortcut();
      unregisterSidebarShortcut();
      for (const control of [sidebarToggle, edgeToggle, api.mobile?.toggle, api.mobile?.close].filter(Boolean)) {
        control.removeAttribute('aria-keyshortcuts');
      }
    };
    if (typeof MutationObserver !== 'undefined') {
      observe(new MutationObserver(() => {
        if (destroyed) return;
        api.setCollapse(root.dataset.collapse !== 'false');
        api.setSearch(root.dataset.search !== 'false');
        shortcuts.setDefault(searchShortcutId, shortcutDefault('data-search-shortcut', options.searchShortcut === undefined ? defaultSearchShortcut : options.searchShortcut));
        shortcuts.setDefault(sidebarShortcutId, shortcutDefault('data-collapse-shortcut', options.sidebarShortcut === undefined ? defaultSidebarShortcut : options.sidebarShortcut));
      })).observe(root, { attributes: true, attributeFilter: ['data-collapse', 'data-search', 'data-search-shortcut', 'data-collapse-shortcut'] });
      observe(new MutationObserver(syncEdgeBackground)).observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current', 'aria-expanded', 'aria-pressed', 'class', 'hidden', 'disabled'] });
      observe(new MutationObserver(() => {
        if (destroyed) return;
        refreshItems();
        api.overflow?.schedule();
      })).observe(items, { subtree: true, childList: true });
    }
    listen(nav, 'scroll', syncEdgeBackground, true);
    if (typeof ResizeObserver !== 'undefined') observe(new ResizeObserver(syncEdgeBackground)).observe(nav);
    api.installMobile();
    api.installOverflow({ items, footer, nav });
    api.setCollapse(collapseEnabled);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!destroyed) root.dataset.motionReady = 'true';
    }));
    mounted.set(root, api);
    return api;
  }
  const api = {
    renderStructure,
    renderNavigation,
    createNavItem,
    mount,
    scrollState,
    findMenuItems,
    defaultSearchShortcut,
    searchShortcutId,
    defaultSidebarShortcut,
    sidebarShortcutId,
    normaliseSearchShortcut,
    searchShortcutFromEvent,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.DesignSystemNavigation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
