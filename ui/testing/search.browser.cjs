const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { buildExport } = require('../scripts/export.cjs');
let directory, server, url;

test.beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-search-'));
  await buildExport({ outdir: directory, components: ['search', 'shortcuts'] });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/fragment') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<a href="#dynamic-destination" data-search-title="Live destination" data-search-description="Added by HTMX">Dynamic link</a>');
      return;
    }
    if (pathname === '/rocket.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 22 12 2l10 20Z" fill="green"/></svg>');
      return;
    }
    const file = path.resolve(directory, pathname.slice(1) || 'index.html');
    if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
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
const input = page => page.locator('#example-search .ds-search-input');
const dialog = page => page.locator('#example-search .ds-search-dialog');
async function open(page) { await page.locator('#example-search [data-search-open]').click(); }

test('standalone Search uses a central animated Window, keyboard shortcuts, modal focus and reduced motion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await open(page);
  await expect(input(page)).toBeFocused();
  await expect(dialog(page).locator('[data-search-close], .ds-search-dismiss')).toHaveCount(0);
  await expect(dialog(page).locator('.ds-search-bar button')).toHaveCount(0);
  await expect(dialog(page)).toHaveCSS('animation-name', 'ds-window-enter');
  await input(page).fill('no matching destination');
  await page.waitForTimeout(220);
  const box = await dialog(page).boundingBox(), viewport = page.viewportSize();
  expect(box.height).toBeLessThan(300);
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator('#example-search [data-search-open]')).toBeFocused();
  for (const modifier of ['Control', 'Meta']) {
    await page.keyboard.press(modifier + '+k');
    await expect(input(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(dialog(page)).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
  expect(errors).toEqual([]);
});

test('links expose URLs, anchors, descriptions and graphics; named headings work without incoming links', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend', `
      <section id="fixtures">
        <p id="launch-description">Bootstrapping a new project</p>
        <a id="launch" href="/docs/install#quick-start" data-search-title="Launch project" aria-describedby="launch-description" data-search-keywords="setup configuration"><img src="/rocket.svg" alt="Rocket illustration">Install</a>
        <h2 id="zażółć">Zażółć Łódź section</h2>
        <a href="javascript:alert(1)">Unsafe destination</a>
        <div hidden><a href="#hidden">Hidden destination</a></div>
        <div style="display:none"><a href="#css-hidden">CSS hidden destination</a></div>
        <div data-search-ignore><a href="#ignored">Ignored destination</a></div>
        <div id="technical-control">Technical ID is not a destination</div>
      </section>`);
    window.linkCalls = 0;
    document.querySelector('#launch').addEventListener('click', event => { event.preventDefault(); window.linkCalls++; });
  });
  await open(page);
  for (const query of ['bootstrapping', '/docs/install', 'quick-start', 'configuration', 'Rocket']) {
    await input(page).fill(query);
    const row = page.locator('#example-search .ds-search-result');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.ds-search-title')).toHaveText('Launch project');
    await expect(row.locator('.ds-search-description')).toHaveText('Bootstrapping a new project');
    await expect(row.locator('img')).toHaveAttribute('src', '/rocket.svg');
    await expect(row).toHaveAttribute('href', '/docs/install#quick-start');
  }
  await page.keyboard.press('Enter');
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.linkCalls)).toBe(1);
  await open(page);
  for (const query of ['Unsafe destination', 'Hidden destination', 'CSS hidden destination', 'Ignored destination', 'technical-control']) {
    await input(page).fill(query);
    await expect(page.locator('#example-search .ds-search-result')).toHaveCount(0);
  }
  await input(page).fill('zazolc lodz');
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#za%C5%BC%C3%B3%C5%82%C4%87$/);
});

test('SVG previews copy only inert geometry and titles/descriptions remain plain text', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '#safe-svg';
    link.dataset.searchTitle = '<b>SVG sample</b>';
    link.dataset.searchDescription = '<img src=x onerror=alert(1)>';
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-label="Geometry preview" onmouseover="window.unexpected=true"><path d="M0 0h24v24Z" stroke="currentColor"/><foreignObject><div>Do not copy</div></foreignObject><use href="https://example.com/external.svg#icon"/></svg>';
    document.querySelector('main').append(link);
  });
  await open(page);
  await input(page).fill('Geometry preview');
  const row = page.locator('#example-search .ds-search-result');
  await expect(row.locator('.ds-search-title')).toHaveText('<b>SVG sample</b>');
  await expect(row.locator('.ds-search-description')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(row.locator('b, img, foreignObject, use, [onmouseover]')).toHaveCount(0);
  await expect(row.locator('svg path')).toHaveCount(1);
});

test('optional Navigation connection owns its magnifier, includes collapsed menu buttons and cleans up', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const menu = document.createElement('section');
    menu.id = 'menu-live';
    menu.innerHTML = '<nav class="menu-live-nav"><div class="menu-section"><button data-menu-group="projects" aria-label="Projects">Projects</button><div hidden><button data-menu-page="create" data-search-description="Start a project">Create project</button></div></div><div class="menu-sidebar-footer"></div></nav>';
    document.querySelector('main').append(menu);
    window.menuCalls = 0;
    menu.querySelector('[data-menu-page]').addEventListener('click', () => { window.menuCalls++; });
    window.searchView = Templify.get(document.querySelector('[data-ui="search"]'));
    window.searchView.update({ navigation: '#menu-live' });
  });
  await expect(page.locator('.menu-search-toggle')).toHaveCount(1);
  await expect(page.locator('.menu-sidebar-footer .menu-search-toggle')).toHaveCount(1);
  await expect(page.locator('.menu-live-nav > .menu-search-section')).toHaveCount(0);
  await page.evaluate(() => window.searchView.update({ showNavigationTrigger: false }));
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(input(page)).toBeFocused();
  await input(page).fill('projects create');
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(1);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.menuCalls)).toBe(1);
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.showNavigationTrigger = 'true'; });
  await expect(page.locator('.menu-sidebar-footer .menu-search-toggle')).toHaveCount(1);
  await page.locator('.menu-search-toggle').click();
  await expect(input(page)).toBeFocused();
  await input(page).fill('projects create');
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(1);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.menuCalls)).toBe(2);
  await page.evaluate(() => Templify.destroy(document.querySelector('[data-ui="search"]')));
  expect(await page.evaluate(() => window.searchView.refresh())).toEqual([]);
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  expect(await page.evaluate(() => Templify.get(document.querySelector('[data-ui="shortcuts"]')).get('search.open'))).toBeNull();
});

test('component commands need no keyboard binding, recheck availability and do not steal action focus', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const destination = document.createElement('input');
    destination.id = 'command-destination';
    document.querySelector('main').append(destination);
    window.commandEnabled = true; window.commandCalls = 0;
    const view = Templify.get(document.querySelector('[data-ui="search"]'));
    window.removeCommand = view.shortcuts.register({
      id: 'test.create', label: 'Create document', description: 'Start writing immediately',
      keywords: ['draft', 'author'], group: 'Editor', searchable: true,
      enabled: () => window.commandEnabled,
      handler() { window.commandCalls++; destination.focus(); return true; },
    });
  });
  await open(page);
  await input(page).fill('author');
  await expect(page.locator('#example-search .ds-search-title')).toHaveText('Create document');
  await page.evaluate(() => { window.commandEnabled = false; });
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.commandCalls)).toBe(0);
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(0);
  await page.evaluate(() => { window.commandEnabled = true; Templify.get(document.querySelector('[data-ui="search"]')).refresh(); });
  await page.keyboard.press('Enter');
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator('#command-destination')).toBeFocused();
  await page.waitForTimeout(250);
  await expect(page.locator('#command-destination')).toBeFocused();
  expect(await page.evaluate(() => window.commandCalls)).toBe(1);
  await page.evaluate(() => window.removeCommand());
  await open(page);
  await input(page).fill('author');
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(0);
});

test('real HTMX swaps and removal refresh the document index while Search is open', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const section = document.createElement('section');
    section.innerHTML = '<button id="load-fragment" hx-get="/fragment" hx-target="#dynamic">Load</button><div id="dynamic"></div>';
    document.querySelector('main').append(section);
    htmx.process(section);
  });
  await page.locator('#load-fragment').click();
  await expect(page.locator('#dynamic a')).toHaveCount(1);
  await open(page);
  await input(page).fill('Added by HTMX');
  await expect(page.locator('#example-search .ds-search-title')).toHaveText('Live destination');
  await page.evaluate(() => { document.querySelector('#dynamic').replaceChildren(); });
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(0);
});

test('scope, source switches, live visibility and presentation attributes constrain the same index', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend',
      '<section id="source-scope"><h2 id="local-heading">Local heading</h2><a id="local-link" href="#local-target" data-search-description="A local description">Local link</a></section><a href="#outside">Outside scope</a>');
    const host = document.querySelector('[data-ui="search"]');
    host.dataset.scope = '#source-scope';
    host.dataset.links = 'false';
  });
  await open(page);
  await expect(page.locator('#example-search .ds-search-title')).toHaveText('Local heading');
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="search"]');
    host.dataset.links = 'true';
    host.dataset.anchors = 'false';
    host.dataset.showDescriptions = 'false';
  });
  await expect(page.locator('#example-search .ds-search-title')).toHaveText('Local link');
  await expect(page.locator('#example-search .ds-search-description')).toHaveCount(0);
  await page.evaluate(() => { document.querySelector('#local-link').style.display = 'none'; });
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(0);
  await page.evaluate(() => { document.querySelector('#local-link').style.display = ''; });
  await expect(page.locator('#example-search .ds-search-title')).toHaveText('Local link');
});

test('declarative options update results and binding defaults without overriding saved user preferences', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="search"]'), view = Templify.get(host);
    view.shortcuts.set('search.open', 'Mod+Shift');
    host.dataset.openShortcut = 'Mod+J';
    host.dataset.showIcons = 'false';
    host.dataset.maxResults = '1';
  });
  await page.keyboard.press('Control+Shift');
  await expect(input(page)).toBeFocused();
  await expect(page.locator('#example-search .ds-search-result')).toHaveCount(1);
  await expect(page.locator('#example-search .ds-search-graphic')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => Templify.get(document.querySelector('[data-ui="search"]')).shortcuts.reset('search.open'));
  await page.keyboard.press('Meta+j');
  await expect(input(page)).toBeFocused();
});

test('maximum results defaults to five in HTML, runtime and invalid-value fallbacks', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) {
      const link = document.createElement('a');
      link.href = '#default-limit-' + i;
      link.textContent = 'Default limit preview ' + i;
      document.querySelector('main').append(link);
    }
  });
  await open(page);
  await input(page).fill('Default limit preview');
  const rows = page.locator('#example-search .ds-search-result');
  await expect(rows).toHaveCount(5);
  for (const value of [null, 'invalid', '']) {
    await page.evaluate(value => {
      const host = document.querySelector('[data-ui="search"]');
      if (value === null) delete host.dataset.maxResults;
      else host.dataset.maxResults = value;
    }, value);
    await expect(rows).toHaveCount(5);
  }
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.maxResults = '7'; });
  await expect(rows).toHaveCount(7);
  await page.evaluate(() => { delete document.querySelector('[data-ui="search"]').dataset.maxResults; });
  await expect(rows).toHaveCount(5);
});

test('each result shows its category on the right instead of section headers, including repeated and custom groups', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend', `
      <a href="#category-guide" data-search-group="Documentation">Category preview guide</a>
      <a href="#category-link">Category preview link</a>
      <a href="#category-reference" data-search-group="Documentation">Category preview reference</a>
      <h2 id="category-section">Category preview section</h2>`);
    Templify.get(document.querySelector('[data-ui="search"]')).shortcuts.register({
      id: 'test.category', label: 'Category preview command', group: '<b>Commands</b>',
      searchable: true, defaultShortcut: 'Mod+Shift+K', handler() { window.categoryCalls = 1; return true; },
    });
  });
  await open(page);
  await input(page).fill('Category preview');
  const rows = page.locator('#example-search .ds-search-result');
  const categories = rows.locator('.ds-search-category');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('#example-search .ds-search-group, #example-search .ds-search-results > :not(.ds-search-result)')).toHaveCount(0);
  await expect(categories).toHaveText(['Documentation', 'Documentation', 'Links', 'On this page', '<b>Commands</b>']);
  await expect(categories.locator('b')).toHaveCount(0);
  await expect(rows.last().locator('.ds-search-shortcut')).toBeVisible();
  for (const row of await rows.all()) {
    await expect(row.locator(':scope > :last-child')).toHaveClass('ds-search-category');
    const geometry = await row.evaluate(row => {
      const category = row.querySelector('.ds-search-category').getBoundingClientRect();
      return { right: row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight),
        categoryRight: category.right, categoryLeft: category.left,
        textRight: row.querySelector('.ds-search-text').getBoundingClientRect().right };
    });
    expect(Math.abs(geometry.categoryRight - geometry.right)).toBeLessThan(1);
    expect(geometry.categoryLeft).toBeGreaterThan(geometry.textRight);
  }
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.groupResults = 'false'; });
  await expect(categories).toHaveCount(0);
  await expect(rows.locator('.ds-search-title')).toHaveText([
    'Category preview guide', 'Category preview link', 'Category preview reference', 'Category preview section', 'Category preview command',
  ]);
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.groupResults = 'true'; });
  await expect(categories).toHaveCount(5);
  await input(page).fill('<b>Commands</b>');
  await expect(rows).toHaveCount(1);
  await expect(rows).toHaveAttribute('aria-label', '<b>Commands</b> → Category preview command');
  await categories.click();
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.categoryCalls)).toBe(1);
});

test('long category labels truncate on the right in both densities and mobile layouts and follow theme colours', async ({ page }) => {
  const category = 'A long category '.repeat(20).trim();
  await page.goto(url);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(group => {
    Templify.get(document.querySelector('[data-ui="search"]')).shortcuts.register({
      id: 'test.category-layout', label: 'Category layout command', group, searchable: true,
      defaultShortcut: 'Mod+Shift+K', handler() { return true; },
    });
  }, category);
  await open(page);
  await input(page).fill('Category layout');
  const row = page.locator('#example-search .ds-search-result');
  const label = row.locator('.ds-search-category');
  await expect(label).toHaveText(category);
  await expect(label).toHaveAttribute('title', category);
  for (const [theme, colour] of [
    ['light', 'rgb(97, 112, 134)'], ['dark', 'rgb(170, 174, 181)'], ['matrix', 'rgb(142, 173, 152)'],
  ]) {
    await page.evaluate(theme => Templify.themes.select(theme), theme);
    await expect(label).toHaveCSS('color', colour);
  }
  for (const compact of [false, true]) {
    await page.evaluate(compact => Templify.get(document.querySelector('[data-ui="search"]')).update({ compact }), compact);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(label).toBeVisible();
      const geometry = await row.evaluate(row => {
        const label = row.querySelector('.ds-search-category'), category = label.getBoundingClientRect();
        return { categoryWidth: category.width, categoryRight: category.right,
          rowWidth: row.clientWidth, rowRight: row.getBoundingClientRect().right,
          rowScrollWidth: row.scrollWidth, truncated: label.scrollWidth > label.clientWidth };
      });
      expect(geometry.categoryWidth).toBeLessThanOrEqual(geometry.rowWidth * .3 + 1);
      expect(geometry.categoryRight).toBeLessThan(geometry.rowRight);
      expect(geometry.rowScrollWidth).toBeLessThanOrEqual(geometry.rowWidth);
      expect(geometry.truncated).toBe(true);
    }
  }
});

test('keyboard and pointer navigation share a single visible active result', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      const link = document.createElement('a');
      link.href = '#selection-' + i;
      link.textContent = 'Selection preview ' + i;
      link.addEventListener('click', event => { event.preventDefault(); window.selectedDestination = i; });
      document.querySelector('main').append(link);
    }
  });
  await open(page);
  await input(page).fill('Selection preview');
  const rows = page.locator('#example-search .ds-search-result');
  await expect(rows).toHaveCount(3);
  await rows.first().hover();
  for (const [key, selected] of [['ArrowDown', 1], ['ArrowDown', 2], ['ArrowDown', 0], ['ArrowUp', 2]]) {
    await page.keyboard.press(key);
    await expect(page.locator('#example-search .ds-search-result.is-active')).toHaveCount(1);
    await expect(page.locator('#example-search .ds-search-result[aria-selected="true"]')).toHaveCount(1);
    await expect(rows.nth(selected)).toHaveAttribute('aria-selected', 'true');
    await expect(input(page)).toHaveAttribute('aria-activedescendant', await rows.nth(selected).getAttribute('id'));
    for (let i = 0; i < 3; i++) {
      await expect(rows.nth(i)).toHaveCSS('background-color', i === selected ? 'rgb(229, 235, 243)' : 'rgba(0, 0, 0, 0)');
    }
  }
  await rows.nth(1).hover();
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(rows.first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(rows.nth(2)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.selectedDestination)).toBe(1);
});

test('compact presentation supports live options and declarative attributes without losing metadata or keyboard behavior', async ({ page }) => {
  await page.goto(url);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend',
      '<a href="#compact-link" data-search-description="A useful description"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12h20"/></svg>Compact preview link</a>');
    const view = Templify.get(document.querySelector('[data-ui="search"]'));
    view.shortcuts.register({
      id: 'test.compact', label: 'Compact preview command', description: 'A useful command',
      searchable: true, defaultShortcut: 'Mod+Shift+K', handler() { window.compactCommandCalls = 1; return true; },
    });
  });
  await open(page);
  await input(page).fill('Compact preview');
  const rows = page.locator('#example-search .ds-search-result');
  const graphic = rows.first().locator('.ds-search-graphic');
  const bar = dialog(page).locator('.ds-search-bar');
  await expect(dialog(page)).not.toHaveClass(/is-compact/);
  await expect(graphic).toHaveCSS('width', '40px');
  const normal = await rows.first().boundingBox();
  await page.evaluate(() => Templify.get(document.querySelector('[data-ui="search"]')).update({ compact: true }));
  await expect(dialog(page)).toHaveClass(/is-compact/);
  await expect(rows.first()).toHaveCSS('min-height', '48px');
  await expect(graphic).toHaveCSS('width', '32px');
  await expect(graphic.locator('svg')).toHaveCSS('width', '20px');
  await expect(bar).toHaveCSS('padding-top', '16px');
  await expect(input(page)).toHaveCSS('font-size', '20px');
  await expect(input(page)).toHaveValue('Compact preview');
  await expect(input(page)).toBeFocused();
  await expect(rows.locator('.ds-search-description')).toHaveText(['A useful description', 'A useful command']);
  await expect(rows.locator('.ds-search-address')).toHaveText('#compact-link');
  await expect(rows.locator('.ds-search-shortcut')).toHaveCount(1);
  expect((await rows.first().boundingBox()).height).toBeLessThan(normal.height);
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.compact = 'false'; });
  await expect(dialog(page)).not.toHaveClass(/is-compact/);
  await expect(graphic).toHaveCSS('width', '40px');
  await expect(bar).toHaveCSS('padding-top', '24px');
  await page.evaluate(() => { document.querySelector('[data-ui="search"]').dataset.compact = 'true'; });
  await expect(dialog(page)).toHaveClass(/is-compact/);
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(input(page)).toHaveCSS('font-size', '20px');
  await expect(bar).toHaveCSS('padding-top', '16px');
  await expect(rows.first()).toHaveCSS('min-height', '48px');
  expect((await dialog(page).boundingBox()).width).toBeLessThanOrEqual(370);
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.compactCommandCalls)).toBe(1);
});

test('compact can be declared before mounting and resets when the attribute is removed', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="search"]');
    Templify.destroy(host);
    host.dataset.compact = 'true';
    Templify.init(host);
  });
  await open(page);
  await expect(dialog(page)).toHaveClass(/is-compact/);
  await expect(input(page)).toHaveCSS('font-size', '20px');
  await page.evaluate(() => { delete document.querySelector('[data-ui="search"]').dataset.compact; });
  await expect(dialog(page)).not.toHaveClass(/is-compact/);
  await expect(input(page)).toHaveCSS('font-size', '28px');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toBeVisible();
});

test('result graphics and keycaps follow theme surfaces across live theme changes', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend', `
      <a href="#theme-link">Theme preview link</a>
      <a href="#theme-svg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12h20"/></svg>Theme preview SVG</a>
      <a href="#theme-image"><img src="/rocket.svg" alt="">Theme preview image</a>`);
    Templify.get(document.querySelector('[data-ui="search"]')).shortcuts.register({
      id: 'test.theme-preview', label: 'Theme preview command', searchable: true,
      defaultShortcut: 'Mod+Shift+K', handler() { return true; },
    });
  });
  await open(page);
  await input(page).fill('Theme preview');
  const graphics = page.locator('#example-search .ds-search-graphic');
  const keycaps = page.locator('#example-search .ds-search-shortcut');
  await expect(graphics).toHaveCount(4);
  await expect(graphics.locator('svg')).toHaveCount(1);
  await expect(graphics.locator('img')).toHaveCount(1);
  await expect(keycaps).toHaveCount(1);
  for (const [theme, background, accent] of [
    ['light', 'rgb(243, 246, 250)', 'rgb(34, 68, 127)'],
    ['dark', 'rgb(36, 36, 36)', 'rgb(120, 169, 237)'],
    ['matrix', 'rgb(12, 17, 14)', 'rgb(117, 232, 154)'],
    ['light', 'rgb(243, 246, 250)', 'rgb(34, 68, 127)'],
  ]) {
    await page.evaluate(theme => Templify.themes.select(theme), theme);
    await expect(dialog(page)).toBeVisible();
    for (const graphic of await graphics.all()) {
      await expect(graphic).toHaveCSS('background-color', background);
      await expect(graphic).toHaveCSS('color', accent);
    }
    await expect(graphics.locator('svg')).toHaveCSS('stroke', accent);
    for (const keycap of await keycaps.all()) await expect(keycap).toHaveCSS('background-color', background);
  }
  await page.evaluate(() => document.documentElement.style.setProperty('--ds-colour-page', 'rgb(19, 29, 39)'));
  for (const surface of await graphics.or(keycaps).all()) {
    await expect(surface).toHaveCSS('background-color', 'rgb(19, 29, 39)');
  }
});

test('mobile sizing and live Theme tokens control the palette without remounting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(url);
  await open(page);
  const box = await dialog(page).boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(9);
  expect(box.width).toBeLessThanOrEqual(370);
  await expect(input(page)).toHaveCSS('font-size', '20px');
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.dsTheme = 'dark';
    root.style.setProperty('--ds-colour-panel', 'rgb(31, 42, 53)');
    root.style.setProperty('--ds-radius-windows', '24px');
    root.style.setProperty('--ds-shadow-strong', 'rgb(1, 2, 3) 0px 5px 17px 0px');
  });
  await expect(dialog(page)).toHaveCSS('background-color', 'rgb(31, 42, 53)');
  await expect(dialog(page)).toHaveCSS('border-radius', '24px');
  await expect(dialog(page)).toHaveCSS('box-shadow', 'rgb(1, 2, 3) 0px 5px 17px 0px');
});
