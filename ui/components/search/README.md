# Search

A theme-aware Spotlight/command palette for the current document. Search owns its
content, index and optional Navigation magnifier. Window supplies modal focus,
background inertness, scroll locking and reduced-motion-aware fade/scale animation.
Shortcuts owns all bindings and keyboard dispatch. No router, storage, workspace
or remote search service is required.

## Integration

Use `search.html` with [UI](../../README.md). The exported client adopts the
existing dialog and controls; Window's runtime/CSS dependencies are bundled once.

```html
<section id="global-search" data-ui="search"
  data-navigation="#menu-live" data-open-shortcut="Mod+K" data-compact="true">
  <!-- Dialog and optional opener from search.html. -->
</section>
<button type="button" data-search-open="global-search">Find anything</button>
```

Connecting `data-navigation` adds a magnifier to `.menu-sidebar-footer`, never
to the top of the menu. `data-show-navigation-trigger="false"` or
`update({showNavigationTrigger: false})` removes only this button: Search, its
keyboard binding and the connected menu's index remain available.
The workspace Search page includes a persisted switch for this option.
Without a menu connection Search is independent.
Navigation's existing `data-search="true"` already delegates to Search, retaining
`navigation.search` and saved bindings. When composing a separate Search with the
same menu, set Navigation's `data-search="false"` to disable its compatibility
palette. Do not connect multiple active palettes to one menu.

An internal `data-search-open` opens its palette; an external opener supplies the
Search root ID as its value. Multiple palettes need different `data-shortcut-id`
values (default `search.open`). Cmd and Ctrl are interchangeable (`Mod`); saved
Shortcuts preferences override declared defaults.

`data-compact="true"` or `update({compact: true})` uses smaller result rows, icons,
typography and spacing without hiding metadata or changing search behavior.
The workspace Search page has a persisted **Compact** switch; the default is off.

**Maximum results** on the same page sets a persisted limit of 1–100 results
(default 5), shared across all groups. Matching still searches every source.
Standalone integrations use `data-max-results="20"` or `update({maxResults: 20})`.

Classic usage loads foundations, `window.css`, `search.css`, `shortcuts.js`,
`window.js` and `search.js`, then calls:

```js
const search = DesignSystemSearch.mount(host, {
  navigation: menuRoot, // Optional element or selector.
  shortcuts,           // Optional shared catalogue.
  renderIcon,          // Optional trusted symbolic icon renderer.
});
search.open();
```

## Sources and metadata

Search indexes document links, headings with `id`, explicitly named
`[id][data-search-title]`/`[id][data-search-anchor]` elements, connected menu
destinations (including buttons and collapsed submenus), and opt-in Shortcuts
actions. Technical control IDs are not destinations.

```html
<a href="/docs#installation"
   data-search-title="Installation"
   data-search-description="Get the project running"
   data-search-keywords="setup configuration"
   data-search-group="Documentation">
  <img src="/images/install.svg" alt="Rocket illustration">
  Install
</a>
```

Title precedence: `data-search-title`, `aria-labelledby`, `aria-label`, link/menu
text, `title`, graphic label, URL. Description precedence:
`data-search-description`, `aria-describedby`, a distinct `title`.
Graphics come from existing images, inert SVG geometry, menu glyphs or explicit
`data-search-icon`/`data-search-image` metadata. Icon names use `renderIcon(name)`;
image `alt` and SVG accessible labels are searchable too.
`data-search-href` supplies a URL hint for buttons whose original handler owns
routing. `data-search-ignore` excludes an element and its subtree.

Result groups come from `data-search-group` when supplied; otherwise links
(including breadcrumbs) use **Links**, named page sections use **On this page**,
and navigation destinations use their parent menu group's label or **Menu**.
Shortcuts actions use their registered `group` or **Actions**.
Categories appear as small right-aligned labels on each result, not as section
headings. Long labels truncate visually; the full category remains in the
accessible result name and the label's tooltip. `data-group-results="false"`
hides the labels and keeps results in match-ranking order without grouping.

Matching covers titles, descriptions, URLs, decoded anchors, groups, keywords and
graphic labels. Multiword queries ignore case/accents; title matches rank first.
Empty queries show available destinations. Equivalent repeated links are
deduplicated, without merging differently titled destinations or menu actions.
Descriptions are not guessed; destination pages and image pixels are not scanned.

Hidden non-navigation content, disabled sources, templates, dialog internals,
Search's own results and unsafe URL protocols are excluded. Text remains text.
SVG previews exclude scripts, handlers, styles, foreign objects and references.
DOM/HTMX changes refresh results while open. Activation rechecks availability,
then uses the original source so callbacks and HTMX remain authoritative.
Modified link clicks retain native browser behavior.

## Options

Options also have matching root `data-*` attributes (`showIcons` → `data-show-icons`).
Attribute changes are observed; booleans use `"true"`/`"false"`.

| Option | Default |
| --- | --- |
| `navigation` | No menu connection |
| `showNavigationTrigger` / `data-show-navigation-trigger` | `true`; magnifier in the connected menu footer |
| `scope` | Current document; accepts a container or selector |
| `exclude` | No additional exclusion selector |
| `links`, `anchors`, `actions`, `enabled` | `true` |
| `showIcons`, `showDescriptions`, `showShortcuts` | `true` |
| `groupResults` / `data-group-results` | `true`; keep categories together and label each result on its right |
| `compact` / `data-compact` | `false`; smaller rows, graphics, typography and spacing |
| `maxResults`, `minLength` | `5` (1–100), `0` |
| `width`, `duration` | `680` px, `180` ms; viewport/reduced-motion bounded |
| `closeOnBackdrop` | `true` |
| `shortcut` / `data-open-shortcut` | `Mod+K`; empty declares no binding |
| `placeholder` | Search pages, links and actions… |

The view exposes `element`, `dialog`, `input`, `results`, `trigger`, `shortcuts`,
`shortcutId`, `shortcut`, `enabled`, `open()`/`focus()`, `close(reason)`, `isOpen()`,
`setQuery(text)` (current results), `refresh()`, `update(patch)`,
`setEnabled(boolean)`, `setShortcut(binding)` and `destroy()`.
Repeated mounting returns the live instance. Destroy removes observers, trigger,
listeners and its action, without destroying the shared catalogue.

Arrow keys select while focus stays in the combobox; Enter activates; Escape or
backdrop dismisses and restores focus. Result activation closes immediately before
running the original action so a newly opened component retains focus.
`onSelect({id,title,href,actionId})`, `onOpen()` and `onClose(reason)` are optional.
The exported client emits `ui:search-select`. Queries/history are not persisted.

## Component actions

Register once with Shortcuts, not separately with Search: a stable ID,
`searchable: true`, useful metadata, availability and a shared handler. A key
binding is optional. See [the action contract](../shortcuts/README.md#searchable-component-actions).

## Validation

`node --test ui/components/search/tests/*.test.cjs`

`npx playwright test ui/testing/search.browser.cjs ui/testing/navigation.browser.cjs`
