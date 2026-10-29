/* Card content and action menu. No Kanban, domain model, storage or routing dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemCard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  let sequence = 0;
  function mount(element, options = {}) {
    const doc = element.ownerDocument,
      win = doc.defaultView;
    let state = {
        title: '',
        subtitle: '',
        description: '',
        metaLeft: '',
        metaRight: '',
        footer: '',
        actions: [],
        menuEnabled: true,
        device: 'auto',
        ...options,
      },
      destroyed = false,
      menuOpen = false;
    const prefix = 'ds-card-' + ++sequence,
      listeners = [];
    element.classList.add('ds-component');
    element.classList.add('ds-card');
    element.tabIndex = -1;
    const make = (tag, cls, text) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = String(text);
      return n;
    };
    const main = make('button', 'ds-card__main'),
      trigger = make('button', 'ds-card__menu-trigger'),
      menu = make('div', 'ds-component ds-card-menu');
    main.type = trigger.type = 'button';
    menu.id = prefix + '-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('popover', 'manual');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', menu.id);
    trigger.append(make('span', '', '⠿'));
    trigger.firstElementChild?.setAttribute('aria-hidden', 'true');
    doc.body.append(menu);
    element.append(main, trigger);
    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push(() => target.removeEventListener(type, fn, opts));
    }
    function close(restore = false) {
      menuOpen = false;
      menu.hidden = true;
      if (menu.matches(':popover-open')) menu.hidePopover();
      trigger.setAttribute('aria-expanded', 'false');
      if (restore && !destroyed) trigger.focus({ preventScroll: true });
    }
    function position() {
      const rect = trigger.getBoundingClientRect(),
        box = menu.getBoundingClientRect();
      menu.style.left =
        Math.max(8, Math.min(rect.right - box.width, win.innerWidth - box.width - 8)) + 'px';
      menu.style.top =
        Math.max(8, Math.min(rect.bottom + 5, win.innerHeight - box.height - 8)) + 'px';
    }
    function renderMenu(items = state.actions, nested = false) {
      menu.replaceChildren();
      if (nested) {
        const back = make('button', '', '← Back');
        back.type = 'button';
        back.setAttribute('role', 'menuitem');
        back.addEventListener('click', () => renderMenu());
        menu.append(back);
      }
      for (const item of items) {
        const button = make('button', '', item.label);
        button.type = 'button';
        button.setAttribute('role', 'menuitem');
        button.disabled = Boolean(item.disabled);
        if (item.children) button.setAttribute('aria-haspopup', 'menu');
        button.addEventListener('click', (event) => {
          if (button.disabled) return;
          if (item.children) {
            renderMenu(item.children, true);
            return;
          }
          close();
          item.onSelect?.(event);
          state.onAction?.(item.id, event);
        });
        menu.append(button);
      }
      if (menuOpen) {
        position();
        menu.querySelector('button:not(:disabled)')?.focus();
      }
    }
    function open() {
      if (state.menuEnabled === false || !state.actions.length) return;
      menu.hidden = false;
      if (menu.showPopover) menu.showPopover();
      menuOpen = true;
      trigger.setAttribute('aria-expanded', 'true');
      renderMenu();
    }
    function render() {
      close();
      main.replaceChildren();
      main.append(make('strong', 'ds-card__title', state.title));
      if (state.subtitle) main.append(make('span', 'ds-card__subtitle', state.subtitle));
      if (state.description) main.append(make('span', 'ds-card__description', state.description));
      if (state.metaLeft || state.metaRight) {
        const meta = make('span', 'ds-card__meta');
        meta.append(
          make('span', 'ds-card__meta-left', state.metaLeft),
          make('span', 'ds-card__meta-right', state.metaRight),
        );
        main.append(meta);
      }
      if (state.footer) {
        const foot = make('span', 'ds-card__footer', state.footer);
        foot.dataset.muted = String(Boolean(state.footerMuted));
        main.append(foot);
      }
      main.setAttribute('aria-label', state.ariaLabel || 'View ' + state.title);
      trigger.setAttribute('aria-label', 'Actions for ' + state.title);
      trigger.dataset.tooltip = 'Card actions';
      trigger.hidden = state.menuEnabled === false || !state.actions.length;
      element.dataset.menu = String(!trigger.hidden);
      element.dataset.device = state.device;
      if (state.descriptionId) main.setAttribute('aria-describedby', state.descriptionId);
      else main.removeAttribute('aria-describedby');
      menu.setAttribute('aria-label', 'Actions for ' + state.title);
    }
    listen(main, 'click', (event) => {
      if (!event.defaultPrevented) state.onActivate?.(event);
    });
    listen(trigger, 'click', (event) => {
      event.stopPropagation();
      menuOpen ? close(true) : open();
    });
    listen(menu, 'keydown', (event) => {
      const buttons = [...menu.querySelectorAll('button:not(:disabled)')],
        at = buttons.indexOf(doc.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (at + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab') close();
    });
    listen(
      doc,
      'pointerdown',
      (event) => {
        if (menuOpen && !menu.contains(event.target) && !trigger.contains(event.target)) close();
      },
      true,
    );
    listen(
      doc,
      'scroll',
      () => {
        if (menuOpen) close();
      },
      { capture: true, passive: true },
    );
    listen(win, 'resize', () => close());
    render();
    return {
      element,
      focus() {
        main.focus({ preventScroll: true });
      },
      canDrag(target) {
        return !trigger.contains(target);
      },
      closeMenu: close,
      update(next) {
        if (destroyed) return;
        state = { ...state, ...next };
        render();
      },
      destroy() {
        destroyed = true;
        close();
        listeners.forEach((off) => off());
        menu.remove();
        element.replaceChildren();
        element.classList.remove('ds-card');
        element.classList.remove('ds-component');
        delete element.dataset.device;
        delete element.dataset.menu;
      },
    };
  }
  return Object.freeze({ mount });
});
