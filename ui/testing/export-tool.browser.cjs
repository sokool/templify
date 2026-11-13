const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { unzipSync, strFromU8 } = require('fflate');
const { compileProject } = require('../export/project.cjs');
const { loadProject } = require('../scripts/export-sources.cjs');
const { defaultThemeConfiguration } = require('../scripts/export.cjs');
const Themes = require('../themes/themes.js');
const root = path.resolve(__dirname, '../..');
let directory, server, url;

test.beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-tool-browser-'));
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const preview = pathname.startsWith('/preview/');
    const base = preview ? directory : root;
    const relative = preview ? pathname.slice('/preview/'.length) : pathname.slice(1);
    const file = path.resolve(base, relative || 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

test('Tools Export downloads a working ZIP built by the shared compiler', async ({ page, context }) => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(url + '/index.html#topschrank.tools.export');
  await expect(page.locator('.export-tool input[type="checkbox"]')).toHaveCount(23);
  await expect(page.locator('.export-tool-summary')).toContainText('23 selected');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download ZIP', exact: true })).toBeDisabled();
  await page.locator('[data-export-component="window"]').check();
  await page.locator('[data-export-component="tabs"]').check();
  const dependency = page.locator('[data-export-component="buttons"]');
  await expect(dependency).toBeChecked();
  await expect(dependency).toBeDisabled();
  await expect(page.locator('.export-tool-summary')).toContainText('2 selected · 1 automatically required · 3 components');
  await expect(page.locator('#export-required-buttons')).toContainText('window');
  expect(requests.some(request => request.endsWith('/esbuild.wasm'))).toBe(false);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('templify-components.zip');
  const bytes = fs.readFileSync(await download.path());
  const archive = unzipSync(bytes);
  const native = await compileProject(loadProject(), ['window', 'tabs'], require('esbuild').build, {
    theme: defaultThemeConfiguration(),
  });
  expect(Object.keys(archive).sort()).toEqual(Object.keys(native.files).sort());
  for (const [name, content] of Object.entries(native.files)) {
    const expected = Buffer.from(content);
    if (name === 'ui.css') {
      const marker = '/* Configured Templify themes. */';
      expect(strFromU8(archive[name]).split(marker)[0]).toBe(Buffer.from(content).toString().split(marker)[0]);
    } else {
      expect(Buffer.from(archive[name]).equals(expected), name + ' matches CLI').toBe(true);
    }
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, archive[name]);
  }
  expect(strFromU8(archive['components/window.html'])).toContain('Component: Window');
  expect(strFromU8(archive['ui.js'])).not.toContain('esbuild-wasm');
  expect(strFromU8(archive['ui.js'])).not.toContain('DesignSystemExportTool');
  await expect(page.locator('.export-tool-progress')).toContainText('ZIP ready');
  const preview = await context.newPage();
  await preview.goto(url + '/preview/index.html');
  await expect(preview.locator('.export-example')).toHaveCount(3);
  await preview.locator('#tabs-details').click();
  await expect(preview.locator('#tabs-details-panel')).toBeVisible();
  await preview.locator('[data-ui-open="window-preview"]').click();
  await expect(preview.locator('#window-preview')).toBeVisible();
  expect(errors).toEqual([]);
  await preview.close();
});

test('Tools Export snapshots custom colours, typography, icons, shadows and every theme', async ({ page, context }) => {
  const target = { dataset: {}, style: { setProperty() {}, removeProperty() {} } };
  const themes = Themes.create({ target });
  const ocean = themes.add('Ocean UI', 'dark');
  themes.setColour(ocean, 'page', '#081018');
  themes.setColour(ocean, 'panel', '#102030');
  themes.setAppearance(ocean, { fontFamily: 'Inter', iconSize: 29, iconStroke: 2.5 });
  themes.setShadow(ocean, 'soft', { blur: 33 });
  themes.setComponentSettings(ocean, 'card', {
    css: { '--ds-card-background': 'var(--ds-colour-panel)' },
  });
  const stored = {
    schema: 'design-system-workspace',
    version: 2,
    data: { tokens: themes.getTokens(), layout: { theme: ocean } },
  };
  await page.addInitScript(value => localStorage.setItem('design-system-workspace', JSON.stringify(value)), stored);
  await page.goto(url + '/index.html#topschrank.tools.export');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const files = unzipSync(fs.readFileSync(await (await downloadEvent).path()));
  const css = strFromU8(files['ui.css']), html = strFromU8(files['index.html']);
  expect(css).toContain(`[data-ds-theme="${ocean}"]`);
  expect(css).toMatch(/#102030/i);
  expect(css).toContain('--ds-font-family: "Inter", system-ui, sans-serif');
  expect(css).toContain('--ds-icon-size: 29px');
  expect(css).toContain('--ds-icon-stroke: 2.5');
  expect(css).toMatch(/--ds-shadow-soft:[^;]*33px/);
  expect(css).toContain('--ds-card-background: var(--ds-colour-panel)');
  expect(css).toContain('fonts.googleapis.com/css2?family=Manrope');
  expect(css).toContain('family=Inter');
  expect(html).toContain(`data-ds-theme="${ocean}"`);
  expect(html).toContain('data-ds-theme-base="dark"');
  expect(strFromU8(files['ui.js'])).toContain('Ocean UI');
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(directory, 'custom-theme', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  const preview = await context.newPage();
  await preview.goto(url + '/preview/custom-theme/index.html');
  const switcher = preview.locator('#example-theme-switcher [data-theme-select]');
  await expect(switcher.locator('option')).toHaveCount(4);
  await expect(switcher).toHaveValue(ocean);
  await expect(switcher.locator(`option[value="${ocean}"]`)).toHaveText('Ocean UI');
  await expect(preview.locator('body')).toHaveCSS('background-color', 'rgb(8, 16, 24)');
  await switcher.selectOption('light');
  await expect(preview.locator('html')).toHaveAttribute('data-ds-theme', 'light');
  await expect(preview.locator('body')).toHaveCSS('background-color', 'rgb(243, 246, 250)');
  await switcher.selectOption(ocean);
  await expect(preview.locator('body')).toHaveCSS('background-color', 'rgb(8, 16, 24)');
  await preview.close();
});

test('default selection exports all components, without authoring or compiler files', async ({ page }) => {
  await page.goto(url + '/index.html#topschrank.tools.export');
  const submit = page.getByRole('button', { name: 'Download ZIP', exact: true });
  await expect(submit).toBeEnabled();
  const downloadEvent = page.waitForEvent('download');
  await submit.click();
  const download = await downloadEvent;
  const files = unzipSync(fs.readFileSync(await download.path()));
  expect(Object.keys(files).filter(file => file.startsWith('components/'))).toHaveLength(23);
  for (const name of Object.keys(files).filter(file => file.startsWith('components/'))) {
    const comment = strFromU8(files[name]).match(/^<!--([\s\S]*?)-->/);
    expect(comment, name + ' documentation').not.toBeNull();
    expect(comment[1]).toMatch(/Component: [\s\S]+Purpose: [\s\S]+Elements: [\s\S]+JavaScript behavior: /);
  }
  expect(Object.keys(files).some(file => /configurator|wasm|sources\.json|workspace|tools\//.test(file))).toBe(false);
  expect(strFromU8(files['index.html']).match(/class="export-example"/g)).toHaveLength(23);
  expect(strFromU8(files['ui.css'])).toContain('Configured Templify themes');
  expect(strFromU8(files['ui.css'])).toContain('[data-ds-theme="dark"]');
  expect(strFromU8(files['ui.css'])).toContain('--ds-icon-stroke: 1.75');
  expect(strFromU8(files['ui.css'])).toContain('--ds-shadow-soft:');
  expect(strFromU8(files['ui.css'])).toContain('fonts.googleapis.com/css2?family=Manrope');
  expect(files['licenses/icons.txt']).toBeTruthy();
  await expect(page.locator('.export-tool-progress')).toContainText('ZIP ready · 23 components');
});

test('failed compiler download can be retried without reloading the application', async ({ page }) => {
  await page.route('**/export/dist/esbuild.wasm', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(url + '/index.html#topschrank.tools.export');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  await expect(page.locator('.export-tool-error')).toContainText('Export failed');
  await page.unroute('**/export/dist/esbuild.wasm');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await downloadEvent;
  await expect(page.locator('.export-tool-progress')).toContainText('ZIP ready');
});

test('source download failure offers retry and tool navigation disposes the old view', async ({ page }) => {
  await page.route('**/export/dist/sources.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(url + '/index.html#topschrank.tools.export');
  await expect(page.locator('.export-tool-error')).toContainText('HTTP 503');
  await expect(page.getByRole('button', { name: 'Download ZIP', exact: true })).toBeDisabled();
  await page.unroute('**/export/dist/sources.json');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.export-tool input[type="checkbox"]')).toHaveCount(23);
  await expect(page.locator('.export-tool-error')).toBeHidden();
  await page.evaluate(() => { location.hash = '#topschrank.tools'; });
  await expect(page.locator('.export-tool')).toHaveCount(0);
  await page.getByRole('link', { name: 'Export →', exact: true }).click();
  await expect(page.locator('.export-tool')).toHaveCount(1);
  await expect(page.locator('.export-tool input[type="checkbox"]')).toHaveCount(23);
});

test('Export can be reached through the Tools submenu', async ({ page }) => {
  await page.goto(url + '/index.html');
  const tools = page.locator('[data-menu-group="tools"]');
  await tools.click();
  await page.locator('[data-menu-page="export"]').click();
  await expect(page.locator('main.example-page')).toHaveAttribute('id', 'topschrank.tools.export');
  await expect(page.locator('.export-tool input[type="checkbox"]')).toHaveCount(23);
});

test('package contents background and text follow Light, Dark and Matrix themes', async ({ page }) => {
  await page.goto(url + '/index.html#topschrank.tools.export');
  await expect(page.locator('.export-tool input[type="checkbox"]')).toHaveCount(23);
  for (const theme of ['light', 'dark', 'matrix']) {
    await expect(page.locator('html')).toHaveAttribute('data-ds-theme', theme);
    const colours = await page.locator('.export-tool-contents').evaluate(element => {
      const actual = getComputedStyle(element), tokens = getComputedStyle(document.documentElement);
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--ds-colour-panel)';
      probe.style.color = 'var(--ds-colour-text)';
      document.body.append(probe);
      const expected = getComputedStyle(probe);
      const result = {
        background: actual.backgroundColor, expectedBackground: expected.backgroundColor,
        text: actual.color, expectedText: expected.color,
        contrast: PaletteGenerator.contrast(tokens.getPropertyValue('--ds-colour-text').trim(), tokens.getPropertyValue('--ds-colour-panel').trim()).ratio,
      };
      probe.remove();
      return result;
    });
    expect(colours.background).toBe(colours.expectedBackground);
    expect(colours.text).toBe(colours.expectedText);
    expect(colours.contrast).toBeGreaterThanOrEqual(4.5);
    if (theme !== 'matrix') await page.getByRole('button', { name: /^Theme:/ }).click();
  }
});
