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

const preview = page => page.locator('[data-window-demo-preview]');
const demo = page => page.locator('.window-demo');
async function choose(page, name, value) {
  await demo(page).getByRole('combobox', { name, exact: true }).click();
  await demo(page).getByRole('option', { name: value, exact: true }).click();
}
async function number(page, name, value) {
  const control = demo(page).getByRole('spinbutton', { name, exact: true });
  await control.fill(String(value));
  await control.press('Tab');
}
async function start(page) {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.window');
  await expect(preview(page)).toHaveCount(1);
  await expect(preview(page)).toBeHidden();
  await number(page, 'Animation duration', 0);
}
const settings = page => page.evaluate(() => JSON.parse(localStorage.getItem('design-system-workspace')).data);

test('compact playground exposes layout, size, behaviour and a single open action', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await expect(demo(page).getByRole('combobox', { name: 'Side', exact: true })).toBeDisabled();
  await expect(demo(page).getByRole('spinbutton', { name: /^(Width|Height)$/ })).toHaveCount(0);
  await expect(page.locator('#window-demo-size option')).toHaveText(['Auto', 'XS', 'S', 'M', 'L', 'XL']);
  await expect(demo(page).getByRole('group')).toHaveCount(2);
  await expect(demo(page).getByRole('group', { name: 'Content and focus' })).toHaveCount(0);
  await expect(demo(page).getByRole('complementary')).toHaveCount(0);
  await expect(demo(page).getByRole('log')).toHaveCount(0);
  await expect(demo(page).getByRole('heading', { name: 'Scenarios' })).toHaveCount(0);
  await expect(demo(page).locator('.example-actions').getByRole('button')).toHaveText(['Open window']);
  for (const name of ['Close window', 'Close immediately', 'Reset demo']) {
    await expect(demo(page).getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  for (const [layout, mode, side, blocking] of [
    ['Side panel', 'side', 'left', true],
    ['Side panel', 'side', 'right', true],
    ['Side panel', 'side', 'top', true],
    ['Side panel', 'side', 'bottom', true],
    ['Modal popup', 'modal', 'right', false],
    ['Modal popup', 'modal', 'right', true],
  ]) {
    await choose(page, 'Layout', layout);
    if (mode === 'side') await choose(page, 'Side', side[0].toUpperCase() + side.slice(1));
    await choose(page, 'Size', 'M');
    await demo(page).getByRole('switch', { name: 'Block background', exact: true }).setChecked(blocking);
    if (mode === 'side') await expect(demo(page).getByRole('combobox', { name: 'Side', exact: true })).toBeEnabled();
    else await expect(demo(page).getByRole('combobox', { name: 'Side', exact: true })).toBeDisabled();
    await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
    await expect(preview(page)).toBeVisible();
    await expect(demo(page).getByRole('button', { name: 'Open window', exact: true })).toBeDisabled();
    await expect(preview(page)).toHaveAttribute('data-mode', mode);
    if (mode === 'side') await expect(preview(page)).toHaveAttribute('data-side', side);
    expect(await preview(page).evaluate(node => node.matches(':modal'))).toBe(blocking);
    if (mode === 'side') {
      if (['top', 'bottom'].includes(side)) {
        await expect(preview(page)).toHaveCSS('width', '1280px');
        await expect(preview(page)).toHaveCSS('height', '480px');
      } else await expect(preview(page)).toHaveCSS('height', '720px');
    }
    await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(preview(page)).toBeHidden();
    await expect(preview(page)).toHaveJSProperty('returnValue', 'cancel');
  }
  for (const [label, value, width] of [
    ['Auto', 'auto', null], ['XS', 'xs', 320], ['S', 'sm', 400],
    ['M', 'md', 480], ['L', 'lg', 640], ['XL', 'xl', 800],
  ]) {
    await choose(page, 'Size', label);
    await expect(preview(page)).toHaveAttribute('data-size', value);
    await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
    if (width) await expect(preview(page)).toHaveCSS('width', width + 'px');
    else await expect(preview(page)).toHaveCSS('--ds-window-width', 'fit-content');
    await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await expect(demo(page).getByRole('button', { name: 'Open window', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('blocking demo remains escapable with every dismissal option disabled', async ({ page }) => {
  await start(page);
  for (const name of ['Close on Escape', 'Close on backdrop', 'Show close button']) {
    await demo(page).getByRole('switch', { name, exact: true }).uncheck();
  }
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(preview(page).getByRole('heading', { name: 'Project details' })).toBeVisible();
  await expect(preview(page).locator('.window-demo-safety')).toHaveCount(0);
  await expect(preview(page).getByRole('button', { name: /^Close demo/ })).toHaveCount(0);
  await expect(preview(page).locator('.ds-window-close')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(preview(page)).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(preview(page)).toBeVisible();
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(preview(page)).toBeHidden();
  await expect(preview(page)).toHaveJSProperty('returnValue', 'cancel');
  await expect(demo(page).getByRole('button', { name: 'Open window', exact: true })).toBeFocused();
});

test('sample project composes real components and keeps checklist and notes alive', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(preview(page).locator('.ds-user-identity')).toContainText('Anna Kowalska');
  await expect(preview(page).locator('.ds-badge')).toHaveText('In progress');
  await expect(preview(page).getByRole('progressbar', { name: 'Ready for production' })).toHaveJSProperty('value', 1);
  await preview(page).getByRole('checkbox', { name: 'Materials selected', exact: true }).check();
  await preview(page).getByRole('checkbox', { name: 'Drawings ready', exact: true }).check();
  await expect(preview(page).getByRole('progressbar', { name: 'Ready for production' })).toHaveJSProperty('value', 3);
  await expect(preview(page).locator('.ds-badge')).toHaveText('Ready for production');
  await preview(page).getByRole('textbox', { name: 'Project note', exact: true }).fill('Oak veneer, matte finish');
  await preview(page).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(preview(page).locator('.ds-notification[role="status"]')).toContainText('Changes saved');
  await expect(preview(page).getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await choose(page, 'Layout', 'Side panel');
  await choose(page, 'Side', 'Bottom');
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(preview(page).getByRole('textbox', { name: 'Project note', exact: true })).toHaveValue('Oak veneer, matte finish');
  await expect(preview(page).getByRole('checkbox', { name: 'Drawings ready', exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});

test('live nonblocking updates preserve form values and do not change shared settings', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await start(page);
  const before = (await settings(page)).components.window;
  await demo(page).getByRole('switch', { name: 'Block background', exact: true }).uncheck();
  await choose(page, 'Layout', 'Side panel');
  await choose(page, 'Size', 'XS');
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  const note = preview(page).getByRole('textbox', { name: 'Project note', exact: true });
  await note.fill('Preserve this note');
  await demo(page).getByRole('switch', { name: 'Resizable', exact: true }).uncheck();
  await expect(preview(page).locator('.ds-window-resize')).toBeHidden();
  await choose(page, 'Size', 'S');
  await expect(preview(page)).toHaveCSS('width', '400px');
  await expect(note).toHaveValue('Preserve this note');
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(preview(page)).toBeHidden();
  await expect(preview(page)).toHaveJSProperty('returnValue', 'cancel');
  expect((await settings(page)).components.window).toEqual(before);
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(note).toHaveValue('Preserve this note');
  await demo(page).getByRole('switch', { name: 'Block background', exact: true }).check();
  expect(await preview(page).evaluate(node => node.matches(':modal'))).toBe(true);
  await expect(note).toHaveValue('Preserve this note');
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('manual pointer and keyboard resizing sync fields and per-preview persistence', async ({ page }) => {
  await start(page);
  await choose(page, 'Layout', 'Side panel');
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  const grip = preview(page).getByRole('button', { name: 'Resize window', exact: true });
  const box = await grip.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(preview(page)).toHaveCSS('width', '560px');
  await expect(demo(page).getByRole('combobox', { name: 'Size', exact: true })).toHaveText('Custom (resized)');
  await grip.focus();
  await grip.press('ArrowLeft');
  await grip.press('Shift+ArrowRight');
  await expect(preview(page)).toHaveCSS('width', '520px');
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  const saved = (await settings(page)).preview.windows;
  expect(saved.window.preview.size).toEqual({ width: 520, height: null });
  expect(saved.kanban).toBeUndefined();
  await page.reload();
  await expect(preview(page)).toHaveCSS('--ds-window-width', '520px');
  await expect(demo(page).getByRole('combobox', { name: 'Size', exact: true })).toHaveText('Custom (resized)');
  await choose(page, 'Size', 'M');
  await expect(preview(page)).toHaveCSS('--ds-window-width', '480px');
});

for (const side of ['Top', 'Bottom']) {
  test(`${side} panel resizes on its vertical inner edge`, async ({ page }) => {
    await start(page);
    await choose(page, 'Layout', 'Side panel');
    await choose(page, 'Side', side);
    await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
    const grip = preview(page).getByRole('button', { name: 'Resize window', exact: true });
    const box = await grip.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await expect(grip).toHaveCSS('cursor', 'ns-resize');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + (side === 'Top' ? 60 : -60), { steps: 3 });
    await page.mouse.up();
    await expect(preview(page)).toHaveCSS('height', '540px');
    await expect(preview(page)).toHaveCSS('width', '1280px');
    await expect(demo(page).getByRole('combobox', { name: 'Size', exact: true })).toHaveText('Custom (resized)');
    await grip.focus();
    await grip.press('ArrowUp');
    await expect(preview(page)).toHaveCSS('height', side === 'Top' ? '530px' : '550px');
    await grip.press('ArrowLeft');
    await expect(preview(page)).toHaveCSS('width', '1280px');
    await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  });
}

test('navigation cleans up dialogs and restores demo defaults', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await demo(page).getByRole('switch', { name: 'Block background', exact: true }).uncheck();
  await choose(page, 'Layout', 'Side panel');
  await choose(page, 'Size', 'XS');
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await preview(page).getByRole('textbox', { name: 'Project note', exact: true }).fill('Keep while mounted');
  await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(preview(page)).toBeHidden();
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(preview(page).getByRole('textbox', { name: 'Project note', exact: true })).toHaveValue('Keep while mounted');
  await demo(page).getByRole('switch', { name: 'Block background', exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await page.evaluate(() => { location.hash = '#topschrank.components.progress'; });
  await expect(demo(page)).toHaveCount(0);
  await expect(preview(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
  await page.evaluate(() => { location.hash = '#topschrank.components.window'; });
  await expect(preview(page)).toHaveCount(1);
  await expect(preview(page)).toBeHidden();
  await expect(demo(page).getByRole('button', { name: 'Open window', exact: true })).toBeEnabled();
  await expect(demo(page).getByRole('combobox', { name: 'Size', exact: true })).toHaveText('M');
  await expect(demo(page).getByRole('switch', { name: 'Block background', exact: true })).toBeChecked();
  await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
  await expect(preview(page).getByRole('textbox', { name: 'Project note', exact: true })).toHaveValue('');
  expect(errors).toEqual([]);
});

test('numeric validation, touch sizing and narrow layouts stay usable', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await number(page, 'Animation duration', 2100);
    await expect(demo(page).getByRole('spinbutton', { name: 'Animation duration', exact: true })).toHaveAttribute('aria-invalid', 'true');
    await number(page, 'Animation duration', 0);
    await choose(page, 'Size', 'XL');
    const textSizes = await demo(page).locator('input:not([type=checkbox]),select,textarea').evaluateAll(nodes =>
      nodes.map(node => Number.parseFloat(getComputedStyle(node).fontSize)));
    expect(textSizes.every(size => size >= 16)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await demo(page).getByRole('button', { name: 'Open window', exact: true }).click();
    await expect(preview(page)).toBeInViewport();
    await expect(preview(page)).toHaveCSS('width', '370px');
    await preview(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  } finally { await context.close(); }
});
