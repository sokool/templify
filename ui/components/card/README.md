# Card

Independent content card with a blurred hover/focus shadow, shared theme colours, compact content and action menu. No Kanban board, application model, routing, assets package or storage dependency.

For HTML-first export use `card.html` and [UI](../../README.md). The following classic API remains supported: load foundations, `card.css` and `card.js`; global `DesignSystemCard`, also CommonJS.

```js
const card = DesignSystemCard.mount(document.createElement('article'), {
  title: 'Project title',
  subtitle: 'Location or secondary information',
  description: 'Plain text description',
  metaLeft: 'REF-001',
  metaRight: '14,200 PLN',
  footer: '4 November 2026',
  footerMuted: false,
  device: 'mobile', // auto | desktop | tablet | mobile
  onActivate() {},
  actions: [{id: 'open', label: 'View details', onSelect() {}}]
});
container.append(card.element);
card.update({title: 'Updated title'});
card.destroy();
```

`metaLeft`, `metaRight` and `footer` are preformatted text. Card knows nothing about references, prices, dates or customers. The host supplies these meanings. Text is never interpreted as HTML.

Actions accept `{id,label,disabled?,onSelect?,children?}`. Nested actions, arrow keys, Home/End, Escape, Tab, outside-pointer dismissal and scroll dismissal are built in. Optional `onAction(id,event)` observes leaf actions. `focus()` focuses the main content button; `canDrag(target)` excludes the action trigger. `closeMenu()` allows a composing drag container to dismiss the menu before pickup.

`menuEnabled` defaults to `true`. Set it to `false` to hide the action trigger and
close any open menu, without removing actions or changing the main activation.
Updating it back to `true` restores the supplied actions.

## Responsive responsibility

Card owns content layout, wrapping and typography. Its own container query adapts metadata/title sizing below 185px; `device: mobile` allows four description lines instead of three. The host controls width. Metadata stays left/right aligned and can wrap without overflowing. It has no selectors for a parent board.

The board owns gesture recognition, pickup animation, drop targets and movement. A Card used without a board has no implicit drag behaviour. This avoids two competing gesture handlers on one element.

## Appearance and lifecycle

Shared semantic colours, font family, body size, weights, line height and border style are inherited. Metadata/footer use the same font as the rest of the card and stay at its bottom when the host supplies extra height. `--ds-card-background` defaults to the theme's Panel role; `--ds-card-accent` defaults to Border and colours the 1px outline and 4px lower edge. The old per-card `accent` option is no longer applied.

`--ds-card-shadow` and `--ds-card-shadow-interactive` select shared shadow profiles, defaulting to None and Soft. Keyboard focus retains an outline even when shadows are disabled. No font/theme configurator is imported. Menus live in the document top layer when supported, with a positioned fallback. `destroy()` removes menu DOM and listeners.

## HTML-first configuration

The configurator has been removed. HTML defines the content and optional menu;
`data-size` sets width in px (160–1200), `data-menu="false"` disables the menu.
The trigger and menu may be omitted altogether. `Templify.get(card)` exposes
`openMenu()`, `closeMenu()` and `update({size, menuEnabled})`. Existing DOM and
its `hx-*` attributes are preserved. Colours and shadows remain CSS concerns.

[Composed example](../../../index.html#topschrank.components.card). Node tests cover independent content, menu, lifecycle and text safety. Browser checks are documented under Kanban board.
