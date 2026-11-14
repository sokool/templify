const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PWA = require('./pwa.js');
const Settings = require('../../../storage/settings.js');
const { icon } = require('../../scripts/build-pwa-icons.cjs');

function fixture({ navigator = {}, secure = true, protocol = 'https:' } = {}) {
  const window = new EventTarget(), media = new EventTarget();
  media.matches = false;
  Object.assign(window, {
    navigator, isSecureContext: secure, location: { protocol },
    matchMedia: () => media,
  });
  return { document: { defaultView: window }, window, media };
}
function offer(window, prompt) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = prompt || (() => Promise.resolve({ outcome: 'dismissed' }));
  window.dispatchEvent(event);
  return event;
}

test('unknown is not installed; iOS, iPadOS and desktop Safari receive manual instructions', () => {
  for (const [navigator, expected] of [
    [{ userAgent: 'Chrome', platform: 'Linux' }, ['unknown', 'browser']],
    [{ userAgent: 'iPhone Safari', platform: 'iPhone' }, ['manual', 'ios']],
    [{ userAgent: 'Safari', platform: 'MacIntel', maxTouchPoints: 5 }, ['manual', 'ios']],
    [{ userAgent: 'Version/18 Safari', platform: 'MacIntel' }, ['manual', 'safari']],
    [{ userAgent: 'Chrome Safari', platform: 'MacIntel' }, ['unknown', 'browser']],
  ]) {
    const environment = fixture({ navigator });
    const controller = PWA.create(environment);
    assert.deepEqual([controller.getState().status, controller.getState().platform], expected);
    assert.equal(controller.getState().canPrompt, false);
    controller.destroy();
  }
});

test('local files and insecure origins never automatically suggest installation', () => {
  for (const options of [{ secure: false }, { protocol: 'file:' }]) {
    const environment = fixture(options), controller = PWA.create(environment);
    assert.equal(controller.getState().status, 'unavailable');
    assert.equal(controller.getState().canSuggest, false);
    controller.destroy();
  }
});

test('native offers are captured, used once, and called synchronously before subscribers', async () => {
  const environment = fixture(), controller = PWA.create(environment);
  let calls = 0;
  const order = [];
  controller.subscribe(event => { if (event.type === 'prompt') order.push('notify'); });
  const event = offer(environment.window, () => {
    calls++; order.push('prompt');
    return Promise.resolve({ outcome: 'accepted' });
  });
  assert.equal(event.defaultPrevented, true);
  assert.equal(controller.getState().canPrompt, true);
  const first = controller.install();
  assert.deepEqual(order, ['prompt', 'notify']);
  assert.equal(controller.getState().busy, true);
  assert.deepEqual(await controller.install(), { outcome: 'unavailable' });
  assert.deepEqual(await first, { outcome: 'accepted' });
  assert.equal(calls, 1);
  assert.equal(controller.getState().status, 'pending', 'acceptance is not installation');
  environment.window.dispatchEvent(new Event('appinstalled'));
  assert.equal(controller.getState().status, 'installed');
  assert.equal(controller.getState().canSuggest, false);
  controller.destroy();
});

test('legacy userChoice works; a rejected prompt is handled without reusing it', async () => {
  const environment = fixture(), controller = PWA.create(environment);
  const event = offer(environment.window, () => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  assert.deepEqual(await controller.install(), { outcome: 'accepted' });
  offer(environment.window, () => Promise.reject(new Error('NotAllowedError')));
  assert.equal((await controller.install()).outcome, 'error');
  assert.equal(controller.getState().busy, false);
  assert.equal(controller.getState().status, 'unknown');
  controller.destroy();
});

test('dismissal is a host preference, survives controllers and synchronises subscribers', async () => {
  const environment = fixture();
  const settings = Settings.create().scope('preferences.pwa');
  const controller = PWA.create({ ...environment, settings, now: () => 1000 });
  let dismissals = 0;
  controller.subscribe(event => { if (event.type === 'dismiss') dismissals++; });
  offer(environment.window);
  assert.deepEqual(await controller.install({ dismissDays: 2 }), { outcome: 'dismissed' });
  assert.equal(dismissals, 1);
  assert.equal(settings.get('dismissedUntil'), 1000 + 2 * 86400000);
  controller.destroy();
  const restored = PWA.create({ ...environment, settings });
  assert.equal(restored.getState().dismissedUntil, 1000 + 2 * 86400000);
  settings.set('dismissedUntil', 42);
  assert.equal(restored.getState().dismissedUntil, 42);
  restored.destroy();
});

test('standalone and iOS legacy launch modes suppress install offers and track media changes', () => {
  const environment = fixture(), controller = PWA.create(environment);
  environment.media.matches = true;
  environment.media.dispatchEvent(new Event('change'));
  assert.equal(controller.getState().status, 'standalone');
  assert.equal(offer(environment.window).defaultPrevented, false);
  environment.media.matches = false;
  assert.equal(controller.getState().status, 'unknown');
  environment.window.navigator.standalone = true;
  assert.equal(controller.getState().status, 'standalone');
  controller.destroy();
});

test('destroy removes listeners and prevents async completions from persisting changes', async () => {
  const environment = fixture(), settings = Settings.create().scope('preferences.pwa');
  const controller = PWA.create({ ...environment, settings });
  let finish, updates = 0;
  offer(environment.window, () => new Promise(resolve => { finish = resolve; }));
  controller.subscribe(() => updates++);
  const pending = controller.install();
  controller.destroy(); controller.destroy();
  const before = updates;
  finish({ outcome: 'dismissed' });
  assert.deepEqual(await pending, { outcome: 'unavailable' });
  assert.equal(settings.get('dismissedUntil'), null);
  environment.window.dispatchEvent(new Event('appinstalled'));
  assert.equal(offer(environment.window).defaultPrevented, false);
  assert.equal(updates, before);
});

test('host manifest URLs stay in scope and app icons reproduce their actual dimensions', () => {
  const root = path.resolve(__dirname, '../../..');
  const manifestPath = path.join(root, 'workspace/pwa.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const url = new URL('https://example.com/prefix/workspace/pwa.webmanifest');
  assert.equal(new URL(manifest.id, url).pathname, '/prefix/');
  assert.equal(new URL(manifest.start_url, url).pathname, '/prefix/');
  assert.equal(new URL(manifest.scope, url).pathname, '/prefix/');
  assert.equal(manifest.display, 'standalone');
  for (const entry of [...manifest.icons, { src: './pwa-icons/icon-180.png', sizes: '180x180' }]) {
    const file = path.resolve(path.dirname(manifestPath), entry.src);
    const data = fs.readFileSync(file);
    const size = Number(entry.sizes.split('x')[0]);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
    assert.deepEqual(data, icon(size));
  }
});
