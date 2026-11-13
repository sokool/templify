const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { buildExport } = require('../scripts/export.cjs');
const root = path.resolve(__dirname, '../..');
let server, url, exported;
test.beforeAll(async () => {
  exported = fs.mkdtempSync(path.join(process.env.TMPDIR || require('node:os').tmpdir(), 'templify-theme-'));
  await buildExport({ outdir: exported, components: ['theme-switcher'] });
  await buildExport({ outdir: path.join(exported, 'commands'), components: ['theme-switcher', 'search', 'shortcuts'], theme: null });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const preview = pathname.startsWith('/preview/');
    const base = preview ? exported : root;
    const file = path.resolve(base, (preview ? pathname.slice(9) : pathname.slice(1)) || 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (exported) fs.rmSync(exported, { recursive: true, force: true });
});

test('workspace switchers share and restore complete Theme profiles', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.fonts');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await select.selectOption('light');
  await page.getByRole('button', { name: 'Use Inter', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
  await select.selectOption('dark');
  await expect(page.getByRole('button', { name: 'Use Manrope', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await select.selectOption('light');
  await expect(page.getByRole('button', { name: 'Use Inter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(url + '/index.html#topschrank.iconsandglyphs');
  await page.getByRole('slider', { name: 'Icon size', exact: true }).fill('28');
  await page.getByRole('slider', { name: 'Icon stroke weight', exact: true }).fill('2.5');
  await expect(page.locator('html')).toHaveCSS('--ds-icon-size', '28px');
  await select.selectOption('dark');
  await expect(page.getByRole('slider', { name: 'Icon size', exact: true })).toHaveValue('20');
  await expect(page.locator('html')).toHaveCSS('--ds-icon-stroke', '1.75');
  await select.selectOption('light');
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Icon size', exact: true })).toHaveValue('28');
  await expect(page.getByRole('slider', { name: 'Icon stroke weight', exact: true })).toHaveValue('2.5');
  await page.getByRole('button', { name: /^Theme: Light/ }).click();
  await expect(select).toHaveValue('dark');
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  await select.selectOption('matrix');
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'matrix');
  expect(errors).toEqual([]);
});

test('workspace can disconnect and restore the menu footer switcher without changing page selectors', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  const setting = page.getByRole('switch', { name: 'Show in menu footer', exact: true });
  const footer = page.locator('.menu-utilities [data-theme-next]');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(setting).toBeChecked();
  await expect(footer).toHaveCount(1);
  await select.selectOption('dark');
  await page.evaluate(() => {
    window.detachedThemeButton = document.querySelector('.menu-utilities [data-theme-next]');
  });
  await setting.uncheck();
  await expect(footer).toHaveCount(0);
  await expect(page.locator('.menu-utilities .menu-utility')).toHaveCount(2);
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'dark');
  await page.evaluate(() => window.detachedThemeButton.click());
  await expect(select).toHaveValue('dark');
  await select.selectOption('matrix');
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('design-system-workspace')).data.components['theme-switcher'].menuFooter,
  )).toBe(false);

  await page.locator('[data-menu-page="dashboard"]').click();
  await expect(footer).toHaveCount(0);
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  await expect(setting).not.toBeChecked();
  await expect(footer).toHaveCount(0);
  await expect(select).toHaveValue('matrix');
  await setting.check();
  await expect(footer).toHaveCount(1);
  await expect(footer).toHaveAttribute('aria-label', /^Theme: Matrix/);
  await footer.click();
  await expect(select).toHaveValue('light');
  for (let i = 0; i < 2; i++) {
    await setting.uncheck();
    await expect(footer).toHaveCount(0);
    await setting.check();
    await expect(footer).toHaveCount(1);
  }
  await footer.click();
  await expect(select).toHaveValue('dark');
  await page.reload();
  await expect(setting).toBeChecked();
  await expect(footer).toHaveCount(1);
  await expect(select).toHaveValue('dark');
  expect(errors).toEqual([]);
});

test('menu footer preference applies in collapsed and mobile navigation', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  const setting = page.getByRole('switch', { name: 'Show in menu footer', exact: true });
  const footer = page.locator('.menu-utilities [data-theme-next]');
  await page.locator('#menu-sidebar-toggle').click();
  await expect(page.locator('#menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await setting.uncheck();
  await expect(footer).toHaveCount(0);
  await setting.check();
  await expect(footer).toBeVisible();
  await footer.click();
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'dark');
  await page.getByRole('combobox', { name: 'Preview device', exact: true }).click();
  await page.getByRole('listbox', { name: 'Preview device', exact: true }).getByRole('option', { name: 'Mobile', exact: true }).click();
  await expect(page.locator('#example-viewport')).toHaveAttribute('data-device', 'mobile');
  await setting.uncheck();
  await expect(footer).toHaveCount(0);
  await setting.check();
  await expect(footer).toHaveCount(1);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await footer.click();
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'matrix');
});

test('workspace shortcut editor shares persisted bindings with Shortcuts and Search without requiring a footer button', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.themeswitcher');
  const recorder = page.locator('[data-shortcut-id="theme-switcher.nextTheme"] input');
  const theme = page.locator('html');
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + L');
  await expect(page.locator('.example-page [data-shortcut-id]')).toHaveCount(1);
  await recorder.press('Control+Shift+j');
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + J');
  await expect(theme).toHaveAttribute('data-ds-theme', 'light');
  await page.reload();
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + J');
  await page.getByRole('switch', { name: 'Show in menu footer', exact: true }).uncheck();
  await page.locator('[data-menu-group="components"]').click();
  await page.locator('[data-menu-page="shortcuts"]').click();
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + J');
  await page.locator('[data-menu-page="dashboard"]').click();
  await page.keyboard.press('Control+Shift+j');
  await expect(theme).toHaveAttribute('data-ds-theme', 'dark');
  await page.keyboard.press('Meta+Shift+l');
  await expect(theme).toHaveAttribute('data-ds-theme', 'matrix');
  await expect(page.locator('.menu-utilities [data-theme-next]')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  const search = page.locator('#menu-search-panel input');
  await expect(search).toBeFocused();
  await search.fill('Next theme');
  await expect(page.locator('.ds-search-result')).toHaveCount(0);
  await search.fill('Theme: Light');
  await expect(page.locator('.ds-search-title')).toHaveText('Theme: Light');
  await page.keyboard.press('Enter');
  await expect(theme).toHaveAttribute('data-ds-theme', 'light');
  await page.locator('[data-menu-page="theme-switcher"]').click();
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + J');
  await recorder.press('Backspace');
  await expect(recorder).toHaveValue('Not set');
  await page.locator('[data-menu-page="dashboard"]').click();
  await page.keyboard.press('Control+Shift+l');
  await expect(theme).toHaveAttribute('data-ds-theme', 'light');
  await page.keyboard.press('Control+k');
  await search.fill('Theme: Dark');
  await page.locator('.ds-search-result').click();
  await expect(theme).toHaveAttribute('data-ds-theme', 'dark');
  await page.reload();
  await page.keyboard.press('Control+Shift+l');
  await expect(theme).toHaveAttribute('data-ds-theme', 'matrix');
  await page.keyboard.press('Control+k');
  await search.fill('motyw light');
  await page.keyboard.press('Enter');
  await expect(theme).toHaveAttribute('data-ds-theme', 'light');
  await page.locator('[data-menu-page="theme-switcher"]').click();
  await expect(recorder).toHaveValue('Not set');
  await page.locator('[data-shortcut-id="theme-switcher.nextTheme"] button').click();
  await expect(recorder).toHaveValue('⌘ / Ctrl + Shift + L');
  expect(errors).toEqual([]);
});

test('standalone shortcut works without an editor, follows HTML defaults and does not override saved preferences', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/index.html');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await page.keyboard.press('Control+Shift+l');
  await expect(select).toHaveValue('dark');
  await page.evaluate(() => { document.querySelector('[data-ui="theme-switcher"]').dataset.themeShortcut = 'Alt+T'; });
  await expect(select).toHaveAttribute('aria-keyshortcuts', 'Alt+T');
  await page.keyboard.press('Control+Shift+l');
  await expect(select).toHaveValue('dark');
  await page.keyboard.press('Alt+t');
  await expect(select).toHaveValue('matrix');
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="theme-switcher"]');
    Templify.get(host).shortcuts.set('theme-switcher.nextTheme', 'Mod+J');
    host.dataset.themeShortcut = 'Mod+P';
  });
  await expect(select).toHaveAttribute('aria-keyshortcuts', 'Control+J Meta+J');
  await page.keyboard.press('Meta+j');
  await expect(select).toHaveValue('light');
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="theme-switcher"]');
    Templify.get(host).shortcuts.reset('theme-switcher.nextTheme');
  });
  await expect(select).toHaveAttribute('aria-keyshortcuts', 'Control+P Meta+P');
  await page.evaluate(() => { document.querySelector('[data-ui="theme-switcher"]').dataset.themeShortcut = ''; });
  await expect(select).not.toHaveAttribute('aria-keyshortcuts');
  await page.keyboard.press('Control+p');
  await expect(select).toHaveValue('light');
  expect(errors).toEqual([]);
});

test('exported Search lists exact themes, shares actions across switchers and releases the last owner', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/commands/index.html');
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="theme-switcher"]'), copy = host.cloneNode(true);
    host.after(copy); Templify.init(copy); Templify.init(copy);
    window.themeChanges = 0;
    document.addEventListener('ui:theme-change', () => window.themeChanges++);
  });
  const controls = page.getByRole('combobox', { name: 'Theme', exact: true });
  const recorder = page.locator('[data-shortcut-id="theme-switcher.nextTheme"] input');
  await expect(recorder).toHaveCount(1);
  await page.keyboard.press('Control+Shift+l');
  await expect(controls.first()).toHaveValue('dark');
  await expect(controls.nth(1)).toHaveValue('dark');
  expect(await page.evaluate(() => window.themeChanges)).toBe(1);
  await recorder.press('Backspace');
  await page.getByRole('heading', { name: 'Templify components', exact: true }).click();
  await page.keyboard.press('Control+k');
  const search = page.locator('.ds-search-input');
  await search.fill('theme');
  await expect(page.locator('.ds-search-title').filter({ hasText: /^Theme: / })).toHaveText(['Theme: Light', 'Theme: Dark', 'Theme: Matrix']);
  await search.fill('Theme: Matrix');
  await expect(page.locator('.ds-search-title')).toHaveText('Theme: Matrix');
  await page.keyboard.press('Enter');
  await expect(controls.first()).toHaveValue('matrix');
  expect(await page.evaluate(() => window.themeChanges)).toBe(2);
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="theme-switcher"]');
    host.dispatchEvent(new CustomEvent('htmx:beforeCleanupElement', { bubbles: true, detail: { elt: host } }));
    host.remove();
  });
  await expect(recorder).toHaveCount(1);
  await page.keyboard.press('Control+k');
  await search.fill('Theme: Light');
  await page.keyboard.press('Enter');
  await expect(controls).toHaveValue('light');
  expect(await page.evaluate(() => window.themeChanges)).toBe(3);
  await page.evaluate(() => {
    const host = document.querySelector('[data-ui="theme-switcher"]');
    host.querySelector('select').replaceChildren(new Option('Light', 'light'));
  });
  await page.keyboard.press('Control+k');
  await search.fill('Theme: Dark');
  await expect(page.locator('.ds-search-result')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => Templify.destroy(document.querySelector('[data-ui="theme-switcher"]')));
  await expect(recorder).toHaveCount(0);
  expect(await page.evaluate(() => Templify.get(document.querySelector('[data-ui="search"]')).shortcuts.get('theme-switcher.nextTheme'))).toBeNull();
  expect(errors).toEqual([]);
});

test('standalone export synchronises instances and cleans up through HTMX lifecycle', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/index.html');
  await page.evaluate(() => {
    const first = document.querySelector('[data-ui="theme-switcher"]');
    const copy = first.cloneNode(true); first.after(copy);
    Templify.init(copy); Templify.init(copy);
    window.themeChanges = 0;
    document.addEventListener('ui:theme-change', () => window.themeChanges++);
  });
  const controls = page.getByRole('combobox', { name: 'Theme', exact: true });
  await controls.first().selectOption('dark');
  await expect(controls.nth(1)).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme-base', 'dark');
  expect(await page.evaluate(() => window.themeChanges)).toBe(1);
  await page.evaluate(() => {
    const copy = document.querySelectorAll('[data-ui="theme-switcher"]')[1];
    copy.dispatchEvent(new CustomEvent('htmx:beforeCleanupElement', { bubbles: true, detail: { elt: copy } }));
    const select = copy.querySelector('select'); select.value = 'matrix'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'dark');
  await controls.first().selectOption('light');
  await expect(controls.nth(1)).toHaveValue('matrix');
  expect(errors).toEqual([]);
});

test('Search follows custom theme options, renames and removals while open', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/commands/index.html');
  await page.keyboard.press('Control+k');
  const search = page.locator('.ds-search-input');
  await search.fill('Ocean');
  await expect(page.locator('.ds-search-result')).toHaveCount(0);
  await page.evaluate(() => {
    const option = new Option('Ocean UI', 'ocean');
    option.dataset.themeBase = 'dark';
    document.querySelector('[data-theme-select]').append(option);
  });
  await expect(page.locator('.ds-search-title')).toHaveText('Theme: Ocean UI');
  await page.locator('.ds-search-result').click();
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'ocean');
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme-base', 'dark');
  await page.keyboard.press('Control+k');
  await search.fill('Ocean');
  await page.evaluate(() => { document.querySelector('option[value=ocean]').label = 'Blue Ocean'; });
  await expect(page.locator('.ds-search-title')).toHaveText('Theme: Blue Ocean');
  await page.evaluate(() => { document.querySelector('option[value=ocean]').remove(); });
  await expect(page.locator('.ds-search-result')).toHaveCount(0);
  await search.fill('Next theme');
  await expect(page.locator('.ds-search-result')).toHaveCount(0);
  expect(errors).toEqual([]);
});
