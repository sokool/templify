# Card

Independent content card with a blurred hover/focus shadow, per-card lower accent, compact content and action menu. No Kanban board, application model, routing, assets package or storage dependency.

Load the two shared foundation styles once, then `card.css` and `card.js`. The global is `DesignSystemCard`; CommonJS is also supported. See `manifest.json` for export files.

```js
const card = DesignSystemCard.mount(document.createElement('article'), {
  title: 'Project title',
  subtitle: 'Location or secondary information',
  description: 'Plain text description',
  metaLeft: 'REF-001',
  metaRight: '14,200 PLN',
  footer: '4 November 2026',
  footerMuted: false,
  accent: '#06D6A0',
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

## Responsive responsibility

Card owns content layout, wrapping and typography. Its own container query adapts metadata/title sizing below 185px; `device: mobile` allows four description lines instead of three. The host controls width. Metadata stays left/right aligned and can wrap without overflowing. It has no selectors for a parent board.

The board owns gesture recognition, pickup animation, drop targets and movement. A Card used without a board has no implicit drag behaviour. This avoids two competing gesture handlers on one element.

## Appearance and lifecycle

Shared semantic colours/font are inherited; local `--ds-card-accent` controls the lower edge. No font/theme configurator is imported. Menus live in the document top layer when supported, with a positioned fallback. `destroy()` removes menu DOM and listeners.

[Composed example](../../examples/index.html#topschrank.components.card). Node tests cover independent content, menu, lifecycle and text safety. Browser checks are documented under Kanban board.
