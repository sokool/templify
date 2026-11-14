const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { available, buildExport } = require('../scripts/export.cjs');
const root = path.resolve(__dirname, '../..');
const fields = available().filter(name => name.startsWith('field-'));
let directory, server, url;

test.beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-fields-'));
  await buildExport({ outdir: path.join(directory, 'combined'), components: [...fields, 'form'] });
  await Promise.all(fields.map(name => buildExport({ outdir: path.join(directory, name), components: [name] })));
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const source = pathname.startsWith('/source/');
    const base = source ? root : directory;
    const file = path.resolve(base, source ? pathname.slice(8) : pathname.slice(1));
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});
test.beforeEach(async ({ page }) => { await page.route('https://fonts.googleapis.com/**', route => route.abort()); });
const open = page => page.goto(url + '/combined/index.html');
const field = (page, type) => page.locator('[data-ui="field-' + type + '"]');

test('every field exports alone with documented HTML, a live API and no Form dependency', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const name of fields) {
    await page.goto(url + '/' + name + '/index.html');
    await expect(page.locator('.export-example')).toHaveCount(1);
    await expect(page.locator('[data-ui="' + name + '"]')).toHaveCount(1);
    expect(await page.locator('[data-ui="' + name + '"]').evaluate(element => !!Templify.get(element)?.control), name).toBe(true);
    await page.evaluate(() => { Templify.init(document); Templify.init(document); });
    expect(await page.locator('.ds-number-arrows').count()).toBe(name === 'field-number' ? 1 : 0);
    expect(fs.readFileSync(path.join(directory, name, 'components', name + '.html'), 'utf8')).toBe(
      fs.readFileSync(path.join(root, 'ui/components', name, name + '.html'), 'utf8'));
  }
  expect(errors).toEqual([]);
});

test('catalogue shows each exported template once, without duplicated forms or playground', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/source/index.html#topschrank.components.forms');
  await expect(page.locator('.example-form .ds-field')).toHaveCount(fields.length);
  await expect(page.locator('.example-form form')).toHaveCount(0);
  await expect(page.locator('.form-example-playground')).toHaveCount(0);
  for (const name of fields) await expect(page.locator('.example-form [data-ui="' + name + '"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('focused fields have one inset highlight without changing size in every theme', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  const controls = [
    field(page, 'text').locator('input'),
    field(page, 'textarea').locator('textarea'),
    field(page, 'select').getByRole('combobox'),
    field(page, 'date').locator('.ds-picker-trigger'),
    field(page, 'multiselect').getByRole('listbox'),
  ];
  for (const theme of ['light', 'dark', 'matrix']) {
    await page.evaluate(theme => Templify.themes.select(theme), theme);
    const accent = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--ds-colour-accent)'; document.body.append(probe);
      const colour = getComputedStyle(probe).color; probe.remove(); return colour;
    });
    for (const control of controls) {
      await control.evaluate(element => element.blur());
      const size = await control.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight }));
      await control.focus();
      expect(await control.evaluate(element => element.matches(':focus-visible'))).toBe(true);
      await expect(control).toHaveCSS('outline-style', 'solid');
      await expect(control).toHaveCSS('outline-width', '2px');
      await expect(control).toHaveCSS('outline-offset', '-2px');
      await expect(control).toHaveCSS('outline-color', accent);
      expect(await control.evaluate(element => ({ width: element.offsetWidth, height: element.offsetHeight }))).toEqual(size);
    }
  }
});

test('compact arrows and minus/plus share native stepping, boundary and readonly behaviour', async ({ page }) => {
  await open(page);
  const number = field(page, 'number'), quantity = field(page, 'quantity');
  await number.getByRole('button', { name: 'Increase Budget' }).click();
  await expect(number.locator('input')).toHaveValue('14300');
  await expect(quantity.getByRole('button', { name: 'Decrease Quantity' })).toBeDisabled();
  await quantity.getByRole('button', { name: 'Increase Quantity' }).click();
  await expect(quantity.locator('input')).toHaveValue('2');
  await quantity.locator('input').evaluate(input => { input.readOnly = true; });
  await expect(quantity.getByRole('button', { name: 'Increase Quantity' })).toBeDisabled();
  await expect(quantity.getByRole('button', { name: 'Decrease Quantity' })).toBeDisabled();
  await expect(quantity.locator('.ds-number-arrows')).toHaveCount(0);
});

test('slider fills its track, updates output and retains native keyboard, min/max/step and reset', async ({ page }) => {
  await open(page);
  const slider = field(page, 'range').getByRole('slider');
  await expect(slider).toHaveCSS('--ds-range-progress', '40%');
  await slider.focus(); await slider.press('ArrowRight');
  await expect(slider).toHaveValue('130');
  await expect(field(page, 'range').locator('output')).toHaveText('130 cm');
  await slider.press('End'); await expect(slider).toHaveValue('300');
  await expect(slider).toHaveCSS('--ds-range-progress', '100%');
  await page.evaluate(() => {
    const form = document.querySelector('[data-ui=form]'), field = document.querySelector('[data-ui=field-range]');
    Templify.destroy(field); form.append(field); Templify.init(field);
    form.reset();
  });
  await expect(slider).toHaveValue('120');
  await expect(slider).toHaveCSS('--ds-range-progress', '40%');
});

test('select selection, pointer hover and keyboard focus stay independently visible in every theme', async ({ page }) => {
  await open(page);
  const select = field(page, 'select'), trigger = select.getByRole('combobox'), walnut = select.getByRole('option', { name: 'Walnut', exact: true }), oak = select.getByRole('option', { name: 'Natural oak', exact: true });
  for (const theme of ['light', 'dark', 'matrix']) {
    await page.evaluate(theme => Templify.themes.select(theme), theme);
    await trigger.click();
    await expect(walnut).toHaveAttribute('aria-selected', 'true');
    await oak.hover();
    const styles = await select.evaluate(element => {
      const selected = element.querySelector('[role=option][aria-selected=true]'), hovered = Array.from(element.querySelectorAll('[role=option]')).find(row => row.matches(':hover'));
      return { selected: getComputedStyle(selected).backgroundColor, hover: getComputedStyle(hovered).backgroundColor, tick: getComputedStyle(selected, '::after').content };
    });
    expect(styles.selected).not.toBe(styles.hover);
    expect(styles.tick).not.toBe('none');
    await trigger.press('Home');
    await expect(select.locator('[role=option]').first()).toHaveAttribute('data-active', 'true');
    await expect(walnut).toHaveAttribute('aria-selected', 'true');
    await trigger.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('closed select popups leave unrelated pointer and focus events free of DOM mutations', async ({ page }) => {
  await open(page);
  const changes = await field(page, 'select').evaluate(async element => {
    const records = [];
    const observer = new MutationObserver(mutations => records.push(...mutations));
    observer.observe(element, { subtree: true, attributes: true, childList: true });
    document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.querySelector('h1').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await Promise.resolve();
    observer.disconnect();
    return records.length;
  });
  expect(changes).toBe(0);
});

test('multiselect toggles independently, skips disabled options and serializes repeated native values', async ({ page }) => {
  await open(page);
  const multi = field(page, 'multiselect');
  await multi.getByRole('option', { name: 'Walnut', exact: true }).click();
  await expect(multi.getByRole('option', { name: 'Walnut', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await multi.evaluate(element => Templify.get(element).getValue())).toEqual(['oak', 'walnut', 'steel']);
  await multi.getByRole('listbox').press('End');
  await expect(multi.getByRole('option', { name: 'Steel', exact: true })).toHaveAttribute('data-active', 'true');
  await multi.getByRole('listbox').press('Space');
  expect(await multi.evaluate(element => Templify.get(element).getValue())).toEqual(['oak', 'walnut']);
  await expect(multi.getByRole('option', { name: 'Brass', exact: true })).toHaveAttribute('aria-selected', 'false');
});

test('date, time, datetime, month, week and colour use themed dialogs and retain native values', async ({ page }) => {
  await open(page);
  for (const theme of ['light', 'dark', 'matrix']) {
    await page.evaluate(theme => Templify.themes.select(theme), theme);
    for (const type of ['date', 'time', 'datetime-local', 'month', 'week', 'color']) {
      const current = field(page, type);
      await current.locator('.ds-picker-trigger').click();
      const dialog = current.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const colours = await dialog.evaluate(element => {
        const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--ds-colour-panel)'; probe.style.color = 'var(--ds-colour-text)'; element.append(probe);
        const result = [getComputedStyle(element).backgroundColor, getComputedStyle(probe).backgroundColor, getComputedStyle(element).color, getComputedStyle(probe).color]; probe.remove(); return result;
      });
      expect(colours[0]).toBe(colours[1]); expect(colours[2]).toBe(colours[3]);
      await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
    }
  }
  const cases = { date: '2026-11-18', time: '11:15', 'datetime-local': '2026-11-18T11:15', month: '2027-02', week: '2026-W46', color: '#e245ab' };
  for (const [type, value] of Object.entries(cases)) {
    const current = field(page, type);
    await current.locator('.ds-picker-trigger').click();
    await current.locator('.ds-picker-entry').fill(value);
    await current.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(current.locator('input').first()).toHaveValue(value);
    await expect(current.getByRole('dialog')).toBeHidden();
  }
});

test('calendar keyboard crosses month boundaries; invalid values cannot commit; ISO weeks select all seven days', async ({ page }) => {
  await open(page);
  const date = field(page, 'date');
  await date.locator('.ds-picker-trigger').click();
  await page.keyboard.press('End'); await page.keyboard.press('ArrowRight');
  await expect(date.locator('[role=gridcell]:focus')).toHaveAttribute('data-date', '2026-11-09');
  await page.keyboard.press('Enter');
  await expect(date.locator('input').first()).toHaveValue('2026-11-09');
  await date.locator('.ds-picker-trigger').click();
  await date.locator('.ds-picker-entry').fill('2025-01-01');
  await expect(date.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(date.locator('input').first()).toHaveValue('2026-11-09');
  const week = field(page, 'week');
  await week.locator('.ds-picker-trigger').click();
  await week.locator('.ds-picker-entry').fill('2026-W46');
  await week.getByRole('button', { name: 'Apply', exact: true }).click();
  await week.locator('.ds-picker-trigger').click();
  await expect(week.locator('[role=gridcell][aria-selected=true]')).toHaveCount(7);
});

test('suggestions allow free text and preserve a themed, keyboard-selectable list', async ({ page }) => {
  await open(page);
  const suggestions = field(page, 'suggestions'), input = suggestions.getByRole('combobox');
  await input.fill('Ber');
  await expect(suggestions.getByRole('option')).toHaveCount(1);
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(input).toHaveValue('Berlin');
  await input.fill('Other city');
  expect(await suggestions.evaluate(element => Templify.get(element).validate())).toBe(true);
});

test('native submission remains host-owned; field reset and HTMX cleanup preserve server markup', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => {
    const form = document.querySelector('[data-ui=form]');
    for (const type of ['text', 'select', 'multiselect', 'date', 'checkbox']) {
      const field = document.querySelector('[data-ui=field-' + type + ']');
      Templify.destroy(field); form.append(field); Templify.init(field);
    }
    const text = form.querySelector('input[type=text]'); text.value = 'Example';
    const select = form.querySelector('select:not([multiple])'); select.value = 'oak'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const event = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(event);
    return { prevented: event.defaultPrevented, value: new FormData(form).get('finish') };
  })).toEqual({ prevented: false, value: 'oak' });
  await page.evaluate(() => document.querySelector('[data-ui=form]').reset());
  await expect(field(page, 'select').getByRole('combobox')).toHaveText('Walnut');
  await expect(field(page, 'text').locator('input')).toHaveValue('');
  await page.evaluate(() => {
    const field = document.querySelector('[data-ui=field-date]');
    window.originalDate = field.querySelector('input');
    field.dispatchEvent(new CustomEvent('htmx:beforeCleanupElement', { bubbles: true, detail: { elt: field } }));
    Templify.init(field);
    if (field.querySelector('input') !== window.originalDate) throw new Error('Native input replaced');
  });
  await expect(field(page, 'date').locator('.ds-picker-trigger')).toHaveCount(1);
});

test('legacy mount API still passes native FormData, validity and lifecycle regression checks', async ({ page }) => {
  await page.goto(url + '/source/ui/components/form/tests/browser.html');
  await expect(page.locator('#results')).toContainText('0 failed');
});

test('native submission focuses enhanced invalid controls and respects cancelled reset', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const form = document.querySelector('[data-ui=form]');
    for (const type of ['text', 'select', 'checkbox']) form.append(document.querySelector('[data-ui=field-' + type + ']'));
    window.submissions = 0;
    form.addEventListener('submit', event => { event.preventDefault(); window.submissions++; });
    form.requestSubmit();
  });
  await expect(field(page, 'text').locator('input')).toBeFocused();
  await expect(field(page, 'text').locator('[data-field-error]')).toBeVisible();
  await field(page, 'text').locator('input').fill('Valid');
  await page.evaluate(() => {
    const select = document.querySelector('[data-ui=field-select] select');
    select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-ui=form]').requestSubmit();
  });
  await expect(field(page, 'select').getByRole('combobox')).toBeFocused();
  expect(await page.evaluate(() => window.submissions)).toBe(0);
  await page.evaluate(() => {
    const select = document.querySelector('[data-ui=field-select] select');
    select.value = 'oak'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const form = document.querySelector('[data-ui=form]');
    form.requestSubmit();
    form.addEventListener('reset', event => event.preventDefault(), { once: true }); form.reset();
  });
  expect(await page.evaluate(() => window.submissions)).toBe(1);
  await expect(field(page, 'text').locator('input')).toHaveValue('Valid');
  await expect(field(page, 'select').getByRole('combobox')).toHaveText('Natural oak');
  await field(page, 'checkbox').getByRole('checkbox', { name: 'Transport', exact: true }).uncheck();
  await page.evaluate(() => document.querySelector('[data-ui=form]').requestSubmit());
  expect(await page.evaluate(() => window.submissions)).toBe(1);
  await expect(field(page, 'checkbox').locator('[data-field-error]')).toBeVisible();
});

test.describe('touch choice fields', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  for (const javaScriptEnabled of [true, false]) {
    test(`checkboxes toggle once per tap without double-tap delay (JavaScript ${javaScriptEnabled ? 'on' : 'off'})`, async ({ browser }) => {
      const context = await browser.newContext({
        javaScriptEnabled, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 },
      });
      try {
        const page = await context.newPage();
        await page.route('https://fonts.googleapis.com/**', route => route.abort());
        await open(page);
        for (const type of ['checkbox', 'switch', 'radio']) {
          const choice = field(page, type).locator('.ds-field-choice').first();
          await expect(choice).toHaveCSS('touch-action', 'manipulation');
          await expect(choice.locator('input')).toHaveCSS('touch-action', 'manipulation');
        }
        const checkbox = field(page, 'checkbox').getByRole('checkbox', { name: 'Measurement', exact: true });
        const label = field(page, 'checkbox').locator('.ds-field-choice').filter({
          has: page.getByRole('checkbox', { name: 'Measurement', exact: true }),
        });
        await expect(checkbox).not.toBeChecked();
        await checkbox.tap();
        await expect(checkbox).toBeChecked();
        await label.locator('span').tap();
        await expect(checkbox).not.toBeChecked();
        await label.tap();
        await expect(checkbox).toBeChecked();
        await checkbox.tap();
        await expect(checkbox).not.toBeChecked();
        const disabled = field(page, 'checkbox').getByRole('checkbox', { name: 'Option unavailable', exact: true });
        await field(page, 'checkbox').locator('.ds-field-choice').filter({
          has: page.getByRole('checkbox', { name: 'Option unavailable', exact: true }),
        }).locator('span').tap({ force: true });
        await expect(disabled).not.toBeChecked();
        await expect(disabled).toBeDisabled();
        // Keyboard activation must remain native; no touch-specific toggler.
        await checkbox.focus();
        await page.keyboard.press('Space');
        await expect(checkbox).toBeChecked();
      } finally { await context.close(); }
    });
  }
});

test('popups fit narrow touch viewports and all inline controls retain their native fallback without JS', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 640 } });
  try {
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await open(page);
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const type of ['date', 'time', 'datetime-local', 'month', 'select']) {
        const current = field(page, type);
        await current.locator('.ds-picker-trigger,.ds-select-trigger').click();
        const popup = current.locator('.ds-field-popup');
        await expect(popup).toBeVisible();
        const bounds = await popup.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(10);
        expect(bounds.x + bounds.width, type + ' at ' + JSON.stringify(viewport)).toBeLessThanOrEqual(viewport.width - 10);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
        await page.keyboard.press('Escape');
      }
    }
  } finally { await context.close(); }
  const fallback = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await fallback.newPage(); await open(page);
    await expect(field(page, 'select').locator('select')).toBeVisible();
    await expect(field(page, 'date').locator('input')).toBeVisible();
    await expect(field(page, 'range').locator('input')).toBeVisible();
    await expect(page.locator('.ds-field-native')).toHaveCount(0);
  } finally { await fallback.close(); }
});

test('a picker remains usable inside a clipped host rather than being cut off by overflow', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:100px;left:100px;width:240px;height:60px;overflow:hidden';
    host.append(document.querySelector('[data-ui=field-date]')); document.body.append(host);
  });
  await field(page, 'date').locator('.ds-picker-trigger').click();
  await field(page, 'date').getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(field(page, 'date').getByRole('grid')).toHaveAttribute('aria-label', 'December 2026');
  await field(page, 'date').locator('[data-date="2026-12-02"]').click();
  await expect(field(page, 'date').locator('input').first()).toHaveValue('2026-12-02');
});
