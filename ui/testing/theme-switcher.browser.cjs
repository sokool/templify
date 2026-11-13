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
