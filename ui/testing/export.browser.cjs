const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { buildExport, available } = require('../scripts/export.cjs');
let directory, server, url;

test.beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-browser-'));
  await buildExport({ outdir: directory });
  server = http.createServer((req, res) => {
    if (req.url === '/fragment') {
      res.setHeader('Content-Type', 'text/html');
      res.end(['tabs', 'window', 'tooltip', 'autocomplete'].map(name =>
        fs.readFileSync(path.join(directory, 'components', name + '.html'), 'utf8')
          .replaceAll('tabs-', 'swapped-tabs-').replaceAll('window-preview', 'swapped-window-preview')).join('\n'));
      return;
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const base = pathname.startsWith('/source/') ? path.resolve(__dirname, '../..') : directory;
    const relative = pathname.startsWith('/source/') ? pathname.slice(8) : pathname.slice(1);
    const file = path.resolve(base, relative || 'index.html');
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

test('export opens without JS errors and preserves server-rendered nodes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('.export-example')).toHaveCount(available().length);
  expect(await page.evaluate(() => !!window.Templify && !!window.htmx)).toBe(true);
  await page.evaluate(() => {
    const card = document.querySelector('#example-card [data-ui="card"]');
    const main = card.querySelector('.ds-card__main');
    main.dataset.preserved = 'yes';
    Templify.init(document); Templify.init(document);
    if (main !== card.querySelector('.ds-card__main')) throw Error('Replaced server markup');
  });
  await page.locator('#example-card .ds-card__menu-trigger').click();
  await expect(page.locator('#example-card .ds-card-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#example-card .ds-card-menu')).toBeHidden();
  await page.evaluate(() => {
    const card = document.querySelector('#example-card [data-ui="card"]');
    Templify.get(card).update({ size: 400, menuEnabled: false });
  });
  await expect(page.locator('#example-card .ds-card')).toHaveCSS('width', '400px');
  await expect(page.locator('#example-card .ds-card__menu-trigger')).toBeHidden();
  await page.locator('#tabs-details').click();
  await expect(page.locator('#tabs-details-panel')).toBeVisible();
  const input = page.locator('#example-autocomplete input[role="combobox"]');
  await input.fill('oak'); await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('#example-autocomplete input[type="hidden"]')).toHaveValue('oak');
  await page.locator('#example-list [data-list-page="next"]').click();
  await expect(page.locator('#example-list tbody tr:visible')).toHaveCount(1);
  const switcher = page.locator('#example-theme-switcher [data-theme-select]');
  await expect(switcher.locator('option')).toHaveCount(3);
  await switcher.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-ds-theme-base', 'dark');
  await page.evaluate(() => {
    const board = document.querySelector('[data-ui="kanban-board"]'), card = board.querySelector('.ds-card');
    window.originalKanbanCard = card;
    Templify.get(board).move('project-1', 'done');
    if (card !== board.querySelector('.ds-card')) throw Error('Kanban replaced card DOM');
  });
  await expect(page.locator('#example-kanban-board [data-column-id="done"] .ds-card')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('export page background follows Light, Dark and Matrix themes', async ({ page }) => {
  await page.goto(url);
  const switcher = page.locator('#example-theme-switcher [data-theme-select]');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(243, 246, 250)');
  for (const [theme, background] of [
    ['dark', 'rgb(36, 36, 36)'],
    ['matrix', 'rgb(12, 17, 14)'],
    ['light', 'rgb(243, 246, 250)'],
  ]) {
    await switcher.selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-ds-theme', theme);
    await expect(page.locator('body')).toHaveCSS('background-color', background);
  }
});

for (const context of ['export', 'workspace']) {
  test(`autocomplete highlights only its outer field and retains chip focus in every theme (${context})`, async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto(url + (context === 'workspace' ? '/source/index.html#topschrank.components.autocomplete' : ''));
    const autocomplete = page.locator('.ds-autocomplete'), input = autocomplete.getByRole('combobox'), body = autocomplete.locator('.ds-field-body');
    await expect(autocomplete).toHaveAttribute('data-multiple', 'true');
    await page.keyboard.press('Tab');
    for (const theme of ['light', 'dark', 'matrix']) {
      if (context === 'export') await page.evaluate(theme => Templify.themes.select(theme), theme);
      else if (theme !== 'light') await page.locator('.menu-utilities [data-theme-next]').click();
      await expect(page.locator('html')).toHaveAttribute('data-ds-theme', theme);
      await input.evaluate(element => element.blur());
      const size = await body.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight }));
      const accent = await autocomplete.evaluate(element => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--ds-colour-accent)'; element.append(probe);
        const colour = getComputedStyle(probe).color; probe.remove(); return colour;
      });
      await input.focus();
      expect(await input.evaluate(element => element.matches(':focus-visible'))).toBe(true);
      await expect(input).toHaveCSS('outline-style', 'none');
      await expect(input).toHaveCSS('border-top-width', '0px');
      await expect(input).toHaveCSS('box-shadow', 'none');
      await expect(body).toHaveCSS('border-color', accent);
      await expect(body).not.toHaveCSS('box-shadow', 'none');
      expect(await body.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight }))).toEqual(size);
      await input.press('Enter');
      await expect(autocomplete.locator('.ds-ac-chip')).toHaveCount(1);
      await expect(input).toHaveCSS('outline-style', 'none');
      const remove = autocomplete.getByRole('button', { name: /^Remove / });
      await remove.focus();
      await expect(remove).toHaveCSS('outline-style', 'solid');
      await remove.click();
      await expect(input).toBeFocused();
    }
    if (context === 'export') {
      await autocomplete.evaluate(element => Templify.get(element).update({ multiple: false }));
      await input.focus();
      await expect(input).toHaveCSS('outline-style', 'solid');
      await expect(input).toHaveCSS('outline-offset', '-2px');
      await expect(body).toHaveCSS('border-top-width', '0px');
    }
  });
}

test('Window adopts HTML and retains form values while updating every behaviour option', async ({ page }) => {
  await page.goto(url);
  await page.locator('[data-ui-open="window-preview"]').click();
  const dialog = page.locator('#window-preview');
  await expect(dialog).toBeVisible();
  await dialog.locator('input').fill('Do not replace');
  await page.evaluate(() => {
    const view = Templify.get(document.querySelector('#window-preview'));
    view.update({ mode: 'modal', side: 'left', closeOnEscape: false, closeOnBackdrop: false, showClose: false, lockScroll: false, resizable: false, duration: 0 });
  });
  await expect(dialog.locator('input')).toHaveValue('Do not replace');
  await expect(dialog).toHaveAttribute('data-mode', 'modal');
  await expect(dialog).toHaveAttribute('data-side', 'left');
  await expect(dialog.locator('.ds-window-close')).toBeHidden();
  await expect(dialog.locator('.ds-window-resize')).toBeHidden();
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
  await page.evaluate(() => Templify.get(document.querySelector('#window-preview')).close());
  await expect(dialog).toBeHidden();
});

test('exported Window reads four-edge and named-size HTML settings without demo dependencies', async ({ page }) => {
  await page.goto(url);
  const dialog = page.locator('#window-preview');
  for (const [side, size, height] of [['top', 'sm', 400], ['bottom', 'xs', 320]]) {
    await page.evaluate(({ side, size }) => {
      const element = document.getElementById('window-preview');
      Templify.destroy(element);
      Object.assign(element.dataset, { side, size, duration: '0' });
      Templify.init(element);
    }, { side, size });
    await page.locator('[data-ui-open="window-preview"]').click();
    await expect(dialog).toHaveAttribute('data-side', side);
    await expect(dialog).toHaveAttribute('data-size', size);
    await expect(dialog).toHaveCSS('height', height + 'px');
    await expect(dialog).toHaveCSS('width', '1280px');
    await dialog.locator('[data-ui-close]').click();
    await expect(dialog).toBeHidden();
  }
  await page.evaluate(() => {
    const view = Templify.get(document.getElementById('window-preview'));
    view.update({ size: 'auto' });
    view.open();
  });
  await expect(dialog).toHaveCSS('--ds-window-height', 'fit-content');
  const box = await dialog.boundingBox();
  expect(box.height).toBeGreaterThan(0);
  expect(box.height).toBeLessThan(320);
  await expect(page.locator('.window-demo')).toHaveCount(0);
});

test('mobile exported windows fill the screen with a small gap for every layout and keep long content scrollable', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto(url);
    const dialog = page.locator('#window-preview');
    for (const lockScroll of [true, false]) {
      for (const side of [null, 'left', 'right', 'top', 'bottom']) {
        await page.evaluate(({ side, lockScroll }) => {
          const view = Templify.get(document.getElementById('window-preview'));
          view.update({ mode: side ? 'side' : 'modal', side: side || 'right', size: 'xs', lockScroll, duration: 0 });
          view.open();
        }, { side, lockScroll });
        await expect(dialog).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeCloseTo(10);
        expect(bounds.y).toBeCloseTo(10);
        expect(bounds.width).toBeCloseTo(370);
        expect(bounds.height).toBeCloseTo(824);
        await expect(dialog).toHaveCSS('border-radius', '16px');
        await expect(dialog.locator('.ds-window-resize')).toBeHidden();
        await expect(dialog.locator('.ds-window-header')).toBeInViewport();
        await expect(dialog.locator('.ds-window-footer')).toBeInViewport();
        await dialog.locator('[data-ui-close]').click();
        await expect(dialog).toBeHidden();
      }
    }
    await page.evaluate(() => {
      const view = Templify.get(document.getElementById('window-preview'));
      view.update({ mode: 'modal', lockScroll: true });
      const content = document.createElement('div');
      content.style.height = '1600px';
      content.textContent = 'Long content';
      view.body.append(content);
      view.open();
    });
    const body = dialog.locator('.ds-window-body');
    expect(await body.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await expect(dialog.locator('.ds-window-header')).toBeInViewport();
    await expect(dialog.locator('.ds-window-footer')).toBeInViewport();
    await dialog.locator('.ds-window-close').click();
    await expect(dialog).toBeHidden();
  } finally { await context.close(); }
});

test('mobile viewport changes and rotation retain desktop dimensions and form values without resize events', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto(url);
    const dialog = page.locator('#window-preview');
    await page.evaluate(() => {
      const element = document.getElementById('window-preview');
      window.mobileResizeEvents = 0;
      element.addEventListener('ui:resize', () => window.mobileResizeEvents++);
      const view = Templify.get(element);
      view.update({ mode: 'modal', width: 520, height: 400, duration: 0 });
      view.open();
    });
    await expect(dialog).toHaveCSS('width', '520px');
    await expect(dialog).toHaveCSS('height', '400px');
    await dialog.locator('input').fill('Keep across viewport changes');
    for (const viewport of [
      { width: 320, height: 640 }, { width: 390, height: 844 },
      { width: 390, height: 560 }, { width: 620, height: 900 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(dialog).toHaveCSS('width', viewport.width - 20 + 'px');
      await expect(dialog).toHaveCSS('height', viewport.height - 20 + 'px');
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeCloseTo(10);
      expect(bounds.y).toBeCloseTo(10);
      await expect(dialog.locator('input')).toHaveValue('Keep across viewport changes');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(dialog).toHaveCSS('width', '520px');
    await expect(dialog).toHaveCSS('height', '400px');
    await expect(dialog.locator('.ds-window-resize')).toBeVisible();
    expect(await page.evaluate(() => ({
      size: Templify.get(document.getElementById('window-preview')).getSize(),
      resizeEvents: window.mobileResizeEvents,
    }))).toEqual({ size: { width: 520, height: 400 }, resizeEvents: 0 });
  } finally { await context.close(); }
});

test('HTML-first APIs update controls without replacing markup or swallowing submission', async ({ page }) => {
  await page.goto(url);
  const results = await page.evaluate(() => {
    const form = document.querySelector('[data-ui="form"]');
    form.append(document.querySelector('[data-ui="field-text"]'));
    const input = form.querySelector('input');
    const validBefore = Templify.get(form).validate(); input.value = 'PRJ-123';
    const validAfter = Templify.get(form).validate();
    const button = document.querySelector('#example-buttons [data-ui="buttons"]');
    const icon = document.createElement('span'); icon.textContent = '+';
    Templify.get(button).update({ label: 'Updated', icon, disabled: true });
    Templify.get(document.querySelector('[data-ui="progress"]')).update({ value: 25 });
    Templify.get(document.querySelector('[data-ui="loading-state"]')).update({ loading: false });
    Templify.get(document.querySelector('[data-ui="process-steps"]')).update({ current: 2 });
    return { validBefore, validAfter, sameInput: input === form.querySelector('input'), sameIcon: button.querySelector('[data-button-icon]').firstChild === icon };
  });
  expect(results).toEqual({ validBefore: false, validAfter: true, sameInput: true, sameIcon: true });
  await expect(page.locator('#example-buttons button')).toBeDisabled();
  await expect(page.locator('#example-progress progress')).toHaveJSProperty('value', 25);
  await expect(page.locator('[data-loading-content]')).toBeVisible();
  await expect(page.locator('#example-process-steps li').nth(2)).toHaveAttribute('aria-current', 'step');
  await page.locator('#example-navigation #menu-sidebar-toggle').click();
  await expect(page.locator('#example-navigation #menu-live')).toHaveAttribute('data-sidebar-collapsed', 'true');
  await page.locator('#example-shortcuts [data-shortcut-id="projects.search"] input').press('Control+Shift+J');
  expect(await page.evaluate(() => Templify.get(document.querySelector('[data-ui="shortcuts"]')).get('projects.search').shortcut)).toBe('Mod+Shift+J');
});

test('real HTMX swaps initialise once and clean up open windows and auxiliary DOM', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="swap"></div>'));
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => htmx.ajax('GET', '/fragment', { target: '#swap', swap: 'innerHTML' }));
    await page.locator('#swapped-tabs-details').click();
    await expect(page.locator('#swapped-tabs-details-panel')).toBeVisible();
    await page.locator('[data-ui-open="swapped-window-preview"]').click();
    await expect(page.locator('#swapped-window-preview')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await page.evaluate(() => htmx.ajax('GET', '/fragment', { target: '#swap', swap: 'innerHTML' }));
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
    await expect(page.locator('#swapped-window-preview')).toBeHidden();
    await expect(page.locator('.ds-tooltip')).toHaveCount(2);
    await expect(page.locator('#swap .ds-autocomplete input[role="combobox"]')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('workspace routes still mount without configurators', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/source/index.html');
  for (const name of ['autocomplete', 'buttons', 'card', 'forms', 'kanbanboard', 'navigation', 'progress', 'shortcuts', 'surface', 'tooltip', 'window', 'breadcrumbs']) {
    await page.evaluate(name => { location.hash = '#topschrank.components.' + name; }, name);
    await expect(page.locator('main.example-page')).toHaveAttribute('id', 'topschrank.components.' + name);
  }
  expect(errors).toEqual([]);
});

test('workspace release version remains visible on mobile with navigation open or closed', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(url + '/source/index.html#topschrank.components.countsandsummaries');
    await expect(page.locator('main.example-page')).toHaveAttribute('id', 'topschrank.components.countsandsummaries');
    const badge = page.locator('.menu-live-header .menu-avatar');
    const version = await badge.textContent();
    expect(version).toMatch(/^v\d+\.\d+\.\d+$/);
    for (const width of [320, 390, 620, 844, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(badge).toBeVisible();
      await expect(badge).toBeInViewport();
      await expect(badge).toHaveText(version);
      const bounds = await badge.boundingBox();
      const header = await page.locator('.menu-live-header').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(header.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(Math.min(header.x + header.width, width) + 1);
      if (width <= 620) {
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
        await expect(badge).toBeVisible();
        await expect(badge).toBeInViewport();
        await page.keyboard.press('Escape');
        await expect(badge).toBeVisible();
      }
    }
  } finally { await context.close(); }
});

async function expectTouchControlFonts(page) {
  const sizes = await page.locator('input,textarea,select').evaluateAll(elements => elements
    .filter(element => !['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image'].includes(element.type))
    .map(element => ({
      name: element.getAttribute('aria-label') || element.name || element.id || element.tagName,
      type: element.type,
      classes: element.className,
      size: Number.parseFloat(getComputedStyle(element).fontSize),
    })));
  expect(sizes.length).toBeGreaterThan(0);
  expect(sizes.filter(control => !Number.isFinite(control.size) || control.size < 16), page.url()).toEqual([]);
}

test('touch exports keep text controls at least 16px in portrait and landscape without disabling zoom', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(url);
    expect(await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches)).toBe(true);
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(?:no|0)|maximum-scale|minimum-scale/i);
    await expectTouchControlFonts(page);
    await page.locator('#field-text-input').focus();
    await expect(page.locator('#field-text-input')).toHaveCSS('font-size', '16px');
    await page.locator('#field-text-input').evaluate(element => {
      element.closest('.ds-field').style.setProperty('--ds-form-control-font-size', '24px');
    });
    await expect(page.locator('#field-text-input')).toHaveCSS('font-size', '24px');
    await page.setViewportSize({ width: 844, height: 390 });
    await expectTouchControlFonts(page);
    // The foundation opts components in; it must not reset unrelated host controls.
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'unrelated-host-input';
      document.body.append(input);
    });
    expect(await page.locator('#unrelated-host-input').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeLessThan(16);
  } finally { await context.close(); }
});

test('touch workspace controls stay readable despite compact navigation and tool overrides', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(url + '/source/index.html');
    const routes = [
      'topschrank.components.forms', 'topschrank.components.autocomplete',
      'topschrank.components.shortcuts', 'topschrank.components.window',
      'topschrank.tools.contrastchecker', 'topschrank.tools.palettepicker',
      'topschrank.tools.shadows', 'topschrank.palette', 'topschrank.iconsandglyphs',
    ];
    for (const route of routes) {
      await page.evaluate(route => { location.hash = '#' + route; }, route);
      await expect(page.locator('main.example-page')).toHaveAttribute('id', route);
      await expectTouchControlFonts(page);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await expectTouchControlFonts(page);
    await page.getByRole('button', { name: 'Search pages and actions', exact: true }).click();
    await expect(page.locator('#menu-search-panel input')).toHaveCSS('font-size', '20px');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(?:no|0)|maximum-scale|minimum-scale/i);
  } finally { await context.close(); }
});

test('desktop fields retain their original sizes even in a narrow preview', async ({ page }) => {
  await page.goto(url);
  expect(await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches)).toBe(false);
  await expect(page.locator('#field-text-input')).toHaveCSS('font-size', '14px');
  await expect(page.locator('#menu-search-panel input')).toHaveCSS('font-size', '28px');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#field-text-input')).toHaveCSS('font-size', '14px');
  await page.goto(url + '/source/index.html#topschrank.palette');
  await expect(page.locator('.palette-colour-row input[type="text"]').first()).toHaveCSS('font-size', '10px');
  await expect(page.locator('#menu-search-panel input')).toHaveCSS('font-size', '20px');
});
