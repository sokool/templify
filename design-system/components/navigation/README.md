# Navigation

The responsive application frame: header, expanded sidebar, 45 px icon rail, connected flyouts, mobile hamburger navigation and independently scrolling navigation/footer regions. This is the implementation used by `top-schrank-ui.html`, not a second simplified copy.

## Files and dependencies

- `navigation.js`: structure, data-driven navigation renderer, interaction controller.
- `navigation.css`: original shell rules in their existing cascade order, including responsive overrides. Historical overrides were retained deliberately to preserve the design during extraction.
- Shared `../../foundations/tokens.css` and `primitives.css`, loaded once.
- No npm package, application router, order data, configuration editor or icon library is required.
- Breadcrumbs is a separate **optional composition**. Mount it into `shell.slots.breadcrumbs`. The live application uses its existing Breadcrumbs adapter and configured appearance unchanged.

The manifest lists exact export files. Exporting Navigation together with Breadcrumbs adds Breadcrumbs JS/CSS; include shared foundations only once. Configurators, preview controls and their storage are application code and are not part of this component export.

## Integration

Use the complete [standalone example](example.html) as the runnable integration reference. It runs directly from `file://`; no build or server is required.

1. Load shared foundations, shell stylesheet and classic script.
2. Put the root inside a container with `container: ui-preview / inline-size`.
3. Call `renderStructure(root, { user: { initials, label } })` and `renderNavigation(root, entries, { renderIcon, submenuIcons })`.
4. Call `mount(root, { viewport, renderIcon, storage, storageKey, onNavigate, statusElement })`.
5. Supply existing page/utility DOM through `slots`. Moving a node retains its state and event listeners; nothing is cloned.
6. Move `shell.sidebarToggle` into `shell.slots.header` before Breadcrumbs. Call `installMobile()`.
7. Put primary items in `.workspace-nav-items`, then call `installOverflow({items, footer: shell.slots.footer, nav: shell.slots.navigation})` after utility controls exist.
8. On a route change, call `shell.select(page)`, update page content and Breadcrumbs in the host. The host remains responsible for URL hashes/history.
9. After synchronous restoration, set `root.dataset.motionReady = 'true'` after two animation frames. On `pagehide`, call `remember()`; call `destroy()` when disposing the controller.

`storage` is optional and injected. For the existing application its prefix remains `top-schrank`, retaining the exact saved sidebar/group keys. The component itself never reads global `localStorage`. A restricted storage adapter may throw; restoration and saving catch failures.

## Preserved behaviour

- Expanded/rail state, remembered groups, no initial restore animation.
- Arrow-key group access, Escape/ArrowLeft dismissal, outside click and focus restoration.
- Current leaf and current parent selection; opening another group does not change the active route.
- Connected top-layer flyouts, flush against the icon rail, with placement constrained to viewport height.
- Mobile inline submenus and hamburger/X; the saved desktop rail state is retained across breakpoints.
- Main navigation and footer each scroll independently. Both direction indicators remain visible while overflowing, disabled at the relevant boundary.
- Sticky, fixed-height opaque header; header Breadcrumbs and menu icon alignment.
- Existing application theme/preview controls keep their original nodes and handlers in the footer slot.

## Version 0.1 boundary

This first extraction intentionally preserves compatibility identifiers and selectors. **One Navigation per document**, with root `id="menu-live"`; internal IDs belong to the component. This is a full-page layout component, not yet a multi-instance widget. The host's `viewport` must measure the same width as its `ui-preview` CSS container. Desktop/tablet preview selection is host-owned; mobile navigation changes at 620 px.

Legacy application colour variables are accepted with shared semantic-token fallbacks. Application-only content spacing and preview tools remain in the host. Do not remove/reorder the retained CSS overrides casually: visual cleanup is a separate refactor from this preservation-focused extraction.

## Validation

`node --test tests/*.test.cjs` exercises state restoration, group selection/focus, mobile dismissal, scroll boundaries, flyout positioning and listener/observer cleanup through a DOM fixture. These checks do not substitute for browser screenshots or touch-device visual verification.
