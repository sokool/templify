const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const Themes = require('../themes/themes.js');
const { themeConfiguration } = require('../export/project.cjs');
const { buildExport } = require('../scripts/export.cjs');
const root = path.resolve(__dirname, '../..');
let server, url, exported;

test.beforeAll(async () => {
  exported = fs.mkdtempSync(path.join(process.env.TMPDIR || require('node:os').tmpdir(), 'templify-corners-'));
  const themes = Themes.create({ target: { dataset: {}, style: { setProperty() {}, removeProperty() {} } } });
  themes.setCorners('light', {
    profiles: { small: 3, large: 20, xlarge: 28 },
    assignments: { buttons: 'none', controls: 'small', popups: 'small', badges: 'pill' },
  });
  await buildExport({
    outdir: exported,
    components: ['theme-switcher', 'buttons', 'badges', 'card', 'form', 'window', 'surface', 'autocomplete', 'list', 'user-identity', 'timeline'],
    theme: themeConfiguration(themes),
  });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const preview = pathname.startsWith('/preview/');
    const base = preview ? exported : root;
    const file = path.resolve(base, (preview ? pathname.slice(9) : pathname.slice(1)) || 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {
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
  if (exported) fs.rmSync(exported, { recursive: true, force: true });
});

async function assign(page, group, profile) {
  await page.getByRole('combobox', { name: group + ' profile', exact: true }).click();
  await page.getByRole('option', { name: profile, exact: true }).click();
}

test('Corners is reachable from Theme and live edits persist independently for each profile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#templify.theme');
  await page.getByRole('link', { name: 'Corners →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Corners', exact: true })).toBeVisible();
  const large = page.getByRole('slider', { name: 'Large radius', exact: true });
  const small = page.getByRole('slider', { name: 'Small radius', exact: true });
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  const preview = page.locator('.corners-preview');
  await large.fill('20');
  await expect(preview.getByRole('button', { name: 'Continue', exact: true })).toHaveCSS('border-radius', '20px');
  await expect(preview.locator('.ds-card')).toHaveCSS('border-radius', '20px');
  await assign(page, 'Form controls', 'Small');
  await small.fill('7');
  await expect(preview.getByRole('textbox', { name: 'Form control', exact: true })).toHaveCSS('border-radius', '7px');
  await select.selectOption('dark');
  await expect(large).toHaveValue('12');
  await expect(small).toHaveValue('4');
  await expect(preview.getByRole('textbox')).toHaveCSS('border-radius', '12px');
  await large.fill('16');
  await select.selectOption('light');
  await expect(large).toHaveValue('20');
  await expect(preview.getByRole('textbox')).toHaveCSS('border-radius', '7px');
  await page.reload();
  await expect(large).toHaveValue('20');
  await expect(preview.getByRole('textbox')).toHaveCSS('border-radius', '7px');
  await select.selectOption('dark');
  await expect(large).toHaveValue('16');
  await page.goto(url + '/index.html#topschrank.tools.shadows');
  await expect(page.getByRole('heading', { name: 'Shadow profiles' })).toBeVisible();
  await page.goto(url + '/index.html#templify.theme.corners');
  await expect(large).toHaveValue('16');
  expect(errors).toEqual([]);
});

test('individual and section resets preserve other choices; square and pill profiles do not distort authoring controls', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#templify.theme.corners');
  const preview = page.locator('.corners-preview');
  await page.getByRole('slider', { name: 'Large radius', exact: true }).fill('20');
  await assign(page, 'Buttons', 'None');
  await expect(preview.getByRole('button', { name: 'Continue', exact: true })).toHaveCSS('border-radius', '0px');
  await expect(page.getByRole('button', { name: 'Reset all corners', exact: true })).toHaveCSS('border-radius', '8px');
  await page.getByRole('button', { name: 'Reset buttons', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Continue', exact: true })).toHaveCSS('border-radius', '20px');
  await assign(page, 'Form controls', 'Small');
  await page.getByRole('slider', { name: 'Small radius', exact: true }).fill('6');
  await page.getByRole('button', { name: 'Reset large radius', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Continue', exact: true })).toHaveCSS('border-radius', '12px');
  await expect(preview.getByRole('textbox')).toHaveCSS('border-radius', '6px');
  await page.getByRole('slider', { name: 'Medium radius', exact: true }).fill('0');
  await expect(preview.locator('.ds-card-menu')).toHaveCSS('border-radius', '0px');
  await expect(preview.locator('.ds-card-menu button')).toHaveCSS('border-radius', '0px');
  await assign(page, 'Badges & chips', 'Pill');
  await expect(page.locator('[data-corner-group="badges"] .corners-group-sample')).toHaveCSS('border-radius', '9999px');
  await page.getByRole('button', { name: 'Reset all corners', exact: true }).click();
  await expect(preview.getByRole('textbox')).toHaveCSS('border-radius', '12px');
  await expect(preview.locator('.ds-card-menu')).toHaveCSS('border-radius', '8px');
  await expect(page.getByRole('slider', { name: 'Small radius', exact: true })).toHaveValue('4');
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Corners', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const fits = await page.locator('.corners-tool').evaluate(element =>
      element.scrollWidth <= element.clientWidth + 1);
    expect(fits).toBe(true);
  }
});

test('standalone exports retain group assignments, local overrides, flush edges and immutable shapes without the editor', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/preview/index.html');
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'corner-probes';
    host.innerHTML = `
      <button class="ds-button" data-variant="split">Split</button>
      <div class="ds-field"><input class="ds-field-control"></div>
      <article class="ds-card">Card</article>
      <div class="ds-surface">Surface</div>
      <div class="ds-list-frame">List</div>
      <div class="ds-card-menu"><button>Item</button></div>
      <span class="ds-badge">Badge</span>
      <div class="ds-autocomplete"><div class="ds-ac-popup">Popup</div><span class="ds-ac-chip">Chip</span></div>
      <dialog class="ds-window" data-mode="side" data-side="right"></dialog>
      <div class="ds-field"><label class="ds-field-choice"><input type="radio"></label></div>
      <span class="ds-user-identity__avatar">AB</span>
      <div class="ds-timeline"><ol><li>Event</li></ol></div>`;
    document.body.append(host);
  });
  const probes = page.locator('#corner-probes');
  await expect(probes.locator('.ds-button')).toHaveCSS('border-radius', '0px');
  expect(await probes.locator('.ds-button').evaluate(element => getComputedStyle(element, '::after').borderRadius)).toBe('0px');
  await expect(probes.locator('.ds-field-control')).toHaveCSS('border-radius', '3px');
  for (const selector of ['.ds-card', '.ds-surface', '.ds-list-frame']) {
    await expect(probes.locator(selector)).toHaveCSS('border-radius', '20px');
  }
  await expect(probes.locator('.ds-card-menu')).toHaveCSS('border-radius', '3px');
  await expect(probes.locator('.ds-card-menu button')).toHaveCSS('border-radius', '0px');
  await expect(probes.locator('.ds-ac-popup')).toHaveCSS('border-radius', '3px');
  for (const selector of ['.ds-badge', '.ds-ac-chip']) {
    await expect(probes.locator(selector)).toHaveCSS('border-radius', '9999px');
  }
  const sideRadii = {
    right: '28px 0px 0px 28px',
    left: '0px 28px 28px 0px',
    top: '0px 0px 28px 28px',
    bottom: '28px 28px 0px 0px',
  };
  for (const [side, radius] of Object.entries(sideRadii)) {
    await probes.locator('.ds-window').evaluate((element, side) => { element.dataset.side = side; }, side);
    await expect(probes.locator('.ds-window')).toHaveCSS('border-radius', radius);
  }
  await expect(probes.locator('input[type="radio"]')).toHaveCSS('border-radius', '50%');
  await expect(probes.locator('.ds-user-identity__avatar')).toHaveCSS('border-radius', '12px');
  expect(await probes.locator('.ds-timeline li').evaluate(element =>
    getComputedStyle(element, '::before').borderRadius)).toBe('50%');
  await probes.locator('.ds-button').evaluate(element => element.style.setProperty('--ds-button-radius', '7px'));
  await expect(probes.locator('.ds-button')).toHaveCSS('border-radius', '7px');
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await expect(probes.locator('.ds-button')).toHaveCSS('border-radius', '7px');
  await expect(probes.locator('.ds-card')).toHaveCSS('border-radius', '12px');
  await expect(probes.locator('.ds-field-control')).toHaveCSS('border-radius', '12px');
  await expect(probes.locator('.ds-badge')).toHaveCSS('border-radius', '8px');
  expect(await page.evaluate(() => typeof DesignSystemCornersTool)).toBe('undefined');
  expect(errors).toEqual([]);
});
