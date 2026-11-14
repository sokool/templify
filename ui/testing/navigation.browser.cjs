const { test, expect, chromium, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { buildExport } = require('../scripts/export.cjs');
let directory, server, url;
async function configureDock(page, position = 'left') {
  await page.evaluate(position => {
    const root = document.querySelector('#menu-live');
    const view = window.Templify?.get(root) || DesignSystemNavigation.mount(root);
    window.dockView = view;
    window.dockCalls = 0;
    window.dockAvailable = true;
    view.setPosition(position);
    view.setDock(true);
    window.removeDockAction = view.shortcuts.register({
      id: 'editor.save', label: 'Save document', icon: 'plus',
      description: 'Save from any action entry point',
      searchable: true, dock: { order: 10 }, defaultShortcut: 'Mod+S',
      enabled: () => window.dockAvailable,
      handler: () => { window.dockCalls++; return true; },
    });
  }, position);
  await expect(page.locator('.menu-dock')).toBeVisible();
}

for (const position of ['left', 'right', 'top', 'bottom']) {
  test(`dock and ${position} navigation reserve space, open inward and retain actions when folded`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await configureDock(page, position);
    const root = page.locator('#menu-live'), nav = root.locator('#menu-live-nav');
    for (const collapsed of [false, true]) {
      await page.evaluate(collapsed => window.dockView.setCollapsed(collapsed), collapsed);
      await expect.poll(async () => {
        const area = await root.locator('.menu-live-content').boundingBox();
        const dock = await root.locator('.menu-dock').boundingBox();
        return Math.round(Math.abs(dock.x - area.x) + Math.abs(dock.width - area.width));
      }).toBeLessThanOrEqual(1);
      const navBox = await nav.boundingBox(), dockBox = await root.locator('.menu-dock').boundingBox();
      if (position === 'left') expect(navBox.x + navBox.width).toBeLessThanOrEqual(dockBox.x + 1);
      if (position === 'right') expect(navBox.x).toBeGreaterThanOrEqual(dockBox.x + dockBox.width - 1);
      if (position === 'bottom') expect(navBox.y + navBox.height).toBeLessThanOrEqual(dockBox.y + 1);
      if (position === 'top') expect(navBox.y).toBeGreaterThanOrEqual(63);
      const group = page.locator('[data-menu-group="projects"]');
      if (await group.getAttribute('aria-expanded') !== 'true') await group.click();
      const panel = page.locator('#submenu-projects');
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox();
      if (collapsed || position === 'top' || position === 'bottom') {
        if (position === 'right') expect(box.x + box.width).toBeLessThanOrEqual(navBox.x + 1);
        if (position === 'left') expect(box.x).toBeGreaterThanOrEqual(navBox.x + navBox.width - 1);
        if (position === 'top') expect(box.y).toBeGreaterThanOrEqual(navBox.y + navBox.height - 1);
        if (position === 'bottom') expect(box.y + box.height).toBeLessThanOrEqual(navBox.y + 1);
      }
      await page.locator('[data-menu-page="all-projects"]').click();
      await root.locator('[data-dock-action="editor.save"]').click();
    }
    expect(await page.evaluate(() => window.dockCalls)).toBe(2);
    await page.evaluate(() => {
      document.querySelector('.menu-live-content').insertAdjacentHTML('beforeend', '<div style="height:1800px"></div><button id="last-content">Last content</button>');
    });
    await page.locator('#last-content').scrollIntoViewIfNeeded();
    const last = await page.locator('#last-content').boundingBox();
    const bottomSurface = await (position === 'bottom' ? nav : root.locator('.menu-dock')).boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(bottomSurface.y + 1);
    expect(errors).toEqual([]);
  });
}

test('dock shares command execution, availability and user bindings without duplicate Search results', async ({ page }) => {
  await page.goto(url);
  await configureDock(page);
  const button = page.locator('[data-dock-action="editor.save"]');
  await button.focus();
  await expect(page.locator('.menu-dock-tooltip')).toBeVisible();
  await expect(page.locator('.menu-dock-tooltip')).toHaveText('Save document');
  await button.press('Enter');
  expect(await page.evaluate(() => window.dockCalls)).toBe(1);
  await page.keyboard.press('Control+s');
  expect(await page.evaluate(() => window.dockCalls)).toBe(2);
  await page.evaluate(() => window.dockView.focusSearch());
  await page.locator('#menu-search-panel input').fill('Save document');
  await expect(page.locator('.ds-search-result')).toHaveCount(1);
  await page.locator('.ds-search-result').click();
  expect(await page.evaluate(() => window.dockCalls)).toBe(3);
  await page.evaluate(() => window.dockView.shortcuts.set('editor.save', null));
  await expect(button).not.toHaveAttribute('aria-keyshortcuts');
  await expect(button).toBeVisible();
  await page.evaluate(() => { window.dockAvailable = false; window.dockView.shortcuts.refresh('editor.save'); });
  await expect(button).toHaveCount(0);
  await expect(page.locator('.menu-dock')).toBeHidden();
  await expect.poll(() => page.locator('#menu-live').evaluate(root => getComputedStyle(root).paddingBottom)).toBe('0px');
  await page.evaluate(() => { window.dockAvailable = true; window.dockView.shortcuts.refresh('editor.save'); });
  await expect(button).toBeVisible();
  await page.evaluate(() => window.dockView.setDock(false));
  expect(await page.evaluate(() => window.dockView.shortcuts.execute('editor.save'))).toBe(true);
  await page.evaluate(() => window.removeDockAction());
  await page.evaluate(() => window.dockView.setDock(true));
  await expect(page.locator('.menu-dock')).toBeHidden();
});

test('Search can opt into the dock while its footer trigger is absent and retains its existing binding', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#menu-live'));
    window.dockSearchNavigation = view;
    view.setDock(true);
    view.search.update({ showDockTrigger: true, showNavigationTrigger: false });
    view.setSearchShortcut('Mod+J');
  });
  const button = page.locator('[data-dock-action="navigation.search"]');
  const input = page.locator('#menu-search-panel input');
  await expect(button).toBeVisible();
  await expect(button.locator('svg circle')).toHaveCount(1);
  await expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+J Meta+J');
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await button.focus();
  await button.press('Enter');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await page.evaluate(() => window.dockSearchNavigation.setSearch(false));
  await expect(button).toHaveCount(0);
  await expect(page.locator('.menu-dock')).toBeHidden();
  await page.evaluate(() => window.dockSearchNavigation.setSearch(true));
  await expect(button).toBeVisible();
  await page.evaluate(() => window.dockSearchNavigation.setSearchShortcut(null));
  await expect(button).not.toHaveAttribute('aria-keyshortcuts');
  await button.click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const view = window.dockSearchNavigation;
    view.setSearchShortcut('Mod+J');
    view.search.element.dataset.showDockTrigger = 'false';
  });
  await expect(button).toHaveCount(0);
  await page.keyboard.press('Control+j');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => {
    const { shortcuts } = window.dockSearchNavigation;
    return shortcuts.list().filter(action => action.id === 'navigation.search').length;
  })).toBe(1);
  expect(errors).toEqual([]);
});

for (const side of ['left', 'right']) {
  test(`mobile ${side} drawer and dock fit a centered preview and survive desktop position changes`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await configureDock(page, 'bottom');
    await page.evaluate(side => {
      const root = document.querySelector('#menu-live'), viewport = root.parentElement;
      viewport.style.width = '390px';
      viewport.style.marginInline = 'auto';
      root.dataset.mobilePosition = side;
    }, side);
    const root = page.locator('#menu-live'), nav = root.locator('#menu-live-nav');
    await root.locator('.workspace-hamburger').click();
    await expect(nav).toBeVisible();
    await expect(nav).toHaveJSProperty('inert', false);
    const viewportBox = await root.locator('.menu-live-header').boundingBox();
    const navBox = await nav.boundingBox(), dock = await root.locator('.menu-dock').boundingBox();
    if (side === 'left') expect(Math.abs(navBox.x - viewportBox.x)).toBeLessThanOrEqual(1);
    else expect(Math.abs(navBox.x + navBox.width - viewportBox.x - viewportBox.width)).toBeLessThanOrEqual(1);
    expect(navBox.y + navBox.height).toBeLessThanOrEqual(dock.y + 1);
    expect(Math.abs(dock.x - viewportBox.x)).toBeLessThanOrEqual(1);
    expect(dock.width).toBeLessThanOrEqual(390);
    await page.keyboard.press('Escape');
    await expect(nav).toHaveJSProperty('inert', true);
    await expect(root.locator('.workspace-hamburger')).toBeFocused();
    await root.locator('[data-dock-action="editor.save"]').click();
    expect(await page.evaluate(() => window.dockCalls)).toBe(1);
    await page.evaluate(() => {
      document.querySelector('#menu-live').parentElement.style.width = '';
      window.dockView.setPosition('right');
    });
    await expect(root).toHaveAttribute('data-position', 'right');
    await expect(nav).toHaveJSProperty('inert', false);
  });
}

test('dock overflow, live HTML configuration and repeated mounting remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await configureDock(page);
  await page.evaluate(() => {
    for (let i = 0; i < 18; i++) window.dockView.shortcuts.register({
      id: 'extra.' + i, label: '<b>Extra ' + i + '</b>', dock: true, handler: () => true,
    });
    const root = document.querySelector('#menu-live');
    root.dataset.position = 'top';
    root.dataset.mobilePosition = 'right';
  });
  const items = page.locator('.menu-dock-items');
  expect(await items.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.locator('[data-dock-action="editor.save"]').focus();
  await expect(page.locator('[data-dock-action="editor.save"]')).toBeInViewport();
  await expect(page.locator('.menu-dock-tooltip')).toBeVisible();
  await expect(page.locator('.menu-dock b')).toHaveCount(0);
  await page.evaluate(() => {
    const root = document.querySelector('#menu-live');
    window.dockView.destroy();
    Templify.destroy(root);
    Templify.init(root);
  });
  await expect(page.locator('.menu-dock')).toHaveCount(1);
  await expect(page.locator('[data-dock-action="editor.save"]')).toHaveCount(1);
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-side', 'right');
});

for (const position of ['top', 'bottom']) {
  test(`${position} navigation scrolls overflowing destinations horizontally and keeps the last submenu on screen`, async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await configureDock(page, position);
    await page.evaluate(() => {
      window.dockView.setItems([
        ...Array.from({ length: 20 }, (_, index) => ({ id: 'page-' + index, label: 'Destination ' + index, href: '#page-' + index })),
        { id: 'last', label: 'Last group', children: [{ id: 'nested', label: 'Nested destination', href: '#nested' }] },
      ]);
    });
    const items = page.locator('.workspace-nav-items');
    const forward = page.locator('.menu-scroll-primary .menu-scroll-indicator.down');
    await expect(forward).toBeVisible();
    await expect(forward).toHaveAttribute('aria-label', 'Scroll navigation right');
    await forward.click();
    await expect.poll(() => items.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    const group = page.locator('[data-menu-group="last"]');
    await group.focus();
    await group.press(position === 'top' ? 'ArrowDown' : 'ArrowUp');
    const panel = page.locator('#submenu-last');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox(), nav = await page.locator('#menu-live-nav').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(900);
    if (position === 'bottom') expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1);
    else expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1);
    await expect(page.locator('[data-menu-page="nested"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(group).toBeFocused();
    expect(await page.locator('#menu-live').evaluate(root => root.scrollWidth <= root.clientWidth + 1)).toBe(true);
  });
}

test('WebKit keeps all dock/menu layouts and the right mobile drawer within their bounds', async () => {
  const browser = await webkit.launch({ channel: undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await configureDock(page);
    for (const position of ['left', 'right', 'top', 'bottom']) {
      await page.evaluate(position => {
        window.dockView.setPosition(position);
        window.dockView.setCollapsed(true);
      }, position);
      const group = page.locator('[data-menu-group="projects"]');
      if (await group.getAttribute('aria-expanded') !== 'true') await group.click();
      const panel = page.locator('#submenu-projects');
      await expect(panel).toBeVisible();
      const box = await panel.boundingBox(), dock = await page.locator('.menu-dock').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1000);
      expect(box.y + box.height).toBeLessThanOrEqual(dock.y + 1);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.dockView.setMobilePosition('right'));
    await page.locator('.workspace-hamburger').click();
    await expect(page.locator('#menu-live-nav')).toHaveJSProperty('inert', false);
    const nav = await page.locator('#menu-live-nav').boundingBox(), dock = await page.locator('.menu-dock').boundingBox();
    const geometry = await page.locator('#menu-live').evaluate(root => ({
      viewportRight: root.parentElement.getBoundingClientRect().right,
      innerWidth: window.innerWidth,
      right: getComputedStyle(root.querySelector('#menu-live-nav')).right,
      rootRight: root.getBoundingClientRect().right,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(nav.x + nav.width, JSON.stringify(geometry)).toBeCloseTo(geometry.viewportRight, 0);
    expect(nav.y + nav.height).toBeLessThanOrEqual(dock.y + 1);
    await page.locator('[data-dock-action="editor.save"]').click();
    expect(await page.evaluate(() => window.dockCalls)).toBe(1);
  } finally {
    await browser.close();
  }
});

async function dismissSearch(page) {
  const dialog = page.locator('#menu-search-panel');
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
}

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
  await page.locator('.menu-search-toggle').click();
  await page.locator('#menu-search-panel input').fill('Create project');
  await page.locator('.ds-search-result').click();
  expect(await page.evaluate(() => window.calls)).toBe(2);
  await page.locator('.menu-search-toggle').click();
  await page.locator('#menu-search-panel input').fill('New tab');
  const popup = page.waitForEvent('popup');
  await page.locator('.ds-search-result').click();
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
  await expect(input).toHaveValue('⌘ / Ctrl + K');
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.searchShortcut = 'Mod+J'; });
  await expect(input).toHaveValue('⌘ / Ctrl + J');
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

test('modifier-only shortcuts record without invoking actions, accept Cmd or Ctrl and ignore longer chords', async ({ page }) => {
  await page.goto(url);
  const input = page.locator('#example-shortcuts input[aria-label="Navigation · Menu search"]');
  await input.press('Control+Shift');
  await expect(input).toHaveValue('⌘ / Ctrl + Shift');
  await expect(input).toBeFocused();

  for (const modifier of ['Control', 'Meta']) {
    await dismissSearch(page);
    await page.locator('h1').click();
    await page.keyboard.press(modifier + '+Shift');
    await expect(page.locator('#menu-search-panel input')).toBeFocused();
  }
  await dismissSearch(page);
  await page.locator('h1').click();
  await page.keyboard.press('Control+Shift+K');
  await expect(page.locator('#menu-search-panel input')).not.toBeFocused();

  await input.press('Meta+Alt+Shift+J');
  await expect(input).toHaveValue('⌘ / Ctrl + Alt + Shift + J');
  await expect(input).toBeFocused();
  await input.press('Control+Shift');
  await expect(input).toHaveValue('⌘ / Ctrl + Shift');
  await expect(input).toBeFocused();
  await page.locator('h1').click();
  await page.keyboard.press('Meta+Shift');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();

  await dismissSearch(page);
  await input.locator('..').locator('..').getByRole('button', { name: 'Reset' }).click();
  await expect(input).toHaveValue('⌘ / Ctrl + K');
});

test('HTML defaults support Shift with a character and modifier-only sidebar shortcuts through the shared dispatcher', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const menu = document.querySelector('#menu-live');
    menu.dataset.searchShortcut = 'Shift+K';
    menu.dataset.collapseShortcut = 'Alt+Shift';
  });
  const input = page.locator('#example-shortcuts input[aria-label="Navigation · Menu search"]');
  const toggle = page.locator('#example-shortcuts input[aria-label="Navigation · Toggle sidebar"]');
  await expect(input).toHaveValue('Shift + K');
  await expect(toggle).toHaveValue('Alt + Shift');
  await expect(page.locator('#menu-search-panel input')).toHaveAttribute('aria-keyshortcuts', 'Shift+K');
  await expect(page.locator('#menu-sidebar-toggle')).toHaveAttribute('aria-keyshortcuts', 'Alt+Shift');
  await page.locator('h1').click();
  await page.keyboard.press('Shift+K');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();

  await dismissSearch(page);
  await page.locator('h1').click();
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'false');
  await page.keyboard.up('Alt');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await page.keyboard.up('Shift');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await page.evaluate(() => { document.querySelector('#menu-live').dataset.collapse = 'false'; });
  await page.keyboard.press('Alt+Shift');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'false');
  await expect(toggle).toHaveValue('Alt + Shift');
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
  await page.locator('.menu-search-toggle').click();
  await page.locator('#menu-search-panel input').fill('Server page');
  await page.locator('.ds-search-result').click();
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
  await expect(page.locator('#example-shortcuts [data-shortcut-id="navigation.search"] input')).toHaveValue('⌘ / Ctrl + K');
  await page.locator('h1').click();
  await page.keyboard.press('Control+K');
  await expect(page.locator('#menu-search-panel input')).toBeFocused();
  expect(errors).toEqual([]);
});

for (const [name, pathname] of [
  ['workspace', '/source/index.html'],
  ['export', '/'],
  ['standalone example', '/source/ui/components/navigation/example.html'],
]) {
  test(`mobile drawer fills viewport height from the left without shifting content in ${name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url + pathname);
    const root = page.locator('#menu-live');
    const nav = root.locator('#menu-live-nav');
    const toggle = root.locator('.workspace-hamburger');
    for (const collapsed of [false, true]) {
      if (collapsed) {
        await page.setViewportSize({ width: 1280, height: 844 });
        await root.locator('#menu-sidebar-toggle').click();
        await expect(root).toHaveAttribute('data-sidebar-collapsed', 'true');
        await page.setViewportSize({ width: 390, height: 844 });
      }
      await expect(nav).toHaveJSProperty('inert', true);
      await toggle.scrollIntoViewIfNeeded();
      const content = await root.locator('.menu-live-content').boundingBox();
      await toggle.click();
      await expect(root).toHaveAttribute('data-mobile-menu-open', 'true');
      await expect(nav).toHaveJSProperty('inert', false);
      await expect(nav).toBeInViewport({ ratio: 1 });
      const header = await root.locator('.menu-live-header').boundingBox();
      const menu = await nav.boundingBox();
      expect(Math.abs(menu.y)).toBeLessThanOrEqual(1);
      expect(menu.height).toBe(844);
      expect(Math.abs(menu.x - header.x)).toBeLessThanOrEqual(1);
      expect(menu.width).toBeGreaterThanOrEqual(header.width / 2);
      expect(menu.width).toBeLessThan(header.width);
      expect(await root.locator('.menu-live-content').boundingBox()).toEqual(content);
      await expect(nav.locator('.menu-mobile-close')).toBeFocused();
      await expect(toggle).toBeHidden();
      await nav.locator('[data-menu-page="dashboard"]').click({ trial: true });
      if (collapsed) await nav.locator('.menu-mobile-close').click();
      else await page.keyboard.press('Escape');
      await expect(nav).toBeHidden();
      await expect(nav).toHaveJSProperty('inert', true);
      await expect(toggle).toBeFocused();
    }
  });
}

test('mobile drawer grows for labels, wraps at its width cap and scrolls above the pinned footer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  const root = page.locator('#menu-live');
  const nav = root.locator('#menu-live-nav');
  const previewWidth = (await root.locator('.menu-live-header').boundingBox()).width;
  const widthCap = previewWidth - 16;
  const setItems = async items => page.evaluate(items => {
    const view = Templify.get(document.querySelector('#menu-live'));
    view.setItems(items.map(item => ({ ...item, onClick: () => { window.drawerSelection = item.id; } })));
    view.mobile.setOpen(true);
  }, items);
  await setItems([{ id: 'short', label: 'Home', icon: 'home' }]);
  const short = await nav.boundingBox();
  expect(short.width).toBe(previewWidth / 2);
  await setItems([{ id: 'long', label: 'A fairly long navigation label', icon: 'home' }]);
  const long = await nav.boundingBox();
  expect(long.width).toBeGreaterThan(short.width);
  expect(long.width).toBeLessThan(widthCap);
  await setItems([{ id: 'wrapped', label: 'A very long navigation label that must wrap rather than overflowing the mobile viewport', icon: 'home' }]);
  expect((await nav.boundingBox()).width).toBe(widthCap);
  expect((await nav.locator('[data-menu-page="wrapped"]').boundingBox()).height).toBeGreaterThan(40);
  expect(await nav.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await setItems(Array.from({ length: 50 }, (_, i) => ({ id: 'destination-' + i, label: 'Destination ' + i, icon: 'home' })));
  await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#menu-live'));
    view.slots.footer.insertAdjacentHTML('afterbegin', '<button type="button" class="menu-utility" id="drawer-footer">Footer action</button>');
  });
  const footer = nav.locator('#drawer-footer');
  await expect(footer).toBeInViewport({ ratio: 1 });
  const footerBox = await footer.boundingBox();
  expect(footerBox.y + footerBox.height).toBeGreaterThan(800);
  const region = nav.locator('.menu-scroll-primary');
  expect(await region.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  const scrollY = await page.evaluate(() => window.scrollY);
  await nav.locator('[data-menu-page="destination-49"]').click({ trial: true });
  expect(await region.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await footer.boundingBox()).toEqual(footerBox);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await nav.locator('[data-menu-page="destination-49"]').click();
  expect(await page.evaluate(() => window.drawerSelection)).toBe('destination-49');
  await expect(root).toHaveAttribute('data-mobile-menu-open', 'false');
});

for (const browserName of ['chromium', 'webkit']) {
  test.describe(`${browserName} touch navigation controls`, () => {
    let browser;
    test.beforeAll(async () => {
      browser = await ({ chromium, webkit })[browserName].launch({ channel: browserName === 'chromium' ? 'chromium' : undefined });
    });
    test.afterAll(async () => { await browser?.close(); });
    const touch = test.extend({
      page: async ({}, use) => {
        const context = await browser.newContext({
          hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 },
        });
        try { await use(await context.newPage()); } finally { await context.close(); }
      },
    });

    touch('close button keeps touch focus quiet and keyboard focus visible', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url);
      const root = page.locator('#menu-live');
      const toggle = root.locator('.workspace-hamburger');
      const close = root.locator('.menu-mobile-close');
      await toggle.tap();
      await expect(close).toBeFocused();
      await expect(close).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
      await expect(close).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(close).toHaveCSS('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)');

      await page.keyboard.press('Tab');
      await close.focus();
      await expect(close).toBeFocused();
      await expect(close).not.toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');

      await close.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true });
      await expect(close).toBeFocused();
      await expect(close).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
      await close.tap();
      await expect(root).toHaveAttribute('data-mobile-menu-open', 'false');
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
      await expect(toggle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });

    for (const side of ['left', 'right']) {
      touch(`${side} drawer selection markers stay on selected rows, not the whole submenu`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(url);
        const root = page.locator('#menu-live');
        await page.evaluate(side => {
          const view = Templify.get(document.querySelector('#menu-live'));
          window.selectionView = view;
          view.setMobilePosition(side);
          view.setItems([
            { id: 'home', label: 'Home', href: '#home' },
            { id: 'projects', label: 'Projects', children: [
              { id: 'first', label: 'First project', href: '#first' },
              { id: 'current', label: 'Current project', href: '#current' },
              { id: 'last', label: 'Last project', href: '#last' },
            ] },
          ]);
        }, side);
        for (const collapsed of [false, true]) {
          await page.evaluate(collapsed => {
            const view = window.selectionView;
            view.setCollapsed(collapsed);
            view.select('current');
            view.mobile.setOpen(true);
            const group = document.querySelector('[data-menu-group="projects"]');
            if (group.getAttribute('aria-expanded') !== 'true') view.toggleGroup('projects');
          }, collapsed);
          await expect(root).toHaveAttribute('data-sidebar-collapsed', String(collapsed));
          const parent = root.locator('[data-menu-group="projects"]');
          const current = root.locator('[data-menu-page="current"]');
          for (const row of [parent, current]) {
            await expect(row).toBeVisible();
            const marker = await row.evaluate(node => {
              const style = getComputedStyle(node, '::before');
              return {
                content: style.content, position: getComputedStyle(node).position,
                height: parseFloat(style.height), rowHeight: node.getBoundingClientRect().height,
                left: style.left, right: style.right, width: style.width,
                colour: style.backgroundColor, accent: getComputedStyle(node).color,
              };
            });
            expect(marker.content).toBe('""');
            expect(marker.position).toBe('relative');
            expect(Math.abs(marker.height - marker.rowHeight)).toBeLessThanOrEqual(1);
            expect(marker[side]).toBe('-1px');
            expect(parseFloat(marker[side === 'left' ? 'right' : 'left'])).toBeGreaterThan(3);
            expect(marker.width).toBe('3px');
            expect(marker.colour).toBe(marker.accent);
          }
          for (const id of ['home', 'first', 'last']) {
            expect(await root.locator(`[data-menu-page="${id}"]`).evaluate(node =>
              getComputedStyle(node, '::before').content)).toBe('none');
          }
          await page.evaluate(() => {
            window.selectionView.select('home');
            window.selectionView.mobile.setOpen(true);
          });
          expect(await parent.evaluate(node => getComputedStyle(node, '::before').content)).toBe('none');
          expect(await current.evaluate(node => getComputedStyle(node, '::before').content)).toBe('none');
        }
      });
    }
  });
}

test('mobile drawer slides from the left, dismisses outside and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + '/source/ui/components/navigation/example.html');
  const root = page.locator('#menu-live');
  const nav = root.locator('#menu-live-nav');
  await expect(root).toHaveAttribute('data-motion-ready', 'true');
  expect(await nav.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)).toBeLessThan(0);
  const animation = await page.evaluate(() => {
    const root = document.querySelector('#menu-live'), nav = root.querySelector('#menu-live-nav');
    DesignSystemNavigation.mount(root).mobile.setOpen(true);
    getComputedStyle(nav).transform;
    return nav.getAnimations().filter(animation => animation.transitionProperty === 'transform')
      .map(animation => ({ duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes().map(frame => frame.transform) }));
  });
  expect(animation).toHaveLength(1);
  expect(animation[0].duration).toBe(260);
  expect(animation[0].frames[0]).toMatch(/-[\d.]+/);
  await expect(nav).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.mouse.click(389, 400);
  await expect(root).toHaveAttribute('data-mobile-menu-open', 'false');
  await expect(nav).toHaveJSProperty('inert', true);
  await expect(nav).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(nav).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  expect(await nav.evaluate(node => node.getAnimations().length)).toBe(0);
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
  await expect(page.locator('.menu-mobile-close')).toHaveCount(1);
  await expect(page.locator('.menu-sidebar-edge-toggle')).toHaveCount(1);
  await page.evaluate(() => Templify.get(document.querySelector('#menu-live')).setCollapse(true));
  await expect(page.locator('.menu-mobile-close')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-menu-open', 'false');
  await expect(page.locator('.workspace-hamburger')).toBeVisible();
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
  await page.locator('#allow-dock').check();
  await page.locator('#menu-position').selectOption('bottom');
  await page.locator('[data-dock-action="notes.create"]').click();
  await expect(page.locator('#action-status')).toHaveText('Quick note action executed.');
  await page.locator('#mobile-position').selectOption('right');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-side', 'right');
  const nav = await page.locator('#menu-live-nav').boundingBox();
  const dock = await page.locator('.menu-dock').boundingBox();
  expect(nav.x + nav.width).toBe(390);
  expect(nav.y + nav.height).toBeLessThanOrEqual(dock.y + 1);
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
  const utility = await page.locator('.workspace-device-picker > .ui-icon').boundingBox();
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
