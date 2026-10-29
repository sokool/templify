# Navigation

The responsive application frame: header, expanded sidebar, 45 px icon rail, connected flyouts, mobile hamburger navigation and independently scrolling navigation/footer regions. This is the implementation used by `top-schrank-ui.html`, not a second simplified copy.

## Files and dependencies

- `navigation.js`: structure, data-driven navigation renderer, interaction controller.
- `navigation.css`: original shell rules in their existing cascade order, including responsive overrides. Historical overrides were retained deliberately to preserve the design during extraction.
- Shared `../../foundations/tokens.css` and `primitives.css`, loaded once.
- Shared `../shortcuts/shortcuts.js`, loaded before `navigation.js`.
- Search uses the real Form Field runtime: `../form/validation.js`, `field.js` and
  `form.css`. Form owns input geometry, border, typography and focus styling.
- No npm package, application router, order data, configuration editor or icon library is required.
- Breadcrumbs is a separate **optional composition**. Mount it into `shell.slots.breadcrumbs`. The live application uses its existing Breadcrumbs adapter and configured appearance unchanged.
- `tool.js` / `tool.css` provide optional compact authoring controls and are excluded from runtime exports. They reuse Form and Buttons in the host only.

The manifest lists exact export files. Exporting Navigation together with Breadcrumbs adds Breadcrumbs JS/CSS; include shared foundations only once. Configurators, preview controls and their storage are application code and are not part of this component export.

## Integration

Use the complete [standalone example](example.html) as the runnable integration reference. It runs directly from `file://`; no build or server is required.

1. Load shared foundations, Form stylesheet/validation/field, shell stylesheet, Shortcuts runtime and Navigation classic script.
2. Put the root inside a container with `container: ui-preview / inline-size`.
3. Call `renderStructure(root, { user: { initials, label } })` and `renderNavigation(root, entries, { renderIcon, submenuIcons })`.
4. Call `mount(root, { viewport, renderIcon, storage, storageKey, onNavigate, statusElement })`.
5. Supply existing page/utility DOM through `slots`. Moving a node retains its state and event listeners; nothing is cloned.
6. Move `shell.sidebarToggle` into `shell.slots.header` before Breadcrumbs. Call `installMobile()`.
7. Put primary items in `.workspace-nav-items`, excluding both `slots.footer` and `slots.search`. Insert the items before the footer, keeping Search first, then call `installOverflow({items, footer: shell.slots.footer, nav: shell.slots.navigation})` after utility controls exist.
8. On a route change, call `shell.select(page)`, update page content and Breadcrumbs in the host. The host remains responsible for URL hashes/history.
9. After synchronous restoration, set `root.dataset.motionReady = 'true'` after two animation frames. On `pagehide`, call `remember()`; call `destroy()` when disposing the controller.

`storage` is optional and injected. For the existing application its prefix remains `top-schrank`, retaining the exact saved sidebar/group keys. The component itself never reads global `localStorage`. A restricted storage adapter may throw; restoration and saving catch failures.

## Menu search

Search is enabled by default. `mount(root, { searchEnabled: false })` disables it;
`shell.setSearchEnabled(boolean)` changes it at runtime. The independent
`slots.search` section stays above the scrolling destinations. Expanded/mobile
menus show a Form Field search input; the icon rail shows a Search button opening the
same input in a viewport-constrained Popover. This flyout is flush with the rail's
right edge, with square left corners and the same outline, right-hand radii,
header fill and shadow tokens as menu submenus. It follows viewport scroll/resize
and narrows to the available space without introducing a gap from the rail.

Search covers every destination, including closed submenus, with group names and
case/accent-insensitive multiword matching. Results navigate through the existing
`onNavigate(page)` callback, without expanding groups or changing their saved
state. Arrow Up/Down moves through results, Enter activates and Escape clears or
closes search. Empty results are announced. Outside focus/click dismisses results;
mobile selection closes the hamburger menu. Queries are transient, never stored.

`shell.search.setQuery(text)` returns matched `{page,label,group}` records;
`shell.search.input`, `.results` and `.enabled` expose the live search state.
`findMenuItems(entries, query)` is the pure matching helper. Labels are rendered as
text, never interpreted as markup. Disabling search clears its query and closes
any open search popup. `destroy()` removes search DOM/listeners.

### Global keyboard shortcut

By default **Cmd+F / Ctrl+F** (`Mod+F`) opens/focuses menu search from anywhere in
the document, including other input fields. The icon rail opens its search Popover;
mobile opens the hamburger menu first. Existing query text is selected. The
shortcut is intercepted only when enabled search can receive focus; otherwise
browser Find remains available. Handled events, IME and AltGraph are respected.

Navigation registers `navigation.search` in the shared Shortcuts catalogue. Pass
`shortcuts` to `mount` to share the application's dispatcher; standalone consumers
get a private registry disposed with Navigation. Pass `searchShortcut` to `mount`,
or use `shell.setSearchShortcut('Mod+Shift+K')` to edit that same registry entry.
`Mod` means Cmd or Ctrl; Alt/Shift combinations with letters or numbers are also
supported. `null` disables only the shortcut. `shell.focusSearch()` returns whether
focus succeeded and does not change group/sidebar preferences. Shortcut listeners
are removed by `destroy()`. The effective shortcut is exposed with
`aria-keyshortcuts` on the search controls.

### Sidebar toggle shortcut

**Cmd+B / Ctrl+B** (`Mod+B`) toggles the sidebar through the same collapse API as
the button. Its catalogue ID is `navigation.toggleSidebar`. The desktop collapse
preference is saved as usual; mobile toggles the installed hamburger menu without
changing that desktop preference. It works independently of Menu search.

Use `shell.toggleSidebar()` directly, pass `sidebarShortcut` to `mount`, or call
`shell.setSidebarShortcut('Mod+Shift+M')`. `null` disables this binding. Holding the
keys does not repeatedly toggle. Already handled events, IME and AltGraph remain
untouched. The effective binding appears in `aria-keyshortcuts` on desktop and
mobile toggle buttons. Closing mobile navigation restores focus to its button;
desktop keeps focus outside Navigation, or moves it to the sidebar toggle when
the focused menu control might become hidden. `destroy()` unregisters the action.

## Navigation tool

The workspace Navigation page contains a compact **Menu search** switch,
**Search shortcut**, **Sidebar shortcut** recorders and **Reset to defaults**.
Focus the shortcut field and press the desired combination; Backspace/Delete
clears it. Cmd and Ctrl are recorded as portable `Mod`. Reset restores enabled
search, Cmd/Ctrl+F and Cmd/Ctrl+B for only the active theme.
`DesignSystemNavigationTool.create({themes, navigation, shortcuts})`
receives the shared Shortcuts tool adapter and mounts its Form recorder by ID.
Search visibility belongs to the selected theme's Navigation settings; bindings
belong only to `shortcuts.bindings['navigation.search']` and
`shortcuts.bindings['navigation.toggleSidebar']`. Editing them here or on
**Components → Shortcuts** changes the same preference. The host migrates previous
per-theme Navigation shortcut settings, including disabled bindings. Theme
changes/reloads/copies/exports retain their own setting. The runtime does not
depend on Palette or either configuration tool; only the shared Form Field runtime
is needed for search.

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
