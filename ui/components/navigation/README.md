# Navigation

The responsive application frame: header, positionable sidebar/rail or horizontal
menu, connected flyouts, search, mobile drawers and an optional bottom action dock.
The main application and portable export use this same implementation. Navigation
owns both collapse controls, animations, overflow helpers and their cleanup; no
`workspace/` files are required.

## HTML-first integration

Use `navigation.html` as the source template and see [UI](../../README.md) for
export and automatic `data-ui="navigation"` initialization. The controller adopts
existing menu links and buttons rather than replacing server-rendered content.
Retain the documented classes, `data-menu-page` item IDs, `data-menu-group` group
IDs, and matching `aria-controls`/submenu IDs. Wrap the shell in
`.navigation-viewport`, or provide a parent with `container: ui-preview / inline-size`.

```html
<section
  id="menu-live"
  class="menu-live ds-navigation"
  data-ui="navigation"
  data-menu-design="sidebar"
  data-collapse="true"
  data-search="true"
  data-search-shortcut="Mod+K"
  data-collapse-shortcut="Mod+B"
>
  <!-- Header, menu, footer and content from navigation.html. -->
</section>
```

| Feature | HTML attribute | JavaScript method | Default |
| --- | --- | --- | --- |
| Allow sidebar folding | `data-collapse="true/false"` | `setCollapse(boolean)` | `true` |
| Menu search | `data-search="true/false"` | `setSearch(boolean)` | `true` |
| Main menu position | `data-position="left/right/top/bottom"` | `setPosition(value)` | `left` |
| Mobile drawer side | `data-mobile-position="left/right"` | `setMobilePosition(value)` | Follow left/right menu; otherwise `left` |
| Bottom action dock | `data-dock="true/false"` | `setDock(boolean)` | `false` |

Attribute changes are observed after initialization. Methods update those same
attributes and apply the change immediately; there is one effective feature state.
Disabling collapse expands the desktop sidebar and hides both collapse controls.
On mobile it keeps navigation open, so destinations remain accessible without a
toggle. Disabling search hides its controls, clears the query and closes results.
The internal `data-sidebar-collapsed` marker is maintained by Navigation; consumers
do not need to set it. Both disabled features retain their user shortcut bindings.

HTML destinations can be ordinary `<a href="…">` links, including `target`/`rel`,
or `<button type="button">` actions with application click listeners. HTMX
attributes such as `hx-get`, `hx-target` and `hx-push-url` belong on the original
link/button. Navigation does not intercept native link navigation or modified
clicks. The exported client emits `ui:navigate` with `{ page }`; the host owns
routing, URLs, page content and Breadcrumbs.

## JavaScript integration and menu data

The [standalone example](example.html) runs directly from `file://`, without a
build, server, icon library or workspace code. Load shared `defaults.css` and
`primitives.css`, `shortcuts.js`, Window CSS/JS, Search CSS/JS, and Navigation
CSS/JS. Breadcrumbs and a custom `renderIcon(name)` adapter are optional.
Built-in SVG icons cover Navigation's own controls.

```js
DesignSystemNavigation.renderStructure(root);
const navigation = DesignSystemNavigation.mount(root, {
  items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/dashboard' },
    { id: 'projects', label: 'Projects', icon: 'folder', children: [
      { id: 'all', label: 'All projects', icon: 'list', href: '/projects' },
      { id: 'new', label: 'New project', icon: 'plus', onClick: openProjectDialog },
    ] },
  ],
});
navigation.setSearch(false);
navigation.setCollapse(true);
```

- Every item/group has a unique, nonempty `id` and a text `label`.
- `href` creates a real link. Without `href`, an item is a button;
  `onClick(event)` supplies an optional callback. `event.preventDefault()` cancels
  native navigation and the host navigation callback.
- `icon` is optional on both menu and submenu items; a label initial keeps items
  identifiable in the icon rail when no icon is supplied. `children` supplies a group.
- `disabled` prevents activation and excludes a destination from search.
- Optional `description`, `keywords`, `icon` and `image` metadata is passed to
  Search through the rendered menu's `data-search-*` attributes.
- Labels are rendered as text, never HTML; script/data URL schemes are neutralized.
- `setItems(items)` replaces menu data without duplicate handlers, preserving
  selection and expanded state for surviving IDs. Invalid IDs leave the current
  menu intact. HTML inserted into the menu is also adopted after DOM updates.
- `renderNavigation(root, items, { renderIcon })` remains available before mounting.
  Legacy `page`/`group`/`pages` input is accepted for compatibility.

`mount` automatically installs mobile navigation, independent scrolling regions,
collapse controls and the post-restoration motion gate. Repeated mounting returns
the same live controller. `installMobile()`/`installOverflow()` remain idempotent
compatibility methods; hosts no longer need to call them or reorganize menu DOM.

`slots.header`, `.breadcrumbs`, `.actions`, `.navigation`, `.footer`, `.content`
and `.search` expose composition points. Put host utility controls before
`navigation.sidebarToggle` in the footer; `.menu-utilities`, `.menu-utility` and
`.menu-utility-label` provide shared row styling. Actions such as theme selection
and device previews remain host-owned. Moving supplied DOM retains its listeners.
`slots.dock` exposes the catalogue-owned dock; register actions instead of appending
buttons directly to that region.

## Menu position and bottom dock

The header stays at the top. Left/right menus retain an expanded sidebar or icon
rail; top/bottom menus use a horizontal scrolling row with inward-opening submenus.
Folding the horizontal row hides labels without removing destinations. Changes
preserve selection, expanded groups and the saved collapse preference.
`mount(root, { position, mobilePosition, dock })` also accepts these defaults when
the corresponding HTML attributes are absent. Setters update attributes immediately;
invalid setter arguments return `false` without changing the active configuration.

```html
<section id="menu-live" class="menu-live ds-navigation" data-ui="navigation"
  data-menu-design="sidebar" data-position="right" data-mobile-position="right"
  data-dock="true">
  <!-- Keep the header, navigation, footer and content from navigation.html. -->
</section>
```

The compact dock is separate from the sidebar footer and remains fixed at the
bottom of the content area. It follows the content width as the sidebar folds,
handles action overflow with horizontal scrolling, and respects device safe areas.
The shell reserves its height so the last content remains reachable. A bottom
main menu sits above the dock, never behind it. On mobile the drawer ends above
the dock. Empty/disabled docks reserve no space.

Components expose actions by opting into the existing document Shortcuts catalogue,
not by registering another handler with Navigation:

```js
const shortcuts = DesignSystemShortcuts.create({ document });
const unregister = shortcuts.register({
  id: 'editor.save', label: 'Save', icon: 'plus', group: 'Editor',
  dock: { order: 10 }, // `true` is shorthand for order 0; lower orders come first.
  searchable: true, defaultShortcut: null,
  enabled: () => editor.canSave(),
  handler: () => editor.save() === true,
});
// After changing availability:
shortcuts.refresh('editor.save');
// On component destruction:
unregister();
```

`navigation.shortcuts` exposes this same catalogue. Dock and Search are independent
opt-ins. All activation paths call `shortcuts.execute`, which rechecks availability.
Unavailable actions are omitted; binding removal does not remove a dock action.
Registration before or after Navigation mounts works. `refresh(id)` updates
availability in mounted consumers without re-registering or changing preferences.
Disabling/destroying Navigation removes only its dock presentation, not actions
owned by other components. `slots.dock` exposes the generated labelled navigation
region; labels appear on pointer hover and keyboard focus. Dock buttons are
excluded from the document search index to avoid duplicate command results.

## Mobile drawer

At preview widths up to 620 px, the hamburger opens a drawer sliding in from the
selected edge of the preview. It fills the viewport height above any dock and occupies at least half
the preview width, growing to fit menu labels up to the preview width minus 16 px.
Long labels wrap at that limit. Destinations scroll independently above the pinned
footer, where Search and utility icons share one row; the page content does not move.
The drawer remains aligned in the centered
mobile preview as well as on an actual phone.

Opening focuses the drawer's close button. The close button, Escape, selecting a
destination or clicking outside dismisses it; keyboard/close-button dismissal
restores focus to the hamburger. Closing makes the drawer inert immediately.
Reduced-motion preferences disable the slide animation.

## Theme shadows

Navigation consumes shared foundation shadow profiles rather than keeping its own
shadow colours or geometry. Submenu and search popovers use `--ds-shadow-medium`;
the `data-popup-pattern="soft"` preset uses `--ds-shadow-soft` for both. The mobile
navigation drawer uses `--ds-shadow-medium`, while its inline submenus remain
shadowless.

Changes made through Themes, or by applying exported theme CSS, update already
mounted Navigation surfaces without remounting or replacing DOM. Shared profiles
are supplied by `defaults.css`, so Navigation does not require the optional Themes
runtime or its editor. A profile with zero opacity removes its shadows.

## Shared keyboard shortcuts

| Attribute | Shortcuts action ID | Default when omitted |
| --- | --- | --- |
| `data-search-shortcut` | `navigation.search` | `Mod+K` |
| `data-collapse-shortcut` | `navigation.toggleSidebar` | `Mod+B` |

`Mod` means Cmd or Ctrl, interchangeably. Any combination of Mod, Alt and Shift
with a letter/digit is supported, including `Shift+K`. Combinations of at least
two modifiers without a character, such as `Mod+Shift` or `Alt+Shift`, trigger
on the first release only when no other key was pressed.
An empty attribute declares no default binding. Invalid values fall back to the
built-in default (or a supplied JavaScript default). Changing an attribute updates
the registration default through Shortcuts, without overriding user preferences.
Reset in the Shortcuts editor restores the current declared default.

Navigation registers actions in the single document Shortcuts catalogue, even
when the editor is absent. Pass `shortcuts` to use the application's catalogue;
otherwise the shared document catalogue is obtained automatically. Shortcuts owns
dispatch, binding changes, disabling and reset. Saved user preferences take
precedence over HTML defaults. Disabling a feature disables its action, not its
binding; unmounting unregisters actions without losing document preferences.

Search opens a central Window globally, not a rail popover or the mobile menu.
The collapse action folds/unfolds desktop navigation or toggles mobile navigation.
Repeated held collapse keys are ignored. Browser defaults remain available when an
action cannot handle an event, including disabled search. Handled events, IME and
AltGraph are respected. Effective bindings appear in `aria-keyshortcuts`.

Existing JavaScript `searchShortcut`/`sidebarShortcut` mount options declare
defaults when HTML attributes are absent. `setSearchShortcut(value)` and
`setSidebarShortcut(value)` delegate user binding changes to Shortcuts; `null`
disables a binding. `setSearchEnabled` is a compatibility alias for `setSearch`.

## Search, state and lifecycle

Navigation delegates search to the independent [Search](../search/README.md)
component, which owns the central Window, optional menu magnifier, document index,
graphics, descriptions and commands. There is no inline input or rail popover.
The magnifier lives in the footer. Use
`navigation.search.update({showNavigationTrigger: false})` to hide only the
button while keeping Search and its shortcut enabled.
`navigation.search.update({showDockTrigger: true})` exposes that same Search action
in the bottom dock when `navigation.setDock(true)` is enabled. The footer and dock
options are independent and do not create another action or keyboard binding.
The compatibility integration keeps `navigation.search`, `data-search-shortcut`
and saved user bindings.

Search finds document links, named anchors and menu destinations, including
collapsed submenus. Results activate the original link/button, retaining callbacks
and HTMX. Arrow keys select, Enter activates, Escape/backdrop closes and restores
focus. Queries are transient. For a separate Search, set Navigation's
`data-search="false"` and Search's `data-navigation="#menu-live"`.

`navigation.toggleSidebar` is a searchable Shortcuts command. Other components
may expose actions through [the same contract](../shortcuts/README.md#searchable-component-actions),
with descriptions, icons and keywords, even without a key binding.

`search.setQuery(text)` returns rich results; menu results retain `page`, `label`
and `group`. `search.dialog`, `search.input`,
`.results`, `.enabled` and `.shortcuts` expose the live controls/catalogue.
`focusSearch()` reports whether focus succeeded. `select(id)`, `setCollapsed(bool)`,
`toggleSidebar()` and `toggleGroup(id)` remain available for local interactions.

`storage` is optional and injected; Navigation never reads global `localStorage`.
`storageKey` retains the existing `-sidebar-collapsed` and `-menu-groups` suffixes.
Restoration/saving tolerate storage failures. Call `remember()` as needed and
`destroy()` when disposing the controller. Cleanup removes generated helpers,
listeners and observers, unregisters actions and unwraps scroll regions, allowing
safe reinitialization and HTMX replacement.

**One Navigation per document**, using `id="menu-live"` and `id="menu-live-nav"`.
The parent viewport must measure the same width as the `ui-preview` CSS container.
The mobile breakpoint remains 620 px. Retained historical CSS overrides preserve
the existing appearance; general CSS cleanup is not part of this extraction.

## Validation

- `node --test ui/components/navigation/tests/*.test.cjs`
- `npx playwright test ui/testing/navigation.browser.cjs`
- `npm test` and `npm run test:browser` for complete regression checks.
