const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { buildExport } = require('../scripts/export.cjs');
let directory, server, url;

test.beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-navigation-'));
  await buildExport({ outdir: directory, components: ['navigation', 'shortcuts'] });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/content-fragment') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<p id="loaded-navigation-content">Loaded through HTMX</p>');
      return;
    }
    if (pathname === '/navigation-fragment') {
      res.setHeader('Content-Type', 'text/html');
      res.end(fs.readFileSync(path.join(directory, 'components/navigation.html')));
      return;
    }
    const source = pathname.startsWith('/source/');
    const base = source ? path.resolve(__dirname, '../..') : directory;
    const file = path.resolve(base, (source ? pathname.slice(8) : pathname.slice(1)) || 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

test('HTML and JS configure the same Navigation features without workspace code', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const root = page.locator('#menu-live');
  await expect(root.locator('.menu-sidebar-edge-toggle')).toHaveCount(1);
  await expect(root.locator('.menu-scroll-region')).toHaveCount(2);
  await page.locator('#menu-sidebar-toggle').click();
  await expect(root).toHaveAttribute('data-sidebar-collapsed', 'true');
  await page.evaluate(() => {
    const root = document.querySelector('#menu-live');
    root.dataset.collapse = 'false';
    root.dataset.search = 'false';
  });
  await expect(root).toHaveAttribute('data-sidebar-collapsed', 'false');
  await expect(page.locator('#menu-sidebar-toggle')).toBeHidden();
  await expect(root.locator('.menu-sidebar-edge-toggle')).toBeHidden();
  await expect(root.locator('.menu-search-section')).toBeHidden();
  expect(await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#menu-live'));
    return [view.toggleSidebar(), view.focusSearch()];
  })).toEqual([false, false]);
  await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#menu-live'));
    view.setCollapse(true); view.setSearch(true);
  });
  await expect(root).toHaveAttribute('data-collapse', 'true');
  await expect(root).toHaveAttribute('data-search', 'true');
  await expect(root.locator('.menu-search-section')).toBeVisible();
  await root.locator('.menu-sidebar-edge-toggle').click();
  await expect(root).toHaveAttribute('data-sidebar-collapsed', 'true');
  expect(errors).toEqual([]);
});

test('data-rendered menu preserves native links, callbacks, text and search activation', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    window.calls = 0;
    const view = Templify.get(document.querySelector('#menu-live'));
    view.setItems([
      { id: 'home', label: '<b>Home</b>', icon: 'home', href: '#native-destination' },
      { id: 'projects', label: 'Projects', icon: 'folder', children: [
        { id: 'create', label: 'Create project', icon: 'plus', onClick: () => { window.calls++; } },
        { id: 'external', label: 'New tab', href: '#new-tab', target: '_blank' },
      ] },
    ]);
  });
  const link = page.locator('[data-menu-page="home"]');
  await expect(link).toHaveText('<b>Home</b>');
  await expect(link.locator('b')).toHaveCount(0);
  await expect(link).toHaveAttribute('href', '#native-destination');
  expect(await link.evaluate(node => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    node.dispatchEvent(event); return event.defaultPrevented;
  })).toBe(false);
  await link.click();
  await expect(page).toHaveURL(/#native-destination$/);
  await page.locator('[data-menu-group="projects"]').click();
  await page.locator('[data-menu-page="create"]').click();
  expect(await page.evaluate(() => window.calls)).toBe(1);
  await page.locator('#menu-search-panel input').fill('Create project');
  await page.locator('.menu-search-result').click();
  expect(await page.evaluate(() => window.calls)).toBe(2);
  await page.locator('#menu-search-panel input').fill('New tab');
  const popup = page.waitForEvent('popup');
  await page.locator('.menu-search-result').click();
  const tab = await popup;
  await expect(tab).toHaveURL(/#new-tab$/);
  await tab.close();
  await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#menu-live'));
    view.setItems([{ id: 'last', label: 'Last', onClick: () => { window.calls++; } }]);
    view.setItems([{ id: 'last', label: 'Last', onClick: () => { window.calls++; } }]);
  });
  await page.locator('[data-menu-page="last"]').click();
  expect(await page.evaluate(() => window.calls)).toBe(3);
  await expect(page.locator('[data-menu-page]')).toHaveCount(1);
});

test('Shortcuts editor and Navigation share defaults, user overrides and feature availability', async ({ page }) => {
  await page.goto(url);
  const input = page.locator('#example-shortcuts input[aria-label="Navigation · Menu search"]');
  await expect(input).toHaveValue('⌘ / Ctrl + F');
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.searchShortcut = 'Mod+K'; });
  await expect(input).toHaveValue('⌘ / Ctrl + K');
  await input.press('Control+Shift+J');
  await expect(input).toHaveValue('⌘ / Ctrl + Shift + J');
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.searchShortcut = 'Mod+L'; });
  await expect(input).toHaveValue('⌘ / Ctrl + Shift + J');
  await page.locator('h1').click();
  await page.keyboard.press('Control+Shift+J');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.search = 'false'; });
  await expect(page.locator('.menu-search-section')).toBeHidden();
  expect(await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(event); return event.defaultPrevented;
  })).toBe(false);
  await input.locator('..').locator('..').getByRole('button', { name: 'Reset' }).click();
  await expect(input).toHaveValue('⌘ / Ctrl + L');
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.search = 'true'; });
  await page.locator('h1').click();
  await page.keyboard.press('Control+L');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();
});

test('HTML destinations added after mount retain their HTMX action when activated through search', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('/content-fragment')) requests.push(request); });
  await page.goto(url);
  await page.evaluate(() => {
    const items = document.querySelector('.workspace-nav-items');
    items.insertAdjacentHTML('beforeend', '<div class="menu-section"><button type="button" class="menu-nav-action menu-nav-parent" data-menu-group="server" aria-controls="submenu-server" aria-label="Server" aria-expanded="false">Server</button><div id="submenu-server" class="menu-submenu" hidden><a class="menu-sub-action" data-menu-page="server-page" href="/content-fragment" hx-get="/content-fragment" hx-target=".menu-live-content">Server page</a></div></div>');
    htmx.process(items);
  });
  await page.locator('[data-menu-group="server"]').click();
  await expect(page.locator('#submenu-server')).toBeVisible();
  await page.locator('[data-menu-group="server"]').click();
  await page.locator('#menu-search-panel input').fill('Server page');
  await page.locator('.menu-search-result').click();
  await expect(page.locator('#loaded-navigation-content')).toHaveText('Loaded through HTMX');
  expect(requests).toHaveLength(1);
  await expect(page).toHaveURL(url + '/');
  expect(errors).toEqual([]);
});

test('HTMX replaces Navigation cleanly while the shared Shortcuts catalogue survives', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => Templify.get(document.querySelector('[data-ui="shortcuts"]')).set('navigation.search', 'Mod+K'));
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => htmx.ajax('GET', '/navigation-fragment', { target: '#example-navigation', swap: 'innerHTML' }));
    await expect(page.locator('.menu-sidebar-edge-toggle')).toHaveCount(1);
    await expect(page.locator('.menu-scroll-region')).toHaveCount(2);
    await expect(page.locator('#example-shortcuts [data-shortcut-id="navigation.search"]')).toHaveCount(1);
    await expect(page.locator('#menu-search-panel input')).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    await page.locator('#menu-sidebar-toggle').click();
    await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  }
  await page.evaluate(() => {
    const editor = document.querySelector('[data-ui="shortcuts"]');
    Templify.destroy(editor); editor.remove();
  });
  await page.locator('h1').click();
  await page.keyboard.press('Control+K');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();
  expect(errors).toEqual([]);
});

test('an editor rendered before Navigation adopts component action rows without registering duplicates', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => {
    const navigation = document.querySelector('#example-navigation');
    const editorSection = document.querySelector('#example-shortcuts');
    const editor = editorSection.querySelector('[data-ui="shortcuts"]');
    Templify.destroy(document.querySelector('#menu-live'));
    Templify.destroy(editor);
    editor.insertAdjacentHTML('beforeend', '<div data-shortcut-id="navigation.search"><label>Menu search<input readonly aria-label="Menu search"></label><button type="button">Reset</button></div>');
    navigation.before(editorSection);
    Templify.init(document);
  });
  await expect(page.locator('#example-shortcuts [data-shortcut-id="navigation.search"]')).toHaveCount(1);
  await expect(page.locator('#example-shortcuts [data-shortcut-id="navigation.search"] input')).toHaveValue('⌘ / Ctrl + F');
  await page.locator('h1').click();
  await page.keyboard.press('Control+F');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();
  expect(errors).toEqual([]);
});

test('mobile remains usable when collapse is disabled and reinitialisation does not nest helpers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.collapse = 'false'; });
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-menu-open', 'true');
  await expect(page.locator('.workspace-hamburger')).toBeHidden();
  await expect(page.locator('#menu-live-nav')).toHaveJSProperty('inert', false);
  await page.evaluate(() => {
    const root = document.querySelector('#menu-live');
    for (let i = 0; i < 3; i++) { Templify.destroy(root); Templify.init(root); }
  });
  await expect(page.locator('.menu-scroll-region')).toHaveCount(2);
  await expect(page.locator('.workspace-hamburger')).toHaveCount(1);
  await expect(page.locator('.menu-sidebar-edge-toggle')).toHaveCount(1);
  await page.evaluate(() => Templify.get(document.querySelector('#menu-live')).setCollapse(true));
  await expect(page.locator('.workspace-hamburger')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-menu-open', 'false');
});

test('standalone example runs without workspace and exposes the same menu actions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/source/ui/components/navigation/example.html');
  await page.locator('[data-menu-group="projects"]').click();
  await page.locator('[data-menu-page="new-project"]').click();
  await expect(page.locator('#action-status')).toHaveText('New project action executed.');
  await page.locator('#allow-search').uncheck();
  await expect(page.locator('.menu-search-section')).toBeHidden();
  await page.locator('#allow-collapse').uncheck();
  await expect(page.locator('#menu-sidebar-toggle')).toBeHidden();
  expect(errors).toEqual([]);
});

test('workspace keeps one icon axis and component-owned collapse controls across viewport changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/source/index.html');
  const icon = page.locator('[data-menu-page="dashboard"] .menu-nav-icon');
  const expandedIcon = await icon.boundingBox();
  const expandedNav = await page.locator('#menu-live-nav').boundingBox();
  await page.locator('.menu-sidebar-edge-toggle').click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  const collapsedIcon = await icon.boundingBox();
  const collapsedNav = await page.locator('#menu-live-nav').boundingBox();
  expect(collapsedNav.width).toBeLessThan(expandedNav.width);
  expect(Math.abs(collapsedIcon.x - expandedIcon.x)).toBeLessThanOrEqual(1);
  const utility = await page.locator('.menu-utility[aria-label="Desktop"] .ui-icon').boundingBox();
  expect(Math.abs(utility.x - collapsedIcon.x)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.locator('#menu-live-nav')).toHaveJSProperty('inert', false);
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(page.locator('.menu-sidebar-edge-toggle')).toHaveCount(1);
  await page.locator('#menu-sidebar-toggle').click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'false');
});

for (const [name, pathname] of [
  ['export', '/'],
  ['standalone example', '/source/ui/components/navigation/example.html'],
]) {
  test(`Navigation typography is uniform for links, buttons, submenus and selection in ${name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url + pathname);
    await page.evaluate(() => {
      const root = document.querySelector('#menu-live');
      const view = window.Templify?.get(root) || DesignSystemNavigation.mount(root);
      view.setItems([
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#dashboard' },
        { id: 'projects', label: 'Projects', icon: 'folder', children: [
          { id: 'all-projects', label: 'All projects', icon: 'list', href: '#projects' },
          { id: 'new-project', label: 'New project', icon: 'plus', onClick() {} },
        ] },
      ]);
    });
    const typography = () => page.evaluate(() => {
      const root = document.querySelector('#menu-live');
      const family = getComputedStyle(root).fontFamily;
      return Array.from(root.querySelectorAll('.menu-nav-action,.menu-sub-action,.menu-nav-label,.menu-sub-label')).map(node => {
        const style = getComputedStyle(node);
        return { family: style.fontFamily === family, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
      });
    });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      if (width <= 620) await expect(page.locator('#menu-live-nav')).toHaveJSProperty('inert', true);
      await page.evaluate(() => {
        const root = document.querySelector('#menu-live');
        const view = window.Templify?.get(root) || DesignSystemNavigation.mount(root);
        view.mobile.setOpen(true);
        if (root.querySelector('[data-menu-group="projects"]').getAttribute('aria-expanded') !== 'true') view.toggleGroup('projects');
        view.select('new-project');
        view.mobile.setOpen(true);
      });
      await page.locator('[data-menu-page="new-project"]').hover();
      const styles = await typography();
      expect(styles.length).toBe(8);
      expect(styles).toEqual(styles.map(() => ({ family: true, size: '13px', weight: '400', lineHeight: '18.2px' })));
    }
    await page.evaluate(() => document.querySelector('#menu-live').style.setProperty('--ds-font-family', 'Georgia, serif'));
    expect((await typography()).every(style => style.family)).toBe(true);
  });
}

for (const [preset, profile] of [['default', 'medium'], ['soft', 'soft']]) {
  test(`Navigation ${preset} shadows follow live Themes profiles without remounting`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await page.evaluate(preset => {
      const root = document.querySelector('#menu-live');
      if (preset === 'soft') root.dataset.popupPattern = 'soft';
      const view = Templify.get(root);
      window.shadowNavigation = { root, view, submenu: root.querySelector('#submenu-projects'), search: root.querySelector('#menu-search-panel') };
      view.setCollapsed(true);
      view.toggleGroup('projects');
      view.focusSearch();
    }, preset);
    const submenu = page.locator('#submenu-projects'), search = page.locator('#menu-search-panel');
    const expectProfile = async (element, name) => {
      const expected = await page.evaluate(name => {
        const probe = document.createElement('div');
        probe.style.boxShadow = `var(--ds-shadow-${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).boxShadow;
        probe.remove();
        return value;
      }, name);
      await expect(element).toBeVisible();
      await expect(element).toHaveCSS('box-shadow', expected);
      return expected;
    };
    // Exported Navigation follows the foundation even without the optional Themes runtime.
    await expectProfile(submenu, profile);
    await expectProfile(search, profile);

    for (const file of ['themes/tokens/tokens.js', 'themes/tokens/defaults.js', 'colours/colour-system.js', 'colours/colour-roles.js', 'shadows/shadows.js', 'corners/corners.js', 'themes/themes.js']) {
      await page.addScriptTag({ url: url + '/source/ui/' + file });
    }
    await page.evaluate(profile => {
      const themes = DesignSystemThemes.create({ target: document.documentElement });
      const custom = themes.add('Navigation shadow test', 'dark');
      themes.setShadow('light', profile, { x: 2, y: 5, blur: 11, spread: 1, opacity: 22 });
      themes.setShadow(custom, profile, { x: 7, y: 17, blur: 41, spread: 2, opacity: 65 });
      window.navigationShadowThemes = { themes, custom };
    }, profile);
    for (const id of ['light', 'dark', 'matrix', 'custom']) {
      await page.evaluate(id => {
        const { themes, custom } = window.navigationShadowThemes;
        themes.select(id === 'custom' ? custom : id);
      }, id);
      await expectProfile(submenu, profile);
      await expectProfile(search, profile);
    }
    const before = await expectProfile(search, profile);
    await page.evaluate(profile => {
      const { themes, custom } = window.navigationShadowThemes;
      themes.setShadow(custom, profile, { blur: 63 });
    }, profile);
    const after = await expectProfile(search, profile);
    expect(after).not.toBe(before);
    await expectProfile(submenu, profile);
    await page.evaluate(profile => {
      const { themes, custom } = window.navigationShadowThemes;
      themes.setShadow(custom, profile, { opacity: 0 });
    }, profile);
    await expect(submenu).toHaveCSS('box-shadow', 'none');
    await expect(search).toHaveCSS('box-shadow', 'none');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#menu-live-nav')).toHaveJSProperty('inert', true);
    await page.evaluate(() => {
      const { themes } = window.navigationShadowThemes;
      themes.select('dark');
      themes.setShadow('dark', 'medium', { y: 13, blur: 74, opacity: 42 });
      window.shadowNavigation.view.mobile.setOpen(true);
      window.shadowNavigation.view.toggleGroup('projects');
    });
    await expectProfile(page.locator('#menu-live-nav'), 'medium');
    await expect(submenu).toBeVisible();
    await expect(submenu).toHaveCSS('box-shadow', 'none');
    expect(await page.evaluate(() => {
      const { root, view, submenu, search } = window.shadowNavigation;
      return root === document.querySelector('#menu-live') && view === Templify.get(root)
        && submenu === root.querySelector('#submenu-projects') && search === root.querySelector('#menu-search-panel');
    })).toBe(true);
  });
}
