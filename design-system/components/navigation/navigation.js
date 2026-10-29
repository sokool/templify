/* Navigation: preserved navigation controller. Classic script for file:// use. */
(function (global) {
  const Shortcuts =
    typeof module === 'object' && module.exports
      ? require('../shortcuts/shortcuts.js')
      : global.DesignSystemShortcuts;
  const Field =
    typeof module === 'object' && module.exports
      ? require('../form/field.js')
      : global.DesignSystemFormField;
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
    { renderIcon: uiIcon = () => '', submenuIcons: workspaceSubmenuIcons = {} } = {},
  ) {
    const document = root.ownerDocument,
      libraryNavFooter = root.querySelector('.menu-sidebar-footer');
    entries.forEach((entry) => {
      if (!entry.group) {
        libraryNavFooter.before(createNavItem(root, entry.page, entry.label, entry.icon, uiIcon));
        return;
      }
      const section = document.createElement('div');
      section.className = 'menu-section';
      const parent = document.createElement('button');
      parent.type = 'button';
      parent.className = 'menu-nav-action menu-nav-parent';
      parent.dataset.menuGroup = entry.group;
      parent.setAttribute('aria-expanded', 'false');
      parent.setAttribute('aria-controls', 'submenu-' + entry.group);
      parent.setAttribute('aria-label', entry.label);
      parent.innerHTML =
        '<span class="menu-nav-icon" aria-hidden="true">' +
        uiIcon(entry.icon) +
        '</span><span class="menu-nav-label">' +
        entry.label +
        '</span><span class="menu-group-chevron" aria-hidden="true">' +
        uiIcon('chevron-right') +
        '</span>';
      const submenu = document.createElement('div');
      submenu.className = 'menu-submenu';
      submenu.id = 'submenu-' + entry.group;
      submenu.hidden = true;
      const heading = document.createElement('span');
      heading.className = 'submenu-heading';
      heading.textContent = entry.label;
      submenu.appendChild(heading);
      entry.pages.forEach(([page, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menu-sub-action';
        button.dataset.menuPage = page;
        button.innerHTML =
          '<span class="menu-sub-icon" aria-hidden="true">' +
          uiIcon(workspaceSubmenuIcons[page]) +
          '</span><span class="menu-sub-label">' +
          escapeText(label) +
          '</span>';
        submenu.appendChild(button);
      });
      section.append(parent, submenu);
      libraryNavFooter.before(section);
    });
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

  const defaultSearchShortcut = 'Mod+F';
  const searchShortcutId = 'navigation.search';
  const defaultSidebarShortcut = 'Mod+B';
  const sidebarShortcutId = 'navigation.toggleSidebar';
  // Compatibility aliases; parsing belongs to the shared Shortcuts component.
  const normaliseSearchShortcut = Shortcuts.normalise;
  const searchShortcutFromEvent = Shortcuts.fromEvent;

  function createMenuSearch(
    root,
    { enabled, shortcut, shortcuts: sharedShortcuts, isCompact, renderIcon, onNavigate, onReveal },
  ) {
    const document = root.ownerDocument;
    const window = document.defaultView;
    const listeners = [];
    let opened = false;
    let compact;
    let matches = [];
    const shortcuts = sharedShortcuts || Shortcuts.create({ document });

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function listen(target, event, handler) {
      target.addEventListener(event, handler);
      listeners.push(() => target.removeEventListener(event, handler));
    }

    const section = element('section', 'menu-search-section');
    section.setAttribute('aria-label', 'Menu search');
    const trigger = element('button', 'menu-search-toggle');
    trigger.type = 'button';
    trigger.innerHTML = renderIcon('search') || '⌕';
    trigger.setAttribute('aria-label', 'Search menu');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'menu-search-panel');
    const panel = element('div', 'menu-search-panel');
    panel.id = 'menu-search-panel';
    panel.setAttribute('aria-label', 'Search menu');
    const searchField = Field.mount(panel, {
      type: 'search',
      accessibleLabel: 'Search menu',
      attrs: {
        value: '',
        placeholder: 'Search menu…',
        autocomplete: 'off',
        'aria-controls': 'menu-search-results',
      },
    });
    const input = searchField.control;
    const results = element('div', 'menu-search-results');
    results.id = 'menu-search-results';
    results.setAttribute('role', 'group');
    results.setAttribute('aria-label', 'Matching menu items');
    const status = element('p', 'menu-search-status');
    status.setAttribute('role', 'status');
    panel.append(results, status);
    section.append(trigger, panel);
    root.querySelector('.menu-live-nav').prepend(section);

    function entries() {
      const unique = new Map();
      for (const button of root
        .querySelector('.menu-live-nav')
        .querySelectorAll('[data-menu-page]')) {
        if (button.hidden || button.disabled) continue;
        const parent = button.closest('.menu-section')?.querySelector('[data-menu-group]');
        const page = button.dataset.menuPage;
        if (!unique.has(page))
          unique.set(page, {
            page,
            label: button.getAttribute('aria-label') || button.textContent.trim(),
            group: parent?.getAttribute('aria-label') || parent?.textContent.trim() || '',
          });
      }
      return [...unique.values()];
    }

    function position() {
      if (!compact || !opened) return;
      const anchor = trigger.getBoundingClientRect();
      const rail = section.parentNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth || 320;
      const width = Math.min(320, Math.max(0, viewportWidth - rail.right - 8));
      panel.style.width = width + 'px';
      panel.style.maxHeight = Math.max(80, window.innerHeight - 16) + 'px';
      const height = panel.getBoundingClientRect().height;
      panel.style.left = rail.right + 'px';
      panel.style.top = Math.max(8, Math.min(anchor.top, window.innerHeight - height - 8)) + 'px';
    }

    function setQuery(value) {
      input.value = enabled ? String(value) : '';
      matches = enabled ? findMenuItems(entries(), input.value) : [];
      results.replaceChildren();
      for (const entry of matches) {
        const button = element('button', 'menu-search-result');
        button.type = 'button';
        button.setAttribute(
          'aria-label',
          entry.group ? `${entry.group} → ${entry.label}` : entry.label,
        );
        button.append(element('span', '', entry.label));
        if (entry.group) button.append(element('small', '', entry.group));
        button.addEventListener('click', () => activate(entry));
        results.append(button);
      }
      const searching = Boolean(normaliseMenuQuery(input.value));
      results.hidden = !searching || matches.length === 0;
      status.hidden = !searching;
      status.textContent = searching
        ? matches.length
          ? `${matches.length} menu item${matches.length === 1 ? '' : 's'}`
          : 'No matching menu items'
        : '';
      position();
      return matches.slice();
    }

    function close(restoreFocus = false) {
      opened = false;
      if (panel.matches(':popover-open')) panel.hidePopover();
      panel.hidden = compact || !enabled;
      trigger.setAttribute('aria-expanded', 'false');
      setQuery('');
      if (restoreFocus) (compact ? trigger : input).focus();
    }

    function activate(entry) {
      close(true);
      onNavigate(entry.page);
    }

    function syncLayout() {
      const nextCompact = isCompact();
      if (compact !== undefined && nextCompact !== compact) close();
      compact = nextCompact;
      section.dataset.compact = String(compact);
      section.hidden = !enabled;
      trigger.hidden = !compact;
      panel.setAttribute('role', compact ? 'dialog' : 'search');
      if (compact) panel.setAttribute('popover', 'manual');
      else {
        if (panel.matches(':popover-open')) panel.hidePopover();
        panel.removeAttribute('popover');
        for (const name of ['width', 'max-height', 'left', 'top']) panel.style.removeProperty(name);
      }
      panel.hidden = !enabled || (compact && !opened);
      position();
    }

    function setEnabled(value) {
      if (typeof value !== 'boolean') return false;
      if (!value) close();
      enabled = value;
      input.disabled = !enabled;
      syncLayout();
      return true;
    }

    function setShortcut(value) {
      return shortcuts.set(searchShortcutId, value);
    }

    function syncShortcut() {
      const value = Shortcuts.aria(shortcuts.get(searchShortcutId)?.shortcut);
      for (const control of [input, trigger]) {
        if (value) control.setAttribute('aria-keyshortcuts', value);
        else control.removeAttribute('aria-keyshortcuts');
      }
    }

    function focus() {
      if (!enabled) return false;
      onReveal?.();
      syncLayout();
      if (compact && !opened) {
        opened = true;
        panel.hidden = false;
        if (panel.showPopover) panel.showPopover();
        trigger.setAttribute('aria-expanded', 'true');
        position();
      }
      input.focus();
      if (document.activeElement !== input) return false;
      input.select?.();
      return true;
    }

    listen(trigger, 'click', () => {
      if (!enabled) return;
      if (opened) {
        close(true);
        return;
      }
      focus();
    });
    listen(input, 'input', () => setQuery(input.value));
    listen(input, 'search', () => setQuery(input.value));
    listen(panel, 'keydown', (event) => {
      if (event.key === 'Escape' && (input.value || opened)) {
        event.preventDefault();
        event.stopPropagation?.();
        close(true);
      } else if (event.key === 'Enter' && event.target === input && matches.length) {
        event.preventDefault();
        activate(matches[0]);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const buttons = [...results.querySelectorAll('button')];
        if (!buttons.length) return;
        event.preventDefault();
        const current = buttons.indexOf(document.activeElement);
        const next =
          current < 0
            ? event.key === 'ArrowDown'
              ? 0
              : buttons.length - 1
            : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      }
    });
    listen(document, 'pointerdown', (event) => {
      if (!section.contains(event.target)) close();
    });
    listen(document, 'focusin', (event) => {
      if (!section.contains(event.target)) close();
    });
    const unregisterShortcut = shortcuts.register({
      id: searchShortcutId,
      group: 'Navigation',
      label: 'Menu search',
      defaultShortcut: defaultSearchShortcut,
      enabled: () => enabled,
      handler: focus,
    });
    const unsubscribeShortcut = shortcuts.subscribe(syncShortcut);
    if (shortcut !== undefined) setShortcut(shortcut);
    syncShortcut();
    listen(window, 'resize', position);
    listen(window, 'scroll', position);
    setQuery('');
    setEnabled(enabled);

    return {
      element: section,
      input,
      results,
      syncLayout,
      setEnabled,
      setQuery,
      setShortcut,
      focus,
      shortcuts,
      shortcutId: searchShortcutId,
      get shortcut() {
        return shortcuts.get(searchShortcutId)?.shortcut ?? null;
      },
      get enabled() {
        return enabled;
      },
      destroy() {
        close();
        unsubscribeShortcut();
        unregisterShortcut();
        if (!sharedShortcuts) shortcuts.destroy();
        listeners.forEach((remove) => remove());
        searchField.destroy();
        section.remove();
      },
    };
  }

  function mount(root, options = {}) {
    if (!root) throw new TypeError('Navigation requires a root element');
    const document = root.ownerDocument,
      window = document.defaultView || global;
    const viewport = options.viewport || root.parentElement;
    const uiIcon = options.renderIcon || (() => ''),
      storage = options.storage || {
        getItem() {
          return null;
        },
        setItem() {},
      };
    const storageKey = options.storageKey || 'navigation';
    const status = options.statusElement || { textContent: '' };
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
    const sidebarToggle = document.getElementById('menu-sidebar-toggle');
    const sidebarGroups = Array.from(document.querySelectorAll('#menu-live [data-menu-group]'));
    const expandedMenuGroups = Object.fromEntries(
      sidebarGroups.map((button) => [button.dataset.menuGroup, false]),
    );
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
      const value = Boolean(collapsed);
      const wasCollapsed = root.dataset.sidebarCollapsed === 'true';
      const visibleFlyout = openSidebarFlyout;
      clearFoldAnimations();
      if (!value && visibleFlyout) expandedMenuGroups[visibleFlyout] = true;
      openSidebarFlyout = null;
      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = options.foldDuration ?? 420;
      const fading =
        remember &&
        wasCollapsed !== value &&
        viewport.clientWidth > 620 &&
        !reduced &&
        typeof sidebarGroups[0]?.animate === 'function';
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
    sidebarGroups.forEach((button) => {
      listen(button, 'click', () => toggleSidebarGroup(button.dataset.menuGroup));
      listen(button, 'keydown', (event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          if (button.getAttribute('aria-expanded') !== 'true')
            toggleSidebarGroup(button.dataset.menuGroup);
          document
            .getElementById(button.getAttribute('aria-controls'))
            .querySelector('button')
            .focus();
        } else if (event.key === 'ArrowLeft' && button.getAttribute('aria-expanded') === 'true') {
          event.preventDefault();
          toggleSidebarGroup(button.dataset.menuGroup);
        }
      });
    });
    listen(sidebarToggle, 'click', () =>
      setSidebarCollapsed(document.getElementById('menu-live').dataset.sidebarCollapsed !== 'true'),
    );

    root
      .querySelectorAll('[data-menu-page]')
      .forEach((button) =>
        listen(button, 'click', () => options.onNavigate?.(button.dataset.menuPage)),
      );
    listen(document.getElementById('menu-live-nav'), 'keydown', (event) => {
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
      toggleSidebar() {
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
              Boolean(panel?.querySelector('[data-menu-page="' + page + '"]')),
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
        function isMobileWorkspace() {
          return viewport.clientWidth <= 620;
        }
        function setMobileWorkspaceMenu(open, restoreFocus = false) {
          const mobile = isMobileWorkspace(),
            value = mobile && Boolean(open);
          mobileWorkspace.dataset.mobileMenuOpen = String(value);
          mobileWorkspaceToggle.setAttribute('aria-expanded', String(value));
          mobileWorkspaceToggle.setAttribute(
            'aria-label',
            value ? 'Close navigation' : 'Open navigation',
          );
          mobileWorkspaceToggle.innerHTML = uiIcon(value ? 'x' : 'menu');
          mobileWorkspaceNav.inert = mobile && !value;
          mobileWorkspace.style.setProperty(
            '--mobile-nav-top',
            mobileWorkspace.querySelector('.menu-live-header').offsetHeight + 'px',
          );
          if (mobile)
            status.textContent = value
              ? 'Mobile navigation · choose a page or expand a group'
              : 'Mobile navigation · open the menu in the top-left corner';
          if (restoreFocus && mobile) mobileWorkspaceToggle.focus({ preventScroll: true });
        }
        listen(mobileWorkspaceToggle, 'click', () =>
          setMobileWorkspaceMenu(mobileWorkspace.dataset.mobileMenuOpen !== 'true'),
        );
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
              } else if (mobile)
                mobileWorkspace.style.setProperty(
                  '--mobile-nav-top',
                  mobileWorkspace.querySelector('.menu-live-header').offsetHeight + 'px',
                );
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
        destroyed = true;
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
      },
    };
    searchController = createMenuSearch(root, {
      enabled: options.searchEnabled !== false,
      shortcut: options.searchShortcut,
      shortcuts: options.shortcuts,
      isCompact: () => viewport.clientWidth > 620 && root.dataset.sidebarCollapsed === 'true',
      renderIcon: uiIcon,
      onNavigate(page) {
        options.onNavigate?.(page);
        if (api.mobile?.isMobile()) api.mobile.setOpen(false, true);
      },
      onReveal() {
        if (api.mobile?.isMobile()) api.mobile.setOpen(true);
      },
    });
    api.search = searchController;
    api.slots.search = searchController.element;
    api.setSearchEnabled = (value) => searchController.setEnabled(value);
    api.setSearchShortcut = (value) => searchController.setShortcut(value);
    api.focusSearch = () => searchController.focus();
    const shortcuts = searchController.shortcuts;
    const unregisterSidebarShortcut = shortcuts.register({
      id: sidebarShortcutId,
      group: 'Navigation',
      label: 'Toggle sidebar',
      defaultShortcut: defaultSidebarShortcut,
      enabled: () => viewport.clientWidth > 620 || Boolean(api.mobile),
      handler(event) {
        // Holding the keys must not repeatedly collapse and expand the menu.
        return event.repeat ? true : api.toggleSidebar();
      },
    });
    function syncSidebarShortcut() {
      const value = Shortcuts.aria(shortcuts.get(sidebarShortcutId)?.shortcut);
      for (const control of [sidebarToggle, api.mobile?.toggle].filter(Boolean)) {
        if (value) control.setAttribute('aria-keyshortcuts', value);
        else control.removeAttribute('aria-keyshortcuts');
      }
    }
    const unsubscribeSidebarShortcut = shortcuts.subscribe(syncSidebarShortcut);
    if (options.sidebarShortcut !== undefined)
      shortcuts.set(sidebarShortcutId, options.sidebarShortcut);
    syncSidebarShortcut();
    api.setSidebarShortcut = (value) => shortcuts.set(sidebarShortcutId, value);
    disposeSidebarShortcut = () => {
      unsubscribeSidebarShortcut();
      unregisterSidebarShortcut();
      for (const control of [sidebarToggle, api.mobile?.toggle].filter(Boolean)) {
        control.removeAttribute('aria-keyshortcuts');
      }
    };
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
