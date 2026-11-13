# Navigation

The responsive application frame: header, expanded sidebar, icon rail, connected
flyouts, search, mobile navigation and independently scrolling menu/footer regions.
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
`primitives.css`, Form `form.css`/`validation.js`/`field.js`, `shortcuts.js`, and
Navigation CSS/JS. Breadcrumbs and a custom `renderIcon(name)` adapter are optional.
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

## Theme shadows

Navigation consumes shared foundation shadow profiles rather than keeping its own
shadow colours or geometry. Submenu and search popovers use `--ds-shadow-medium`;
the `data-popup-pattern="soft"` preset uses `--ds-shadow-soft` for both. The mobile
navigation dropdown uses `--ds-shadow-medium`, while its inline submenus remain
shadowless.

Changes made through Themes, or by applying exported theme CSS, update already
mounted Navigation surfaces without remounting or replacing DOM. Shared profiles
are supplied by `defaults.css`, so Navigation does not require the optional Themes
runtime or its editor. A profile with zero opacity removes its shadows.

## Shared keyboard shortcuts

| Attribute | Shortcuts action ID | Default when omitted |
| --- | --- | --- |
| `data-search-shortcut` | `navigation.search` | `Mod+F` |
| `data-collapse-shortcut` | `navigation.toggleSidebar` | `Mod+B` |

`Mod` means Cmd or Ctrl; Alt/Shift combinations with letters/digits are supported.
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

Search focuses globally, opening the rail popup or mobile menu when necessary.
The collapse action folds/unfolds desktop navigation or toggles mobile navigation.
Repeated held collapse keys are ignored. Browser defaults remain available when an
action cannot handle an event, including disabled search. Handled events, IME and
AltGraph are respected. Effective bindings appear in `aria-keyshortcuts`.

Existing JavaScript `searchShortcut`/`sidebarShortcut` mount options declare
defaults when HTML attributes are absent. `setSearchShortcut(value)` and
`setSidebarShortcut(value)` delegate user binding changes to Shortcuts; `null`
disables a binding. `setSearchEnabled` is a compatibility alias for `setSearch`.

## Search, state and lifecycle

Search matches every destination, including closed submenus, using group names
and case/accent-insensitive multiword matching. Results activate the original
link/button, including callbacks and HTMX behavior, without changing group state.
Arrow Up/Down moves through results, Enter activates, and Escape clears/closes.
Outside focus/click dismisses results; mobile activation closes the menu when
folding is allowed. Queries are transient and never stored.

`search.setQuery(text)` returns `{page,label,group}` matches. `search.input`,
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
