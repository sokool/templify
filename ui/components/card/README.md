# Card

Independent content card with a blurred hover/focus shadow, shared theme colours, compact content and action menu. No Kanban board, application model, routing, assets package or storage dependency.

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

## Authoring tool

`configurator/configurator.js` / `configurator/configurator.css` are editor-only and excluded from exports. Create one `DesignSystemCardTool` controller with injected `themes` and a shared CSS `target`. Optional `settings` / `previewSettings` migrate the older global preferences once, into the active theme only. Background and Border accept only roles or Brand/Accent/Greys references from the active Palette. There are no custom HEX controls or saved colour fallbacks. Changes apply to every Card, including Kanban.

The page puts **Configuration** first and a clearly separated **Preview** beneath it, each with a heading and description. One Form **Size** slider controls the square's edge (160–1200px in 10px steps). Existing sizes are rounded to the nearest 10px. The square fits the available width; Kanban still owns its card dimensions.

The tool also uses shared Form selects for normal/hover-focus shadow profiles, a compact **Card menu** switch and a shared Button for **Reset to defaults**. Reset restores the selected theme's Card colours, profiles, preview size and enabled menu without resetting Palette definitions or other themes.

All preferences, including preview size and menu visibility, belong to the selected theme under `$extensions["org.topschrank.components"].card`. They round-trip through theme copies, persistence and token/template exports. CSS export includes the appearance bindings. Switching themes restores that theme's controls; shared shadow definitions are edited in **Tools → Shadows**. The example host injects `menuEnabled` into every Card, including Kanban, and disposes its subscription with the Card.

The compact control layout uses `tools/tools.css` (`ds-tool`), independently of the preview. Generic picker/shadow editors live under `tools/` and can also be opened from the **Tools** submenu.

[Composed example](../../../app/index.html#topschrank.components.card). Node tests cover independent content, menu, lifecycle and text safety. Browser checks are documented under Kanban board.
