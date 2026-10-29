/* Plain script for file:// previews; CommonJS export for dependency-free tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemBreadcrumbs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const colourSchemes = Object.freeze({
    hierarchy: 'Tonal hierarchy', progressive: 'Depth gradient',
    alternating: 'Alternating blue / neutral', 'accent-trail': 'Palette trail',
    'current-only': 'Current level only', 'neutral-ramp': 'Derived grey steps',
    nearby: 'Emphasise recent levels', monochrome: 'Monochrome'
  });
  const weightSchemes = Object.freeze({
    contrast: { name: 'Strong current', top: 800, brand: 400, parent: 450, current: 800 },
    balanced: { name: 'Balanced', top: 700, brand: 400, parent: 500, current: 700 },
    quiet: { name: 'Quiet', top: 600, brand: 400, parent: 400, current: 600 },
    uniform: { name: 'Uniform medium', top: 500, brand: 500, parent: 500, current: 500 }
  });
  const hoverDetails = Object.freeze({
    curve: 'Soft curve', line: 'Fine line', dot: 'Small dot', dash: 'Dashed line',
    double: 'Double line', marker: 'Short marker', tint: 'Soft highlight',
    glow: 'Soft glow', corners: 'Corner detail', wave: 'Wave', draw: 'Drawn underline', none: 'Colour only'
  });
  const defaults = Object.freeze({
    size: 23, scheme: 'hierarchy', weight: 'contrast', hover: 'curve',
    brandFocus: true, longPaths: 'collapse', separator: '.',
    colours: Object.freeze({ brand: 'var(--ds-colour-text)', parent: 'var(--ds-colour-muted)', current: 'var(--ds-colour-text)', dot: 'var(--ds-colour-muted)', hover: 'var(--ds-colour-accent)' }),
    accent: 'var(--ds-colour-accent)', panel: 'var(--ds-colour-panel)', border: 'var(--ds-colour-border)', text: 'var(--ds-colour-text)', soft: 'var(--ds-colour-soft)',
    accents: Object.freeze(['var(--ds-accent-1)','var(--ds-accent-2)','var(--ds-accent-3)','var(--ds-accent-4)','var(--ds-accent-5)','var(--ds-accent-6)']),
    greys: Object.freeze(['var(--ds-grey-400)','var(--ds-grey-500)','var(--ds-grey-700)','var(--ds-grey-900)'])
  });

  function normalizeAppearance(input = {}) {
    return {
      ...defaults, ...input,
      size: Math.min(48, Math.max(10, Number(input.size) || defaults.size)),
      scheme: colourSchemes[input.scheme] ? input.scheme : defaults.scheme,
      weight: weightSchemes[input.weight] ? input.weight : defaults.weight,
      hover: hoverDetails[input.hover] ? input.hover : defaults.hover,
      longPaths: input.longPaths === 'full' ? 'full' : 'collapse',
      colours: { ...defaults.colours, ...input.colours },
      accents: input.accents?.length ? input.accents : [...defaults.accents],
      greys: input.greys?.length ? input.greys : [...defaults.greys]
    };
  }

  function levelColour(index, count, input = {}) {
    const settings = normalizeAppearance(input), current = index === count - 1;
    const t = count <= 1 ? 1 : index / (count - 1), c = settings.colours;
    if (current && settings.brandFocus) return settings.accent;
    switch (settings.scheme) {
      case 'progressive': return `color-mix(in srgb,${c.current} ${Math.round(35 + t * 65)}%,${c.parent})`;
      case 'alternating': return current ? c.current : index % 2 === 0 ? settings.accent : c.parent;
      case 'accent-trail': return current ? c.current : settings.accents[index % settings.accents.length];
      case 'current-only': return current ? c.current : `color-mix(in srgb,${c.parent} 70%,${settings.panel})`;
      case 'neutral-ramp': return current ? c.current : settings.greys[Math.min(settings.greys.length - 1, Math.floor(t * settings.greys.length))];
      case 'nearby': return current ? c.current : index === count - 2 ? c.parent : `color-mix(in srgb,${c.parent} 70%,${settings.panel})`;
      case 'monochrome': return c.current;
      default: return current ? c.current : c.parent;
    }
  }

  function safeHref(value) {
    const href = String(value ?? '#');
    // Keep regular links and anchors; never interpret caller text as script.
    return /^(?:javascript|data|vbscript):/i.test(href.replace(/[\u0000-\u0020]/g, '')) ? '#' : href;
  }

  function mount(element, options = {}) {
    if (!element || element.tagName.toLowerCase() !== 'nav') throw new TypeError('Breadcrumbs mount target must be a nav element.');
    const doc = element.ownerDocument;
    let state = { items: [], label: 'Breadcrumb', ...options, appearance: normalizeAppearance(options.appearance) };
    let overflow = null, destroyed = false;
    element.classList.add('ds-component');element.classList.add('ds-breadcrumbs');

    function create(tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function link(item, index, menu = false) {
      const node = create('a', (menu ? 'ds-breadcrumbs__menu-link' : 'ds-breadcrumbs__link') + ' ds-focusable');
      node.href = safeHref(item.href);
      node.dataset.breadcrumbIndex = String(index);
      if (index === state.items.length - 1) node.setAttribute('aria-current', 'page');
      if (index === 0 && !menu) {
        node.classList.add('ds-breadcrumbs__brand');
        const label = String(item.label ?? '');
        const length = Math.max(0, Math.min(label.length, Number(item.emphasisLength) || 0));
        if (length) node.append(create('strong', '', label.slice(0, length)), create('span', '', label.slice(length)));
        else node.textContent = label;
      } else node.textContent = String(item.label ?? '');
      if (index > 0 && !menu) node.style.setProperty('--ds-bc-level-colour', levelColour(index - 1, state.items.length - 1, state.appearance));
      return node;
    }
    function separator() { const node = create('span', 'ds-breadcrumbs__separator', state.appearance.separator); node.setAttribute('aria-hidden', 'true'); return node; }
    function render() {
      const a = state.appearance, weights = weightSchemes[a.weight];
      element.setAttribute('aria-label', state.label);
      element.dataset.hover = a.hover;
      element.style.setProperty('--ds-bc-size', a.size + 'px');
      Object.entries(a.colours).forEach(([key, value]) => element.style.setProperty('--ds-bc-' + key, value));
      ['top', 'brand', 'parent', 'current'].forEach(key => element.style.setProperty('--ds-bc-' + key + '-weight', weights[key]));
      ['accent', 'panel', 'border', 'text', 'soft'].forEach(key => element.style.setProperty('--ds-bc-' + key, a[key]));
      const list = create('ol', 'ds-breadcrumbs__list');
      const collapse = a.longPaths === 'collapse' && state.items.length > 3;
      overflow = null;
      state.items.forEach((item, index) => {
        if (collapse && index > 0 && index < state.items.length - 2) {
          if (index !== 1) return;
          const row = create('li', 'ds-breadcrumbs__entry');
          row.append(separator());
          overflow = create('details', 'ds-breadcrumbs__overflow');
          const summary = create('summary', 'ds-focusable', '…');
          summary.setAttribute('aria-label', 'Show ' + (state.items.length - 3) + ' earlier levels');
          const menu = create('div', 'ds-breadcrumbs__overflow-menu');
          state.items.slice(1, -2).forEach((hidden, i) => menu.append(link(hidden, i + 1, true)));
          overflow.append(summary, menu); row.append(overflow); list.append(row); return;
        }
        const row = create('li', 'ds-breadcrumbs__entry');
        if (index) row.append(separator());
        row.append(link(item, index)); list.append(row);
      });
      element.replaceChildren(list);
    }
    function onClick(event) {
      const target = event.target.closest('a[data-breadcrumb-index]');
      if (!target || !element.contains(target) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (overflow) overflow.open = false;
      if (state.onNavigate) {
        event.preventDefault();
        state.onNavigate({ ...state.items[Number(target.dataset.breadcrumbIndex)] }, event);
      }
    }
    function dismiss(event) { if (overflow && !element.contains(event.target)) overflow.open = false; }
    function onKey(event) { if (event.key === 'Escape' && overflow?.open) { overflow.open = false; overflow.querySelector('summary').focus(); } }
    element.addEventListener('click', onClick);
    element.addEventListener('keydown', onKey);
    doc.addEventListener('pointerdown', dismiss);
    render();
    return {
      element,
      update(next = {}) {
        if (destroyed) throw new Error('Cannot update destroyed Breadcrumbs.');
        state = { ...state, ...next, appearance: normalizeAppearance({ ...state.appearance, ...next.appearance, colours: { ...state.appearance.colours, ...next.appearance?.colours } }) };
        render();
      },
      destroy() {
        element.removeEventListener('click', onClick); element.removeEventListener('keydown', onKey); doc.removeEventListener('pointerdown', dismiss);
        element.replaceChildren(); element.classList.remove('ds-breadcrumbs');element.classList.remove('ds-component');
        element.removeAttribute('data-hover'); element.removeAttribute('aria-label');
        [...element.style].filter(key => key.startsWith('--ds-bc-')).forEach(key => element.style.removeProperty(key));
        destroyed = true;
      }
    };
  }
  return Object.freeze({ mount, normalizeAppearance, levelColour, colourSchemes, weightSchemes, hoverDetails, defaults });
});
