const { test, expect, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { buildExport } = require('../scripts/export.cjs');
const root = path.resolve(__dirname, '../..');
let server, url, exported;

test.beforeAll(async () => {
  exported = fs.mkdtempSync(path.join(process.env.TMPDIR || require('node:os').tmpdir(), 'templify-pwa-'));
  await buildExport({ outdir: exported, components: ['pwa'] });
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const preview = pathname.startsWith('/preview/');
    const base = preview ? exported : root;
    const file = path.resolve(base, (preview ? pathname.slice(9) : pathname.slice(1)) || 'index.html');
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', ({
      '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
      '.webmanifest': 'application/manifest+json', '.png': 'image/png',
    })[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (exported) fs.rmSync(exported, { recursive: true, force: true });
});

async function offer(page, outcome = 'dismissed') {
  await page.evaluate(outcome => {
    window.pwaPromptCalls ||= 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = () => {
      window.pwaPromptCalls++;
      window.pwaHadActivation = navigator.userActivation.isActive;
      return outcome === 'error' ? Promise.reject(new Error('Not allowed')) : Promise.resolve({ outcome });
    };
    window.dispatchEvent(event);
  }, outcome);
}
const component = page => page.locator('[data-ui="pwa"]');
const banner = page => component(page).locator('[data-pwa-banner]');
const trigger = page => component(page).locator('[data-pwa-trigger]');

test('unknown browsers show instructions only on request and return focus on dismissal', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/index.html');
  await expect(component(page)).toHaveAttribute('data-pwa-state', 'unknown');
  await expect(banner(page)).toBeHidden();
  await page.evaluate(() => {
    const button = document.querySelector('[data-pwa-trigger]');
    Templify.get(button).update({ label: 'Install this app' });
  });
  await expect(trigger(page)).toHaveText('Install this app');
  await trigger(page).click();
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toBeFocused();
  await expect(component(page).locator('[data-pwa-help="browser"]')).toBeVisible();
  await component(page).locator('[data-pwa-dismiss]').click();
  await expect(banner(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
  await trigger(page).click();
  await expect(banner(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTML options schedule a non-focusing banner; native prompt runs once from a click', async ({ page }) => {
  await page.goto(url + '/preview/index.html');
  await trigger(page).focus();
  await page.evaluate(() => {
    const element = document.querySelector('[data-ui="pwa"]');
    element.dataset.pwaDelay = '0';
  });
  await offer(page);
  await expect(banner(page)).toBeVisible();
  await expect(trigger(page)).toBeFocused();
  expect(await page.evaluate(() => window.pwaPromptCalls)).toBe(0);
  await banner(page).getByRole('button', { name: 'Install app', exact: true }).click();
  expect(await page.evaluate(() => [window.pwaPromptCalls, window.pwaHadActivation])).toEqual([1, true]);
  await expect(banner(page)).toBeHidden();
  await expect(trigger(page)).toBeVisible();
  await offer(page, 'accepted');
  await trigger(page).click();
  await expect(component(page)).toHaveAttribute('data-pwa-state', 'pending');
  await expect(trigger(page)).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(component(page)).toHaveAttribute('data-pwa-state', 'installed');
  await expect(banner(page)).toBeHidden();
});

test('iPhone and desktop-mode iPad use instructions without pretending to open an installer', async ({ browser }) => {
  for (const ipad of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    try {
      const page = await context.newPage();
      await page.addInitScript(ipad => {
        Object.defineProperty(navigator, 'platform', { get: () => ipad ? 'MacIntel' : 'iPhone' });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
        Object.defineProperty(navigator, 'userAgent', { get: () => ipad ? 'Macintosh Version/18.0 Safari' : 'iPhone Version/18.0 Safari' });
      }, ipad);
      await page.goto(url + '/preview/index.html');
      await expect(component(page)).toHaveAttribute('data-pwa-state', 'manual');
      await page.evaluate(() => {
        const element = document.querySelector('[data-ui="pwa"]');
        Templify.get(element).update({ delay: 0, placement: 'fixed' });
      });
      await expect(banner(page)).toBeVisible();
      await expect(component(page).locator('[data-pwa-help="ios"]')).toBeVisible();
      const bounds = await banner(page).boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
      await component(page).locator('[data-pwa-dismiss]').click();
      await expect(banner(page)).toBeHidden();
      await trigger(page).click();
      await expect(banner(page)).toBeVisible();
    } finally { await context.close(); }
  }
});

test('standalone launch detection hides all prompts, including iOS legacy mode', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
  });
  await page.goto(url + '/preview/index.html');
  await expect(component(page)).toHaveAttribute('data-pwa-state', 'standalone');
  await expect(trigger(page)).toBeHidden();
  await offer(page);
  await expect(banner(page)).toBeHidden();
});

test('WebKit keeps iOS installation instructions non-modal and touch-friendly', async () => {
  const browser = await webkit.launch({ channel: undefined });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/preview/index.html');
    await expect(component(page)).toHaveAttribute('data-pwa-state', 'manual');
    await trigger(page).tap();
    await expect(banner(page)).toBeVisible();
    await expect(component(page).locator('[data-pwa-help="ios"]')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
    const button = component(page).locator('[data-pwa-dismiss]');
    expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await button.tap();
    await expect(banner(page)).toBeHidden();
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});

test('a failed native prompt shows recovery instructions instead of leaving a hidden error', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/preview/index.html');
  await offer(page, 'error');
  await trigger(page).click();
  await expect(banner(page)).toBeVisible();
  await expect(component(page).locator('[data-pwa-status]')).toContainText('could not be opened');
  await expect(component(page).locator('[data-pwa-help="browser"]')).toBeVisible();
  await expect(trigger(page)).toBeEnabled();
  expect(errors).toEqual([]);
});

test('automatic suggestions respect a saved cooldown but manual help remains available', async ({ page }) => {
  await page.clock.install();
  await page.goto(url + '/preview/index.html');
  await page.evaluate(() => {
    const element = document.querySelector('[data-ui="pwa"]');
    Templify.destroy(element);
    const timestamp = Date.now() + 10000;
    window.pwaTestSettings = {
      get: () => timestamp,
      set() {},
    };
    // Use the same runtime factory as the exported client, via the classic API.
  });
  await page.addScriptTag({ url: url + '/ui/components/pwa/pwa.js' });
  await page.evaluate(() => {
    const element = document.querySelector('[data-ui="pwa"]');
    window.pwaCooldownView = DesignSystemPWA.mount(element, { settings: window.pwaTestSettings, delay: 0 });
  });
  await offer(page);
  await page.clock.runFor(9000);
  await expect(banner(page)).toBeHidden();
  await page.clock.runFor(1001);
  await expect(banner(page)).toBeVisible();
  await component(page).locator('[data-pwa-dismiss]').click();
  // "Not now" preserves the offered native installer for an explicit click.
  await trigger(page).click();
  expect(await page.evaluate(() => window.pwaPromptCalls)).toBe(1);
  await expect(banner(page)).toBeHidden();
  // Once the native event is consumed, the same button opens manual help.
  await trigger(page).click();
  await expect(banner(page)).toBeVisible();
});

test('unmounted timers cannot reopen banners; media changes update running-mode detection', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    const media = new EventTarget();
    media.matches = false;
    window.pwaTestMedia = media;
    window.matchMedia = query => query.includes('display-mode') ? media : original(query);
  });
  await page.clock.install();
  await page.goto(url + '/preview/index.html');
  await page.evaluate(() => {
    const element = document.querySelector('[data-ui="pwa"]');
    Templify.get(element).update({ delay: 1000 });
  });
  await offer(page);
  await page.evaluate(() => {
    window.pwaTestMedia.matches = true;
    window.pwaTestMedia.dispatchEvent(new Event('change'));
  });
  await expect(component(page)).toHaveAttribute('data-pwa-state', 'standalone');
  await page.clock.runFor(2000);
  await expect(banner(page)).toBeHidden();
  await page.evaluate(() => {
    window.pwaTestMedia.matches = false;
    window.pwaTestMedia.dispatchEvent(new Event('change'));
    Templify.destroy(document.querySelector('[data-ui="pwa"]'));
  });
  await page.clock.runFor(10000);
  await expect(banner(page)).toBeHidden();
});

test('export lifecycle shares one installer across instances and cleans up after HTMX removal', async ({ page }) => {
  await page.goto(url + '/preview/index.html');
  const result = await page.evaluate(() => {
    const element = document.querySelector('[data-ui="pwa"]'), copy = element.cloneNode(true);
    element.after(copy);
    Templify.init(copy); Templify.init(copy);
    window.pwaOriginalTrigger = copy.querySelector('[data-pwa-trigger]');
    return Templify.get(copy).controller === Templify.get(element).controller;
  });
  expect(result).toBe(true);
  await offer(page, 'accepted');
  await trigger(page).nth(1).click();
  await expect(trigger(page).first()).toBeHidden();
  expect(await page.evaluate(() => window.pwaPromptCalls)).toBe(1);
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('[data-ui="pwa"]')) {
      element.dispatchEvent(new CustomEvent('htmx:beforeCleanupElement', { bubbles: true, detail: { elt: element } }));
      element.remove();
    }
    window.pwaOriginalTrigger.click();
  });
  expect(await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = () => Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(false);
});

test('host manifest is valid and dismissal survives routing and reload without entering templates', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto(url + '/index.html#topschrank.components.pwa');
  // Workspace pages use the same source markup as the export.
  await expect(page.locator('[data-pwa-trigger]')).toBeVisible();
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    return (await fetch(link.href)).json();
  });
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512']);
  const session = await page.context().newCDPSession(page);
  const appManifest = await session.send('Page.getAppManifest');
  expect(appManifest.errors).toEqual([]);
  const { installabilityErrors } = await session.send('Page.getInstallabilityErrors');
  // Playwright contexts are private, where OS installation itself is disabled.
  expect(installabilityErrors.filter(error => error.errorId !== 'in-incognito')).toEqual([]);
  await session.detach();
  await page.locator('[data-pwa-trigger]').click();
  const visibleBanner = page.locator('[data-pwa-banner]:visible');
  await visibleBanner.locator('[data-pwa-dismiss]').click();
  const dismissedUntil = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('design-system-workspace')).data.preferences.pwa.dismissedUntil);
  expect(dismissedUntil).toBeGreaterThan(Date.now());
  await page.reload();
  await expect(page.locator('[data-pwa-trigger]')).toBeVisible();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('design-system-workspace')).data.preferences.pwa.dismissedUntil)).toBe(dismissedUntil);
  await page.getByRole('button', { name: 'Used components', exact: true }).click();
  await expect(page.locator('.ds-window').filter({ hasText: 'The PWA template composes Buttons.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[data-menu-page="dashboard"]').click();
  await expect(page.locator('.component-page-edge-tabs')).toHaveCount(0);
  expect(errors).toEqual([]);
});
