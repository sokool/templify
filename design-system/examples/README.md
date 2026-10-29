# Component composition examples

Open [index.html](index.html) directly in a browser. This is the shared integration workspace where extracted components will be assembled into one application.

The initial composition uses **Navigation + Breadcrumbs**. Menu selection, header path, current content and URL use one route registry. Breadcrumb links navigate through that same registry. Desktop/tablet/mobile previews and Light/Dark/Matrix themes use shared tokens and the Navigation footer slot. The host injects one shared settings service; older example keys are migrated without touching the original playground settings.

## Ownership

- `index.html` loads shared foundations once and imports component assets.
- `workspace.js` is the composition root: navigation data, routes, content renderers, icon data and connections between public component APIs.
- `workspace.css` contains example-page layout and utility controls only.
- `../components/` owns component markup renderers, styles and behaviour.
- `../foundations/` owns common tokens and primitives.

Do not copy component HTML/CSS/interaction logic here. Add a component's asset references to `index.html`, a destination to the `routes` and `navigation` data in `workspace.js`, and mount the component in its page renderer. Register content component instances in `contentComponents` so they are destroyed when leaving a page. Navigation and the header Breadcrumbs remain mounted across navigation.

Configuration tools live beside their component/layout element as `tool.js` when applicable; the composition loads them explicitly. Historical Breadcrumb tooling remains in `playground/`.

The smaller [shared-foundations.html](shared-foundations.html) remains a focused Breadcrumbs + Tabs demonstration. Per-component `example.html` files remain isolated usage references.

## Fonts tool

`../fonts/fonts.js` and `../fonts/fonts.css` are host-level configuration tools, not exported design-system components. The Fonts destination uses the same 16 typefaces as the original playground and includes a compact selector and Typography preview.

The tool loads Google Fonts, receives a host storage adapter mapped to `layout.fonts.family`, and sets the shared `--ds-font-family` token on the document root. Navigation, Breadcrumbs and future components consume that token (or inherit it); they do not know font names, storage keys, the catalogue or the font-loading service. Choosing a font applies throughout the composition, including after navigation and reload. Font previews need a connection to Google Fonts; system fonts are the fallback.

## Icons and glyphs tool

The Icons and glyphs destination mounts `../icons/icons.js`, with category data from `../icons/icon-categories.js`. It supplies search, 16–40 px size previews, hover/focus labels, clipboard copying and keyboard glyph examples. Those controls are host-level tools, not component runtime dependencies.

Menu, utility controls and the catalogue share `../icons/assets/icons.js`. The composition maps semantic navigation names to concrete asset names and injects the renderer into Navigation. The original playground also consumes the asset library and catalogue tool.

The icon catalogue contains 15 categories × 32 unique icons (480 total). Searching matches icon names, category names, upstream Lucide tags and aliases. Category counts show matches versus the full category size.

## Palette

Open `index.html#topschrank.palette`. Palette is an application configuration tool,
like Fonts, not a component. `../palette/tool.js` and `../palette/tool.css` render the
compact theme sectors (initially Light/Dark/Matrix) with colour and HEX editors, per-theme reset, adding/removing themes and a dynamic footer theme cycle,
and a collapsible reference catalogue (original brand palettes, derived greys and
15 Kanban accents in `../palette/palette-data.js`). Reference swatches copy HEX and do
not change theme values. Colour editors update semantic roles throughout the app;
clicking a sector activates that theme. The title is also a keyboard-accessible
selection control.

The composition creates one `DesignSystemThemes` controller from
`../foundations/themes.js`; both the editor and footer switch share it. Settings
are stored in the unified localStorage document at `tokens.themes`, with selected mode in `layout.theme`. Page selection
and font settings remain independent. `workspace.css` bridges semantic tokens to
the extracted Navigation's legacy variable names without coupling the editor to
Navigation. No component imports anything from `the host-level tool directories`.

## Migrated component composition

Components navigation also includes Accordion, Notifications, User identity,
Surface, Tooltip, Buttons and Badges. `components.js` supplies their example data,
callbacks and composition; runtime modules have no application dependency.
Buttons retain Split action; Badges retain Curved line. The Surface example also
composes User identity and Buttons, and its twelve colour pairings share the
surface shape/padding/border/shadow settings. Notifications demonstrates all four
severities and dismissible, automatically expiring toasts.

**Component tooling rule:** a component may have a development configurator in
its own directory, named `tool.js` (and optional `tool.css`). It is not part of the
design-system runtime/export. The host loads it explicitly; the component never
imports it. Surface and Tooltip follow this rule. Tools use host-owned storage;
components consume public CSS tokens and accept data/callbacks only.

`../appearance/appearance.js` / `appearance.css` share editor-only swatches, controls and
persistence. They are not a runtime foundation. Palette, theme and font selection
remain application-level tools. The Tooltip controller is mounted once by the
composition root so the same appearance applies to menu controls, icon catalogue
items and component examples. Navigation dismisses it before replacing content.

## Kanban board + Card composition

Open `index.html#topschrank.components.kanbanboard` or `index.html#topschrank.components.card`.
`kanban.js` composes the two public APIs; `kanban-data.js` supplies example-only content.
The toolbar composes Autocomplete (small, multiple) with Kanban board filtering.
Add/details dialogs and saved placement are host responsibilities, excluded from runtime exports.
Autocomplete supplies the shared field, suggestions and chips; this example supplies card data and the filtering predicate.

Global device controls notify the mounted board/Card. Shared theme/font tokens are
inherited directly. This example does not read or mutate the original HTML or its saved
Kanban state. New cards last for the session; placement of sample cards is saved under
`session.kanban.placement` in the unified document (excluded from template export).

## Form catalogue

`#topschrank.components.forms` composes `Form` / `FormField` with `form-data.js`: text, numbers, date/time, choices, lists, files/colour, states and actions. The last section is a combined playground with a local FormData inspector. No data is sent. `components/form/tool.js` supplies visual error preview and is not a runtime dependency. The original HTML is kept as a reference.

## Sidebar edge controls

Small chevrons share one appearance across collapse and overflow controls. They sit on the navigation borders; unavailable scroll directions remain visible and disabled. Navigation owns scrolling, collapse behaviour and state persistence.

## Autocomplete

`#topschrank.components.autocomplete` mounts the reusable component with eight sample suggestions from `autocomplete-data.js`. `autocomplete.js` connects the runtime to its separate `components/autocomplete/tool.js` configurator. Small/Big and Single/Multiple changes update the same mounted instance. Suggestions include local SVG thumbnails, icons and text. No editor or sample data is exported with the component.

## Extended library migration

Progress (including Loading state), Timeline, Process steps, Counts and summaries and Window have Components destinations. Loading state remains an independently reusable runtime, composed inside the Progress page; the earlier loadingstate URL redirects there. `extended-components.js` supplies demo data and controls. Modal dialog and Side panel are both modes of Window. `components/window/tool.js` configures mode, side, width, timing and dismissal; only the example explicitly loads it. Window runtime does not depend on Form, Buttons or User identity, even when the example composes them inside it. The original prototype remains unchanged.

## Layout organisation

Appearance, Fonts, Icons and Palette live directly under `design-system/`, each with its own directory. Portable icon assets live under `../icons/assets/`. Navigation remains in `../components/navigation`. Components submenu entries are sorted alphabetically.

## Shared settings and export preparation

`settings.js` is the host mapping/migration layer over `../storage/settings.js`.
Only `workspace.js` accesses browser localStorage. All existing persistence consumers
receive its registered adapter; newer Window and Autocomplete tools receive typed,
namespaced `settings` scopes. Their configured defaults are registered before their
pages are visited, and changes restore after reload. Surface, Tooltip, Fonts,
Palette, Navigation and sample Kanban placement share the same mechanism.

Open `#topschrank.settings` or **Settings** (gear icon) at the end of the main navigation, then **Exports** to inspect/download
the template JSON or a full workspace backup. The template includes layout and
component configuration; preview device and sample placement are omitted. This is
preparation for the eventual module/dependency-aware CSS/JS/HTML exporter, not that
exporter itself. See [settings contract](../storage/README.md).

## List

`#topschrank.components.list` composes the generic `components/list` runtime with
shared Kanban sample records, Badges and Autocomplete. `list.js` supplies the
eight domain columns and explicit responsive visibility: desktop 8, tablet 5,
mobile 3 (Order, Stage, Estimate). Normal includes the address, Compact is one
line in every device mode. Density persists through `components.list`; search,
selected filters and current page are working state only. `list.css` styles the
example's optional Badge/swatch/search composition, not the table runtime.

DTCG 2025.10 is the project token standard. Palette now uses canonical colour tokens,
validates imports, and exports token JSON or standalone theme CSS. See
[the supported profile and migration status](../tokens/README.md). Other existing
appearance tools are not migrated yet.
