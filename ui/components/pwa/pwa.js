(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemPWA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const instances = new WeakMap();
  const shared = new WeakMap();
  const day = 86400000;
  const defaults = Object.freeze({ prompt: 'auto', delay: 5000, dismissDays: 7, placement: 'inline' });
  const number = (value, fallback, maximum) => value !== null && value !== '' &&
    Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.min(Number(value), maximum) : fallback;

  // Browser capability and installation state belong to the document, not a
  // particular button. No localStorage or host configuration is read here.
  function create({ document, settings, now = Date.now }) {
    const window = document.defaultView;
    const navigator = window.navigator || {};
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) ||
      navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const platform = ios ? 'ios' : /Mac/.test(navigator.platform || '') &&
      /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua) ? 'safari' : 'browser';
    const media = window.matchMedia?.('(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)');
    const listeners = new Set();
    let pending = null, busy = false, accepted = false, installed = false, destroyed = false;
    let dismissedUntil = 0;
    const secure = window.isSecureContext !== false &&
      (!window.location?.protocol || /^https?:$/.test(window.location.protocol));

    function readPreference() {
      try { dismissedUntil = number(settings?.get('dismissedUntil', 0), 0, Number.MAX_SAFE_INTEGER); }
      catch { dismissedUntil = 0; }
    }
    readPreference();
    function getState() {
      const standalone = Boolean(media?.matches || navigator.standalone === true);
      const status = standalone ? 'standalone' : installed ? 'installed' : !secure ? 'unavailable' :
        accepted ? 'pending' : pending ? 'available' : platform !== 'browser' ? 'manual' : 'unknown';
      return {
        status, platform, busy, dismissedUntil,
        canPrompt: status === 'available' && !busy,
        canSuggest: !busy && (status === 'available' || status === 'manual'),
      };
    }
    function notify(type = 'change', detail = {}) {
      if (!destroyed) listeners.forEach(listener => listener({ type, ...getState(), ...detail }));
    }
    function dismiss(days = defaults.dismissDays) {
      if (destroyed) return;
      dismissedUntil = now() + number(days, defaults.dismissDays, 36500) * day;
      try { settings?.set('dismissedUntil', dismissedUntil); }
      catch (error) { notify('error', { error, operation: 'preferences' }); }
      notify('dismiss');
    }
    function beforeInstall(event) {
      if (destroyed || installed || getState().status === 'standalone' || typeof event.prompt !== 'function') return;
      event.preventDefault();
      pending = event;
      accepted = false;
      notify();
    }
    function appInstalled() {
      installed = true; accepted = false; pending = null;
      notify('installed');
    }
    const changed = () => notify();
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', appInstalled);
    window.addEventListener('pageshow', changed);
    if (media?.addEventListener) media.addEventListener('change', changed);
    else media?.addListener?.(changed);
    const unsubscribe = settings?.subscribe?.(() => { readPreference(); notify(); });

    const controller = {
      getState, dismiss,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async install({ dismissDays = defaults.dismissDays } = {}) {
        if (destroyed || !getState().canPrompt) return { outcome: 'unavailable' };
        const event = pending;
        pending = null; busy = true;
        try {
          // Keep prompt() inside the original click's user activation.
          const result = event.prompt();
          notify('prompt');
          const prompted = await result;
          const choice = prompted?.outcome ? prompted : await event.userChoice;
          if (destroyed) return { outcome: 'unavailable' };
          accepted = !installed && choice?.outcome === 'accepted';
          if (choice?.outcome === 'dismissed') dismiss(dismissDays);
          notify('choice', { outcome: choice?.outcome || 'unknown' });
          return { outcome: choice?.outcome || 'unknown' };
        } catch (error) {
          notify('error', { error, operation: 'install' });
          return { outcome: 'error', error };
        } finally {
          busy = false;
          notify();
        }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true; pending = null;
        window.removeEventListener('beforeinstallprompt', beforeInstall);
        window.removeEventListener('appinstalled', appInstalled);
        window.removeEventListener('pageshow', changed);
        if (media?.removeEventListener) media.removeEventListener('change', changed);
        else media?.removeListener?.(changed);
        unsubscribe?.(); listeners.clear();
      },
    };
    return controller;
  }

  function acquire(document, settings) {
    let entry = shared.get(document);
    if (!entry) {
      entry = { controller: create({ document, settings }), count: 0 };
      shared.set(document, entry);
    }
    entry.count++;
    return {
      controller: entry.controller,
      release() {
        if (--entry.count) return;
        entry.controller.destroy();
        shared.delete(document);
      },
    };
  }

  function mount(element, { controller, settings, ...initial } = {}) {
    if (instances.has(element)) return instances.get(element);
    const document = element.ownerDocument, window = document.defaultView;
    const owned = selector => [...element.querySelectorAll(selector)]
      .filter(node => node.closest('[data-ui="pwa"]') === element);
    const banner = owned('[data-pwa-banner]')[0];
    const trigger = owned('[data-pwa-trigger]')[0];
    const buttons = owned('[data-pwa-install]');
    const dismissButtons = owned('[data-pwa-dismiss]');
    const helpers = owned('[data-pwa-help]');
    const status = owned('[data-pwa-status]')[0];
    const lease = controller ? null : acquire(document, settings);
    controller = controller || lease.controller;
    let overrides = initial, options, timer = null, open = false, destroyed = false;
    let dismissedHere = false;
    const started = Date.now();
    function configure() {
      const value = (key, attribute) => overrides[key] ?? element.getAttribute(attribute);
      options = {
        prompt: value('prompt', 'data-pwa-prompt') === 'manual' ? 'manual' : 'auto',
        delay: number(value('delay', 'data-pwa-delay'), defaults.delay, 2147483647),
        dismissDays: number(value('dismissDays', 'data-pwa-dismiss-days'), defaults.dismissDays, 36500),
        placement: value('placement', 'data-pwa-placement') === 'fixed' ? 'fixed' : 'inline',
      };
      if (element.dataset.pwaPlacement !== options.placement) element.dataset.pwaPlacement = options.placement;
    }
    function emit(name, detail = {}) {
      if (!destroyed) element.dispatchEvent(new window.CustomEvent('ui:pwa-' + name, { bubbles: true, detail }));
    }
    function clearTimer() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }
    function close() {
      const restoreFocus = banner?.contains(document.activeElement);
      open = false;
      if (banner) banner.hidden = true;
      if (restoreFocus && trigger && !trigger.hidden) trigger.focus();
    }
    function schedule(state) {
      clearTimer();
      if (destroyed || open || dismissedHere || !banner || options.prompt !== 'auto' || !state.canSuggest) return;
      const wait = Math.max(0, started + options.delay - Date.now(), state.dismissedUntil - Date.now());
      timer = window.setTimeout(() => {
        timer = null;
        const current = controller.getState();
        if (current.dismissedUntil > Date.now()) { schedule(current); return; }
        if (current.canSuggest) show('auto');
      }, Math.min(wait, 2147483647));
    }
    function sync(event = {}) {
      if (destroyed) return;
      const state = controller.getState();
      const completed = state.status === 'standalone' || state.status === 'installed';
      const waiting = state.status === 'pending';
      element.dataset.pwaState = state.status;
      for (const button of buttons) {
        button.disabled = state.busy || waiting;
        button.hidden = completed || waiting || button !== trigger && !state.canPrompt;
      }
      if (completed || waiting || state.busy || event.type === 'dismiss') close();
      for (const helper of helpers) {
        const key = state.status === 'unavailable' ? 'unavailable' : state.platform;
        helper.hidden = state.canPrompt || helper.dataset.pwaHelp !== key;
      }
      if (status) {
        if (event.type === 'error' && event.operation === 'install') status.hidden = false;
        else if (event.type === 'prompt' || state.canPrompt) status.hidden = true;
      }
      if (event.type === 'error' && event.operation === 'install' && banner && !completed && !waiting) {
        open = true; banner.hidden = false;
      }
      if (event.type === 'dismiss') { dismissedHere = true; emit('dismiss', { dismissedUntil: state.dismissedUntil }); }
      if (event.type === 'choice') emit('choice', { outcome: event.outcome });
      if (event.type === 'installed') emit('installed');
      if (event.type === 'error') emit('error', { error: event.error, operation: event.operation });
      schedule(state);
    }
    function show(reason = 'manual') {
      const state = controller.getState();
      if (destroyed || !banner || state.busy || ['installed', 'standalone', 'pending'].includes(state.status)) return false;
      clearTimer();
      sync();
      clearTimer();
      open = true; banner.hidden = false;
      if (reason === 'manual') banner.focus();
      emit('show', { reason, status: state.status });
      return true;
    }
    function install() {
      if (destroyed) return Promise.resolve({ outcome: 'unavailable' });
      if (!controller.getState().canPrompt) {
        show();
        return Promise.resolve({ outcome: 'instructions' });
      }
      return controller.install({ dismissDays: options.dismissDays });
    }
    function dismiss() {
      if (!destroyed) controller.dismiss(options.dismissDays);
    }
    const clickInstall = () => { void install(); };
    buttons.forEach(button => button.addEventListener('click', clickInstall));
    dismissButtons.forEach(button => button.addEventListener('click', dismiss));
    const unsubscribe = controller.subscribe(sync);
    configure();
    const observer = window.MutationObserver ? new window.MutationObserver(() => { configure(); sync(); }) : null;
    observer?.observe(element, { attributes: true, attributeFilter: ['data-pwa-prompt', 'data-pwa-delay', 'data-pwa-dismiss-days', 'data-pwa-placement'] });
    const view = {
      element, controller, show, install, dismiss,
      getState: () => ({ ...controller.getState(), bannerOpen: open }),
      update(next = {}) { if (!destroyed) { overrides = { ...overrides, ...next }; configure(); sync(); } },
      destroy() {
        if (destroyed) return;
        close(); destroyed = true; clearTimer();
        observer?.disconnect(); unsubscribe();
        buttons.forEach(button => button.removeEventListener('click', clickInstall));
        dismissButtons.forEach(button => button.removeEventListener('click', dismiss));
        buttons.forEach(button => { button.hidden = true; button.disabled = false; });
        lease?.release();
        instances.delete(element);
      },
    };
    instances.set(element, view);
    sync();
    return view;
  }
  return Object.freeze({ create, mount, defaults });
});
