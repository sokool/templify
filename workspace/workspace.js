/* Composition root: example data, routing and slots, never component implementation. */
(function () {
  'use strict';
  const root = document.getElementById('menu-live');
  const viewport = document.getElementById('example-viewport');
  const prefix = 'design-system-examples';
  const deviceListeners = new Set();
  let browserStorage;
  try {
    browserStorage = window.localStorage;
  } catch {}
  const persistence = ExampleSettings.create({ storage: browserStorage });
  const settings = persistence.settings,
    storage = persistence.storage;
  const windows = ExampleWindows.create({ settings });
  const saved = (key, fallback) => {
    try {
      return storage.getItem(prefix + '-' + key) || fallback;
    } catch {
      return fallback;
    }
  };
  const themes = DesignSystemThemes.create({
    target: document.documentElement,
    settings,
    initialTheme: saved('theme', 'light'),
  });
  const tooltip = DesignSystemTooltip.mount(document);
  const componentExamples = ExampleComponents.create({
    document,
    storage,
    icons: DesignSystemIcons,
    tooltip,
    themes,
    settings,
  });
  const fonts = ExampleFonts.create({ document, storage, storageKey: prefix + '-font' });
  settings.batch(() => {
    settings.scope('layout.fonts').defaults({ family: fonts.value });
    settings.scope('layout.navigation').defaults({
      collapsed: false,
      groups: { theme: false, components: false, tools: false },
      foldDuration: 700,
    });
    settings.scope('components.breadcrumbs').defaults(DesignSystemBreadcrumbs.defaults);
    settings.scope('components.surface').defaults(DesignSystemSurface.defaults);
    settings.scope('components.tooltip').defaults(DesignSystemTooltip.defaults);
    settings.scope('components.window').defaults({ lockScroll: true, resizable: true });
    settings.scope('components.list').defaults(DesignSystemList.defaults);
    settings.scope('components.autocomplete').defaults({ size: 'small', multiple: true });
  });
  const iconAliases = {
    dashboard: 'layout-dashboard',
    components: 'component',
    navigation: 'layout-panel-left',
    breadcrumbs: 'chevrons-right',
    fonts: 'type',
    desktop: 'monitor',
    tablet: 'tablet',
    mobile: 'smartphone',
    theme: 'moon',
    icons: 'shapes',
    palette: 'palette',
    tools: 'wrench',
  };
  const icon = (name) => DesignSystemIcons.svg(iconAliases[name] || name);
  // This registry is the only place to add pages when composing further modules.
  const routes = {
    settings: {
      label: 'Settings',
      anchor: 'topschrank.settings',
      path: ['settings'],
      render: renderSettingsPage,
    },
    dashboard: {
      label: 'Dashboard',
      anchor: 'topschrank.dashboard',
      path: ['dashboard'],
      render: renderDashboard,
    },
    icons: {
      label: 'Icons and glyphs',
      anchor: 'topschrank.iconsandglyphs',
      path: ['theme', 'icons'],
      render: renderIconsPage,
    },
    palette: {
      label: 'Colours',
      anchor: 'topschrank.palette',
      path: ['theme', 'palette'],
      render: renderPalettePage,
    },
    theme: {
      label: 'Theme',
      anchor: 'templify.theme',
      path: ['theme'],
      render: renderThemeIndex,
    },
    tools: {
      label: 'Tools',
      anchor: 'topschrank.tools',
      path: ['tools'],
      render: renderToolsIndex,
    },
    'contrast-checker': {
      label: 'Contrast checker',
      anchor: 'topschrank.tools.contrastchecker',
      path: ['tools', 'contrastchecker'],
      render: (page) => renderTool(page, 'contrast-checker'),
    },
    'palette-picker': {
      label: 'Palette picker',
      anchor: 'topschrank.tools.palettepicker',
      path: ['tools', 'palettepicker'],
      render: (page) => renderTool(page, 'palette-picker'),
    },
    export: {
      label: 'Export',
      anchor: 'topschrank.tools.export',
      path: ['tools', 'export'],
      render: (page) => renderTool(page, 'export'),
    },
    shadows: {
      label: 'Shadows',
      anchor: 'topschrank.tools.shadows',
      path: ['theme', 'shadows'],
      render: (page) => renderTool(page, 'shadows'),
    },
    fonts: { label: 'Typography', anchor: 'topschrank.fonts', path: ['theme', 'fonts'], render: renderFontsPage },
    ...Object.fromEntries(
      [
        ['accordion', 'Accordion'],
        ['notifications', 'Notifications'],
        ['user-identity', 'User identity'],
        ['surface', 'Surface'],
        ['tooltip', 'Tooltip'],
        ['buttons', 'Buttons'],
        ['badges', 'Badges'],
      ].map(([id, label]) => [
        id,
        {
          label,
          anchor: 'topschrank.components.' + id.replaceAll('-', ''),
          path: ['components', id.replaceAll('-', '')],
          render: (page) => contentComponents.push(componentExamples.mount(page, id)),
        },
      ]),
    ),
    'kanban-board': {
      label: 'Kanban board',
      anchor: 'topschrank.components.kanbanboard',
      path: ['components', 'kanbanboard'],
      render: (page) => renderKanban(page),
    },
    forms: {
      label: 'Form',
      anchor: 'topschrank.components.forms',
      path: ['components', 'forms'],
      render: (page) => contentComponents.push(ExampleForm.mount(page, { document })),
    },
    ...Object.fromEntries(
      [
        ['progress', 'Progress'],
        ['timeline', 'Timeline'],
        ['process-steps', 'Process steps'],
        ['counts-and-summaries', 'Counts and summaries'],
        ['window', 'Window'],
      ].map(([id, label]) => [
        id,
        {
          label,
          anchor: 'topschrank.components.' + id.replaceAll('-', ''),
          path: ['components', id.replaceAll('-', '')],
          render: (page) =>
            contentComponents.push(
              ExampleExtendedComponents.mount(page, id, {
                settings: settings.scope('components.' + id),
                themes,
                windows,
              }),
            ),
        },
      ]),
    ),
    autocomplete: {
      label: 'Autocomplete',
      anchor: 'topschrank.components.autocomplete',
      path: ['components', 'autocomplete'],
      render: (page) =>
        contentComponents.push(
          ExampleAutocomplete.mount(page, { settings: settings.scope('components.autocomplete') }),
        ),
    },
    list: {
      label: 'List',
      anchor: 'topschrank.components.list',
      path: ['components', 'list'],
      render: (page) =>
        contentComponents.push(
          ExampleList.mount(page, {
            settings: settings.scope('components.list'),
            getDevice: () => viewport.dataset.device,
            subscribeDevice(listener) {
              deviceListeners.add(listener);
              return () => deviceListeners.delete(listener);
            },
          }),
        ),
    },
    card: {
      label: 'Card',
      anchor: 'topschrank.components.card',
      path: ['components', 'card'],
      render: (page) => renderKanban(page, true),
    },
    components: {
      label: 'Components',
      anchor: 'topschrank.components',
      path: ['components'],
      render: renderDashboard,
    },
    navigation: {
      label: 'Navigation',
      anchor: 'topschrank.components.navigation',
      path: ['components', 'navigation'],
      render: renderNavigationPage,
    },
    shortcuts: {
      label: 'Shortcuts',
      anchor: 'topschrank.components.shortcuts',
      path: ['components', 'shortcuts'],
      render: (page) => {
        const description = document.createElement('p');
        description.className = 'example-lead';
        description.textContent =
          'One shared catalogue. Record a shortcut or reset it to its default.';
        const controls = document.createElement('div');
        page.append(description, controls);
        contentComponents.push(DesignSystemShortcuts.mount(controls, { shortcuts }));
      },
    },
    breadcrumbs: {
      label: 'Breadcrumbs',
      anchor: 'topschrank.components.breadcrumbs',
      path: ['components', 'breadcrumbs'],
      render: renderBreadcrumbPage,
    },
  };
  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    {
      id: 'theme',
      label: 'Theme',
      icon: 'palette',
      children: [
        { id: 'palette', label: 'Colours' },
        { id: 'fonts', label: 'Typography' },
        { id: 'icons', label: 'Icons and Glyphs' },
        { id: 'shadows', label: 'Shadows' },
      ],
    },
    {
      id: 'components',
      label: 'Components',
      icon: 'components',
      children: [
        { id: 'navigation', label: 'Navigation' },
        { id: 'shortcuts', label: 'Shortcuts' },
        { id: 'breadcrumbs', label: 'Breadcrumbs' },
        { id: 'kanban-board', label: 'Kanban board' },
        { id: 'card', label: 'Card' },
        { id: 'accordion', label: 'Accordion' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'user-identity', label: 'User identity' },
        { id: 'surface', label: 'Surface' },
        { id: 'tooltip', label: 'Tooltip' },
        { id: 'buttons', label: 'Buttons' },
        { id: 'badges', label: 'Badges' },
        { id: 'forms', label: 'Form' },
        { id: 'list', label: 'List' },
        { id: 'autocomplete', label: 'Autocomplete' },
        { id: 'progress', label: 'Progress' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'process-steps', label: 'Process steps' },
        { id: 'counts-and-summaries', label: 'Counts and summaries' },
        { id: 'window', label: 'Window' },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: 'tools',
      children: [
        { id: 'contrast-checker', label: 'Contrast checker' },
        { id: 'palette-picker', label: 'Palette picker' },
        { id: 'export', label: 'Export' },
      ],
    },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  navigation
    .find((entry) => entry.id === 'components')
    .children.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
  const releaseVersion = 'v0.1.4';
  DesignSystemNavigation.renderStructure(root, {
    user: { initials: releaseVersion, label: 'Templify ' + releaseVersion },
  });
  const submenuIcons = {
    palette: 'palette',
    fonts: 'type',
    icons: 'shapes',
    accordion: 'panel-bottom-open',
    autocomplete: 'search',
    badges: 'tag',
    breadcrumbs: 'chevrons-right',
    buttons: 'toggle-right',
    card: 'panel-top',
    'counts-and-summaries': 'chart-no-axes-combined',
    forms: 'clipboard-list',
    'kanban-board': 'columns-3',
    list: 'table-2',
    navigation: 'layout-panel-left',
    shortcuts: 'keyboard',
    notifications: 'bell',
    'process-steps': 'workflow',
    progress: 'loader-circle',
    surface: 'layers',
    timeline: 'list-ordered',
    tooltip: 'info',
    'user-identity': 'contact',
    window: 'panels-top-left',
    'palette-picker': 'palette',
    shadows: 'layers',
    'contrast-checker': 'contrast',
    export: 'download',
  };
  DesignSystemNavigation.renderNavigation(root, navigation, { renderIcon: icon, submenuIcons });
  const shortcuts = DesignSystemShortcuts.create({ document });
  const shell = DesignSystemNavigation.mount(root, {
    shortcuts,
    viewport,
    renderIcon: icon,
    storage,
    storageKey: prefix,
    foldDuration: settings.get('layout.navigation.foldDuration', 700),
    onNavigate: navigate,
  });
  ExampleShortcuts.connect({ themes, shortcuts });
  root.dataset.popupPattern = 'soft';
  const utilities = document.createElement('div');
  utilities.className = 'menu-utilities';
  shell.sidebarToggle.before(utilities);
  const deviceButtons = ['desktop', 'tablet', 'mobile'].map((device) =>
    utility(device, device[0].toUpperCase() + device.slice(1), () => setDevice(device)),
  );
  const themeButton = utility('theme', 'Change theme', () => {
    themes.next();
  });
  function utility(glyph, label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-utility';
    button.setAttribute('aria-label', label);
    button.innerHTML = icon(glyph);
    const text = document.createElement('span');
    text.className = 'menu-utility-label';
    text.textContent = label;
    button.append(text);
    button.addEventListener('click', action);
    utilities.append(button);
    return button;
  }
  function setDevice(device) {
    viewport.dataset.device = device;
    deviceListeners.forEach((listener) => listener(device));
    deviceButtons.forEach((button, i) =>
      button.setAttribute('aria-pressed', String(['desktop', 'tablet', 'mobile'][i] === device)),
    );
    try {
      storage.setItem(prefix + '-device', device);
    } catch {}
  }
  function setTheme(theme) {
    themes.select(theme);
  }
  function syncThemeControl(state) {
    const modes = state.themes;
    const glyphs = { light: 'sun', dark: 'moon', matrix: 'square-terminal' };
    const name = modes.find((entry) => entry.id === state.theme).label;
    const next = modes[(modes.findIndex((entry) => entry.id === state.theme) + 1) % modes.length];
    const label =
      'Theme: ' + name + (modes.length > 1 ? '. Switch to ' + next.label : '. No other themes');
    themeButton.disabled = modes.length < 2;
    themeButton.querySelector('.ui-icon').outerHTML = DesignSystemIcons.svg(
      glyphs[next.id] || 'palette',
    );
    themeButton.querySelector('.menu-utility-label').textContent = next.label;
    themeButton.dataset.theme = state.theme;
    themeButton.setAttribute('aria-label', label);
  }
  themes.subscribe(syncThemeControl);
  syncThemeControl(themes.getState());
  setDevice(
    ['desktop', 'tablet', 'mobile'].includes(saved('device', 'desktop'))
      ? saved('device', 'desktop')
      : 'desktop',
  );

  const headerBreadcrumbs = DesignSystemBreadcrumbs.mount(shell.slots.breadcrumbs, {
    appearance: settings.scope('components.breadcrumbs').snapshot(),
    items: [],
    onNavigate: (item) => navigate(item.id),
  });
  let contentComponents = [];
  function pathFor(id) {
    const route = routes[id];
    return [
      {
        id: 'dashboard',
        label: 'Templify',
        emphasisLength: 0,
        href: '#' + routes.dashboard.anchor,
      },
      ...route.path.map((part, index) => {
        const target = index === route.path.length - 1 ? id : route.path[0];
        return { id: target, label: routes[target].label, href: '#' + routes[target].anchor };
      }),
    ];
  }
  function navigate(id, push = true) {
    if (!routes[id]) return;
    tooltip.hide(true);
    contentComponents.forEach((component) => component.destroy());
    contentComponents = [];
    shell.select(id);
    headerBreadcrumbs.update({ items: pathFor(id) });
    const page = document.createElement('main');
    page.className = 'example-page';
    page.id = routes[id].anchor;
    page.innerHTML = '<span class="example-kicker"></span><h1></h1>';
    const section = routes[id].path[0];
    page.querySelector('.example-kicker').textContent =
      section === 'theme' ? 'Theme' : section === 'tools' ? 'Tools' :
      section === 'components' ? 'Component workspace' : 'Templify';
    page.querySelector('h1').textContent = routes[id].label;
    routes[id].render(page);
    shell.slots.content.replaceChildren(page);
    if (push && location.hash !== '#' + routes[id].anchor)
      history.pushState(null, '', '#' + routes[id].anchor);
  }
  function renderKanban(page, standalone = false) {
    page.dataset.example = standalone ? 'card' : 'kanban';
    contentComponents.push(
      ExampleKanban.mount(page, {
        document,
        viewport,
        storage,
        icons: DesignSystemIcons,
        standalone,
        windows,
        getDevice: () => viewport.dataset.device,
        subscribeDevice(listener) {
          deviceListeners.add(listener);
          return () => deviceListeners.delete(listener);
        },
        viewportTop: () => shell.slots.header.getBoundingClientRect().bottom,
      }),
    );
  }
  function renderSettingsPage(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<h2>Exports</h2><p class="example-lead">One shared configuration for the template. Preview device and sample card placement stay outside the template export.</p>',
    );
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin:20px 0';
    page.append(actions);
    for (const [label, template] of [
      ['Download template JSON', true],
      ['Download workspace backup', false],
      ['Download DTCG tokens', 'tokens'],
      ['Download theme CSS', 'css'],
    ]) {
      contentComponents.push(
        DesignSystemButtons.mount(actions, {
          label,
          variant: 'secondary',
          onClick: () => {
            const data =
              template === 'tokens'
                ? themes.exportTokens()
                : template === 'css'
                  ? themes.exportCSS()
                  : settings.exportJSON({ template });
            const url = URL.createObjectURL(
              new Blob([data], {
                type:
                  template === 'css'
                    ? 'text/css'
                    : template === 'tokens'
                      ? 'application/design-tokens+json'
                      : 'application/json',
              }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download =
              template === 'tokens'
                ? 'palette.tokens.json'
                : template === 'css'
                  ? 'themes.css'
                  : template
                    ? 'design-system-template.json'
                    : 'design-system-workspace.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          },
        }),
      );
    }
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.json,.tokens,application/json,application/design-tokens+json';
    file.hidden = true;
    const importStatus = document.createElement('p');
    importStatus.className = 'example-status';
    importStatus.setAttribute('role', 'status');
    page.append(file, importStatus);
    let settingsPageAlive = true;
    contentComponents.push({
      destroy() {
        settingsPageAlive = false;
      },
    });
    contentComponents.push(
      DesignSystemButtons.mount(actions, {
        label: 'Import DTCG tokens',
        variant: 'secondary',
        onClick: () => file.click(),
      }),
    );
    file.addEventListener('change', async () => {
      const selected = file.files?.[0];
      if (!selected) return;
      try {
        if (selected.size > 1024 * 1024) throw new Error('Token file is too large (maximum 1 MB).');
        const text = await selected.text();
        if (!settingsPageAlive) return;
        themes.importTokens(JSON.parse(text));
        importStatus.textContent = 'DTCG tokens imported. Themes updated and saved.';
      } catch (error) {
        if (settingsPageAlive) importStatus.textContent = 'Import rejected: ' + error.message;
      } finally {
        file.value = '';
      }
    });
    const status = document.createElement('p'),
      preview = document.createElement('pre');
    preview.style.cssText =
      'max-height:55vh;overflow:auto;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere';
    page.append(status, preview);
    const refresh = () => {
      const state = settings.status;
      status.textContent = state.persistent
        ? 'Saved in localStorage · design-system-workspace'
        : 'Settings are held in memory' + (state.error ? ' · ' + state.error : '');
      preview.textContent = settings.exportJSON();
    };
    refresh();
    const unsubscribe = settings.subscribe(refresh);
    contentComponents.push({ destroy: unsubscribe });
  }
  function renderIconsPage(page) {
    const tool = document.createElement('div');
    page.append(tool);
    contentComponents.push(
      ExampleIcons.mount(tool, { icons: DesignSystemIcons, categories: ExampleIconCategories }),
    );
  }
  function renderPalettePage(page) {
    const tool = document.createElement('div');
    page.append(tool);
    contentComponents.push(PaletteTool.mount(tool, { themes, Window: windows.forWindow('palette.colour-picker') }));
  }
  function renderToolsIndex(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<p class="example-status">Design utilities and portable component exports.</p><nav class="example-tools-index" aria-label="Generic tools"><a class="example-link" href="#topschrank.tools.contrastchecker">Contrast checker →</a><a class="example-link" href="#topschrank.tools.palettepicker">Palette picker →</a><a class="example-link" href="#topschrank.tools.export">Export →</a></nav>',
    );
  }
  function renderThemeIndex(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<p class="example-lead">Configure the shared look and feel of your components.</p><nav class="example-tools-index" aria-label="Theme"><a class="example-link" href="#topschrank.palette">Colours →</a><a class="example-link" href="#topschrank.fonts">Typography →</a><a class="example-link" href="#topschrank.iconsandglyphs">Icons and Glyphs →</a><a class="example-link" href="#topschrank.tools.shadows">Shadows →</a></nav>',
    );
  }
  function renderTool(page, kind) {
    const host = document.createElement('div');
    page.append(host);
    contentComponents.push(ExampleTools.mount(host, { kind, themes }));
  }
  function renderFontsPage(page) {
    const tool = document.createElement('div');
    page.append(tool);
    contentComponents.push(fonts.mount(tool));
  }
  function renderDashboard(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<p class="example-lead">One page, independent modules. The menu, header and breadcrumbs share the current destination and adapt to the same viewport and theme.</p><div class="example-composition"><span>Navigation</span><span aria-hidden="true">+</span><span>Breadcrumbs</span><span aria-hidden="true">→</span><span>One workspace</span></div><div class="example-grid"><section class="example-card"><h2>Navigation</h2><p>Expand or collapse the sidebar. On mobile, open the hamburger menu. The same navigation owns the header and keeps utility controls available below.</p><a class="example-link" href="#topschrank.components.navigation">Explore the layout →</a></section><section class="example-card"><h2>Breadcrumbs</h2><p>Choose a menu item and follow the header path. Every segment is clickable, including the current page.</p><a class="example-link" href="#topschrank.components.breadcrumbs">Explore breadcrumbs →</a></section></div><p class="example-status">Use the controls at the bottom of the menu to compare desktop, tablet, mobile and Light / Dark / Matrix.</p>',
    );
  }
  function renderNavigationPage(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<p class="example-lead">The application frame around this page is the Navigation instance. Its header contains the Breadcrumbs module; its content and utility controls are supplied by this example.</p><div class="example-grid"><section class="example-card"><h2>Navigation → header</h2><p>Selecting Breadcrumbs updates the selected menu item, header path, URL and content together.</p><a class="example-link" href="#topschrank.components.breadcrumbs">Open Breadcrumbs →</a></section><section class="example-card"><h2>Responsive composition</h2><p>Change the device using the menu footer. Desktop and tablet retain sidebar controls; mobile uses a hamburger with inline submenus.</p></section></div>',
    );
    const preview = document.createElement('iframe');
    preview.className = 'example-navigation-preview';
    preview.title = 'Standalone Navigation with HTML configuration and shared Shortcuts';
    preview.src = './ui/components/navigation/example.html';
    page.append(preview);
  }
  function renderBreadcrumbPage(page) {
    page.insertAdjacentHTML(
      'beforeend',
      '<p class="example-lead">These paths and the header use the same Breadcrumbs module. Click a segment to navigate; the menu and header will follow.</p>',
    );
    const samples = document.createElement('div');
    samples.className = 'example-paths';
    ['dashboard', 'components', 'navigation', 'breadcrumbs'].forEach((id) => {
      const nav = document.createElement('nav');
      samples.append(nav);
      contentComponents.push(
        DesignSystemBreadcrumbs.mount(nav, {
          appearance: settings.scope('components.breadcrumbs').snapshot(),
          label: routes[id].label + ' example',
          items: pathFor(id),
          onNavigate: (item) => navigate(item.id),
        }),
      );
    });
    page.append(samples);
  }
  const defaultRoute = 'dashboard';
  function restoreRoute() {
    if (location.hash === '#topschrank.components.loadingstate')
      history.replaceState(null, '', '#topschrank.components.progress');
    const id = Object.keys(routes).find((id) => '#' + routes[id].anchor === location.hash);
    const destination = id || defaultRoute;
    if (!id) history.replaceState(null, '', '#' + routes[defaultRoute].anchor);
    navigate(destination, false);
  }
  window.addEventListener('hashchange', restoreRoute);
  window.addEventListener('popstate', restoreRoute);
  // Plain links in example content share the same route registry.
  shell.slots.content.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const id = Object.keys(routes).find(
      (id) => '#' + routes[id].anchor === link.getAttribute('href'),
    );
    if (id) {
      event.preventDefault();
      navigate(id);
    }
  });
  restoreRoute();
  requestAnimationFrame(() => requestAnimationFrame(() => (root.dataset.motionReady = 'true')));
  window.addEventListener('pagehide', () => shell.remember());
})();
