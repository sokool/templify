const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '../..');
let server, url;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, pathname.slice(1) || 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function chooseDevice(page, device) {
  await page.getByRole('combobox', { name: 'Preview device', exact: true }).click();
  await page.getByRole('listbox', { name: 'Preview device', exact: true })
    .getByRole('option', { name: device[0].toUpperCase() + device.slice(1), exact: true }).click();
}

test('workspace Search defaults to Mod+K and Reset restores it without losing saved custom bindings on reload', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.shortcuts');
  const row = page.locator('[data-shortcut-id="navigation.search"]');
  const recorder = row.locator('input');
  await expect(recorder).toHaveValue('⌘ / Ctrl + K');
  await recorder.press('Control+Shift+j');
  await page.reload();
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + J');
  await row.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(recorder).toHaveValue('⌘ / Ctrl + K');
  await page.reload();
  await expect(recorder).toHaveValue('⌘ / Ctrl + K');
  for (const modifier of ['Control', 'Meta']) {
    await page.getByRole('heading', { name: 'Shortcuts', exact: true }).click();
    await page.keyboard.press(modifier + '+k');
    await expect(page.getByRole('combobox', { name: 'Search pages and actions', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
  }
});

test('one compact device dropdown updates and restores the preview in expanded and collapsed navigation', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  const select = page.getByRole('combobox', { name: 'Preview device', exact: true });
  const native = page.locator('select[data-preview-device]');
  const picker = page.locator('.workspace-device-picker');
  const viewport = page.locator('#example-viewport');
  await expect(select).toHaveCount(1);
  await expect(native.locator('option')).toHaveText(['Desktop', 'Tablet', 'Mobile']);
  await expect(native).toHaveValue('desktop');
  await expect(page.locator('.menu-utilities > .menu-utility')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /^(Desktop|Tablet|Mobile)$/ })).toHaveCount(0);
  await chooseDevice(page, 'tablet');
  await expect(viewport).toHaveAttribute('data-device', 'tablet');
  await expect(viewport).toHaveCSS('max-width', '768px');
  await expect(picker.locator('.menu-utility-label')).toHaveText('Tablet');
  await page.reload();
  await expect(native).toHaveValue('tablet');
  await expect(viewport).toHaveAttribute('data-device', 'tablet');
  await page.locator('#menu-sidebar-toggle').click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await select.focus();
  await expect(select).toBeFocused();
  await chooseDevice(page, 'mobile');
  await expect(viewport).toHaveAttribute('data-device', 'mobile');
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const nav = page.locator('#menu-live-nav');
  await expect(nav).toBeInViewport({ ratio: 1 });
  let previewBox = await viewport.boundingBox();
  let drawerBox = await nav.boundingBox();
  expect(drawerBox.x).toBe(previewBox.x);
  expect(drawerBox.y).toBe(0);
  expect(drawerBox.width).toBe(previewBox.width / 2);
  expect(drawerBox.height).toBe(page.viewportSize().height);
  await page.setViewportSize({ width: 1000, height: 800 });
  previewBox = await viewport.boundingBox();
  await expect(nav).toHaveCSS('left', previewBox.x + 'px');
  drawerBox = await nav.boundingBox();
  expect(drawerBox.height).toBe(800);
  await expect(native).toHaveValue('mobile');
  await chooseDevice(page, 'desktop');
  await expect(viewport).toHaveAttribute('data-device', 'desktop');
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(select).toBeVisible();
  expect(errors).toEqual([]);
});

test('Settings lives only in the footer and keeps routing, selection and search', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url);
  const settings = page.locator('[data-menu-page="settings"]');
  await expect(settings).toHaveCount(1);
  await expect(page.locator('.workspace-nav-items [data-menu-page="settings"]')).toHaveCount(0);
  await expect(page.locator('.menu-sidebar-footer [data-menu-page="settings"]')).toHaveCount(1);
  await settings.click();
  await expect(page).toHaveURL(/#topschrank.settings$/);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(settings).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-menu-page="dashboard"]').click();
  await expect(settings).not.toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Search pages and actions', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search pages and actions', exact: true }).fill('Settings');
  await page.getByRole('option', { name: 'Menu → Settings', exact: true }).click();
  await expect(page).toHaveURL(/#topschrank.settings$/);
  await expect(settings).toHaveAttribute('aria-current', 'page');
  await page.locator('#menu-sidebar-toggle').click();
  await expect(settings).toBeVisible();
  await settings.click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await chooseDevice(page, 'mobile');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(settings).toBeVisible();
  await settings.click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-mobile-menu-open', 'false');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [name, width] of [['phone', 390], ['centered mobile preview', 1280]]) {
  test(`Search shares the bottom icon row in ${name}, with or without the theme control`, async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 844 });
    await page.goto(url + '/index.html#topschrank.components.themeswitcher');
    if (width > 620) await chooseDevice(page, 'mobile');
    const footer = page.locator('.menu-sidebar-footer');
    const trigger = footer.locator('.menu-search-toggle');
    const setting = page.getByRole('switch', { name: 'Show in menu footer', exact: true });
    for (const showTheme of [true, false]) {
      await setting.setChecked(showTheme);
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      const boxes = await footer.locator('.menu-search-toggle, .menu-utilities > .menu-utility')
        .evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
      expect(boxes).toHaveLength(showTheme ? 4 : 3);
      const footerBox = await footer.boundingBox();
      for (const [i, box] of boxes.entries()) {
        expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.width - footerBox.width / boxes.length)).toBeLessThanOrEqual(1);
        if (i) expect(Math.abs(box.x - boxes[i - 1].x - boxes[i - 1].width)).toBeLessThanOrEqual(1);
      }
      expect(boxes[0].y + boxes[0].height).toBeGreaterThan(800);
      await trigger.click();
      await expect(page.getByRole('combobox', { name: 'Search pages and actions', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await page.locator('.menu-mobile-close').click();
    }
  });
}

test('Search footer magnifier can be hidden independently, persists and works in collapsed/mobile navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const setting = page.getByRole('switch', { name: 'Show search in navigation footer', exact: true });
  const trigger = page.locator('.menu-sidebar-footer .menu-search-toggle');
  const input = page.getByRole('combobox', { name: 'Search pages and actions', exact: true });
  await expect(setting).toBeChecked();
  await expect(trigger).toBeVisible();
  await expect(page.locator('.menu-live-nav > .menu-search-section')).toHaveCount(0);
  await setting.uncheck();
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open Search', exact: true }).click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(setting).not.toBeChecked();
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await page.locator('[data-menu-page="dashboard"]').click();
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await page.goto(url + '/index.html#topschrank.components.search');
  await setting.check();
  await expect(trigger).toHaveCount(1);
  await page.locator('#menu-sidebar-toggle').click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await trigger.click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await setting.uncheck();
  await setting.check();
  await expect(trigger).toHaveCount(1);
  await chooseDevice(page, 'mobile');
  await setting.uncheck();
  await setting.check();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(input).toBeFocused();
  expect(errors).toEqual([]);
});

test('Search compact preference persists across reloads and navigation without changing theme-aware graphics', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const setting = page.getByRole('switch', { name: 'Compact', exact: true });
  const input = page.getByRole('combobox', { name: 'Search pages and actions', exact: true });
  const dialog = page.locator('#menu-search-panel');
  await expect(setting).not.toBeChecked();
  await setting.check();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('design-system-workspace')).data.components.search.compact,
  )).toBe(true);
  await page.getByRole('button', { name: 'Open Search', exact: true }).click();
  await expect(dialog).toHaveClass(/is-compact/);
  await expect(input).toHaveCSS('font-size', '20px');
  await expect(dialog.locator('.ds-search-bar button')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(setting).toBeChecked();
  await page.locator('[data-menu-page="dashboard"]').click();
  await page.keyboard.press('Control+k');
  await expect(dialog).toHaveClass(/is-compact/);
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.goto(url + '/index.html#topschrank.components.search');
  for (const [id, background] of [['dark', 'rgb(36, 36, 36)'], ['matrix', 'rgb(12, 17, 14)']]) {
    await page.locator('.menu-utilities [data-theme-next]').click();
    await expect(page.locator('html')).toHaveAttribute('data-ds-theme', id);
    await page.getByRole('button', { name: 'Open Search', exact: true }).click();
    await expect(dialog).toHaveClass(/is-compact/);
    await expect(dialog.locator('.ds-search-graphic').first()).toHaveCSS('background-color', background);
    await page.keyboard.press('Escape');
  }
  await setting.uncheck();
  await page.getByRole('button', { name: 'Open Search', exact: true }).click();
  await expect(dialog).not.toHaveClass(/is-compact/);
  await expect(input).toHaveCSS('font-size', '28px');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(setting).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('Search dock preference persists independently of the footer and opens the same palette on desktop and mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const setting = page.getByRole('switch', { name: 'Show search in dock', exact: true });
  const footer = page.getByRole('switch', { name: 'Show search in navigation footer', exact: true });
  const button = page.locator('[data-dock-action="navigation.search"]');
  const input = page.getByRole('combobox', { name: 'Search pages and actions', exact: true });
  await expect(setting).not.toBeChecked();
  await expect(page.locator('.menu-dock')).toBeHidden();
  await setting.check();
  await expect(button).toBeVisible();
  await footer.uncheck();
  await expect(page.locator('.menu-search-toggle')).toHaveCount(0);
  await expect(button).toBeVisible();
  await button.click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(setting).toBeChecked();
  await expect(footer).not.toBeChecked();
  await expect(button).toBeVisible();
  await page.locator('[data-menu-page="dashboard"]').click();
  await button.click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.goto(url + '/index.html#topschrank.components.search');
  await chooseDevice(page, 'mobile');
  await button.click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await setting.uncheck();
  await expect(button).toHaveCount(0);
  await expect(page.locator('.menu-dock')).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(setting).not.toBeChecked();
  await expect(button).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Search options use one compact row and wrap to the content width without changing the palette', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const options = page.locator('.example-search-options');
  const fields = options.locator('.example-search-controls > .ds-field');
  const limit = page.getByRole('spinbutton', { name: 'Maximum results', exact: true });
  await expect(page.locator('#search-link-metadata, a[href="#search-link-metadata"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Searchable links and anchors', exact: true })).toHaveCount(0);
  await expect(fields).toHaveCount(4);
  await expect(options.getByRole('heading', { name: 'Options', exact: true })).toHaveCSS('font-size', '14px');
  await expect(limit).toHaveCSS('height', '34px');
  await expect(limit).toHaveCSS('width', '140px');
  const desktop = await fields.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  for (const box of desktop) expect(Math.abs(box.y - desktop[0].y)).toBeLessThanOrEqual(1);
  expect((await options.boundingBox()).height).toBeLessThan(150);
  await page.getByRole('button', { name: 'Open Search', exact: true }).click();
  await expect(page.locator('#menu-search-panel input')).toHaveCSS('font-size', '28px');
  await page.keyboard.press('Escape');
  await chooseDevice(page, 'mobile');
  const preview = await fields.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  expect(Math.abs(preview[0].y - preview[1].y)).toBeLessThanOrEqual(1);
  expect(preview[2].y).toBeGreaterThanOrEqual(Math.max(preview[0].bottom, preview[1].bottom));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(limit).toHaveCSS('width', '140px');
    const bounds = await options.boundingBox();
    for (const box of await fields.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()))) {
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.right).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('Search maximum results applies across groups and queries and persists independently of compact mode', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const limit = page.getByRole('spinbutton', { name: 'Maximum results', exact: true });
  const dialog = page.locator('#menu-search-panel');
  const rows = dialog.locator('.ds-search-result');
  const input = page.getByRole('combobox', { name: 'Search pages and actions', exact: true });
  const opener = page.getByRole('button', { name: 'Open Search', exact: true });
  await expect(limit).toHaveValue('5');
  await expect(limit).toHaveAttribute('min', '1');
  await expect(limit).toHaveAttribute('max', '100');
  await expect(limit).toHaveAttribute('step', '1');
  await opener.click();
  await expect(rows).toHaveCount(5);
  await page.keyboard.press('Escape');
  await limit.fill('3');
  await opener.click();
  await expect(rows).toHaveCount(3);
  await expect(dialog.locator('.ds-search-status')).toHaveText('3 results');
  await input.fill('Colours');
  await expect(rows).toHaveCount(1);
  await expect(rows.locator('.ds-search-title')).toHaveText('Colours');
  await expect(rows.locator('.ds-search-category')).toHaveText('Theme');
  await expect(dialog.locator('.ds-search-group')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await limit.fill('15');
  await opener.click();
  await expect(rows).toHaveCount(15);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('design-system-workspace')).data.components.search.maxResults,
  )).toBe(15);
  await page.reload();
  await expect(limit).toHaveValue('15');
  await page.getByRole('switch', { name: 'Compact', exact: true }).check();
  await opener.click();
  await expect(dialog).toHaveClass(/is-compact/);
  await expect(rows).toHaveCount(15);
  await page.keyboard.press('Escape');
  await page.locator('[data-menu-page="dashboard"]').click();
  await page.keyboard.press('Control+k');
  await expect(rows).toHaveCount(15);
  await page.keyboard.press('Escape');
  await page.goto(url + '/index.html#topschrank.components.search');
  await expect(limit).toHaveValue('15');
  await limit.fill('1');
  await opener.click();
  await expect(rows).toHaveCount(1);
  await expect(dialog.locator('.ds-search-status')).toHaveText('1 result');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('Search maximum results rejects empty, fractional and out-of-range values without replacing the saved limit', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.search');
  const limit = page.getByRole('spinbutton', { name: 'Maximum results', exact: true });
  for (const value of ['', '0', '101', '1.5']) {
    await limit.fill(value);
    await limit.press('Tab');
    await expect(limit).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() =>
      JSON.parse(localStorage.getItem('design-system-workspace')).data.components.search.maxResults,
    )).toBe(5);
    await page.getByRole('button', { name: 'Open Search', exact: true }).click();
    await expect(page.locator('#menu-search-panel .ds-search-result')).toHaveCount(5);
    await page.keyboard.press('Escape');
  }
  await limit.fill('100');
  await limit.press('Tab');
  await expect(limit).not.toHaveAttribute('aria-invalid', 'true');
  await page.reload();
  await expect(limit).toHaveValue('100');
});

test('device popup uses live Light, Dark and Matrix tokens in expanded, collapsed and mobile navigation', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  const trigger = page.getByRole('combobox', { name: 'Preview device', exact: true });
  const popup = page.getByRole('listbox', { name: 'Preview device', exact: true });
  const surfaces = new Set();
  for (const theme of ['light', 'dark', 'matrix']) {
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption(theme);
    await trigger.click();
    await expect(popup).toBeVisible();
    const colours = await popup.evaluate(node => {
      const probe = document.createElement('span');
      probe.style.cssText = 'background:var(--ds-colour-panel);color:var(--ds-colour-text);border:1px solid var(--ds-colour-border)';
      node.append(probe);
      const expected = getComputedStyle(probe), actual = getComputedStyle(node);
      const result = { actual: [actual.backgroundColor, actual.color, actual.borderTopColor],
        expected: [expected.backgroundColor, expected.color, expected.borderTopColor] };
      probe.remove();
      return result;
    });
    expect(colours.actual).toEqual(colours.expected);
    surfaces.add(colours.actual[0]);
    await expect(popup.getByRole('option', { name: 'Desktop', exact: true })).toHaveAttribute('aria-selected', 'true');
    await trigger.press('Escape');
    await expect(popup).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  expect(surfaces.size).toBe(3);
  await page.locator('#menu-sidebar-toggle').click();
  await trigger.click();
  await expect(popup).toBeInViewport({ ratio: 1 });
  const anchor = await trigger.boundingBox(), bounds = await popup.boundingBox();
  expect(bounds.width).toBeGreaterThan(anchor.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(anchor.y);
  await page.getByRole('heading', { name: 'Theme switcher', exact: true }).click();
  await expect(popup).not.toBeVisible();
  await trigger.focus();
  await trigger.press('ArrowDown');
  await trigger.press('Enter');
  await expect(page.locator('#example-viewport')).toHaveAttribute('data-device', 'tablet');
  await chooseDevice(page, 'mobile');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await trigger.click();
  await expect(popup).toBeInViewport({ ratio: 1 });
  await popup.getByRole('option', { name: 'Desktop', exact: true }).click();
  await expect(page.locator('#example-viewport')).toHaveAttribute('data-device', 'desktop');
  await expect(popup).not.toBeVisible();
  expect(errors).toEqual([]);
});
