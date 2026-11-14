/* Host composition: source-template preview, shared installation service and persistence. */
(function (root) {
  'use strict';
  function mount(host, { controller, windows, global = false } = {}) {
    const document = host.ownerDocument;
    const container = document.createElement('div');
    const disposables = [];
    const abort = new AbortController();
    let destroyed = false;
    host.append(container);
    const make = (tag, text) => {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      return node;
    };
    if (!global) {
      const lead = make('p', 'Install this app on a phone or computer. The button opens a native installer when available, or shows instructions for your browser.');
      lead.className = 'example-lead';
      const status = make('p');
      status.className = 'example-status';
      status.setAttribute('role', 'status');
      const sync = () => { status.textContent = 'Installation state: ' + controller.getState().status + '. Offline caching and push notifications are not enabled.'; };
      sync();
      disposables.push({ destroy: controller.subscribe(sync) });
      container.append(lead, status);

      const usage = make('div');
      usage.append(make('p', 'The PWA template composes Buttons. The installation controller has no runtime component dependencies. The host supplies persistence and the app manifest.'));
      for (const [name, id, description] of [
        ['Buttons', 'buttons', 'Install, dismiss and component-panel controls.'],
        ['Window', 'window', 'This host-owned panel, not part of the PWA runtime.'],
      ]) {
        const line = make('p'), link = make('a', name);
        link.href = '#topschrank.components.' + id;
        line.append(link, document.createTextNode(' — ' + description));
        usage.append(line);
      }
      const edge = make('div');
      edge.className = 'component-page-edge-tabs';
      edge.setAttribute('role', 'group');
      edge.setAttribute('aria-label', 'Component panels');
      const icon = make('span');
      icon.className = 'component-page-edge-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = root.DesignSystemIcons.svg('layers');
      const panel = (windows?.forWindow('pwa.used-components') || root.DesignSystemWindow).mount(container, {
        title: 'Used components', mode: 'side', side: 'right', lockScroll: false,
        content: usage, initialFocus: 'a',
        onOpen() { button.element.setAttribute('aria-expanded', 'true'); },
        onClose() { button.element.setAttribute('aria-expanded', 'false'); },
      });
      const button = root.DesignSystemButtons.mount(edge, {
        label: 'Used components', icon, variant: 'secondary', onClick: () => panel.open(),
      });
      button.element.setAttribute('aria-haspopup', 'dialog');
      button.element.setAttribute('aria-controls', panel.element.id);
      button.element.setAttribute('aria-expanded', 'false');
      const navigate = event => {
        if (event.target.closest('a')) panel.close('navigate', { immediate: true });
      };
      usage.addEventListener('click', navigate);
      document.body.append(edge);
      disposables.push({ destroy() {
        usage.removeEventListener('click', navigate);
        panel.destroy(); button.destroy(); edge.remove();
      } });
    }
    // Use the exportable source rather than keeping another demo implementation.
    fetch(new URL('./ui/components/pwa/pwa.html', document.baseURI), { signal: abort.signal })
      .then(response => {
        if (!response.ok) throw new Error('Could not load PWA template');
        return response.text();
      })
      .then(html => {
        if (destroyed) return;
        const template = document.createElement('template');
        template.innerHTML = html;
        const element = template.content.querySelector('[data-ui="pwa"]');
        element.dataset.pwaPrompt = global ? 'auto' : 'manual';
        element.dataset.pwaPlacement = global ? 'fixed' : 'inline';
        if (global) element.querySelector('[data-pwa-trigger]').remove();
        container.append(element);
        disposables.push(root.DesignSystemPWA.mount(element, { controller }));
      })
      .catch(error => {
        if (!destroyed && !global && error.name !== 'AbortError') container.append(make('p', 'The installation preview could not be loaded. Please refresh the page.'));
      });
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true; abort.abort();
        disposables.reverse().forEach(view => view.destroy());
        container.remove();
      },
    };
  }
  root.ExamplePWA = { mount };
})(globalThis);
