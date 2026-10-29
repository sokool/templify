# Design system extraction

The original `../top-schrank-ui.html` is the application playground. It now consumes reusable components and shared foundations rather than embedding copies of their implementations.

## Extracted components

- [List](components/list/README.md): generic columns, Normal/Compact density, pagination and container-responsive views; optional composed cells.

- Progress, Timeline, Process steps, Loading state and Counts and summaries: independent presentation modules migrated from Extended library.
- [Window](components/window/README.md): modal popup and side panel, native focus handling, configurable dismissal and separate development tool.

- [Autocomplete](components/autocomplete/README.md): compact/catalogue suggestions, single/multi selection and chips; reuses FormField.

- [Form](components/form/README.md): shared native fields/select, label-message validation, all HTML input types and an independent catalogue/playground.

- [Kanban board](components/kanban-board/README.md): generic column model, drag/reorder, desktop hover edges, tablet groups of three and mobile centered swipe. Card is an injected renderer, not a hidden dependency.
- [Card](components/card/README.md): independent content, metadata, accent and action menu.

- [Breadcrumbs](components/breadcrumbs/README.md): paths, link appearance, collapsed ancestors. No component/package dependencies.
- [Tabs](components/tabs/README.md): selected panels, automatic/manual keyboard activation. No component/package dependencies.
- [Navigation](components/navigation/README.md): responsive header/navigation, mobile menu, connected flyouts, persistence and independent rail scrolling. Breadcrumbs composes through a slot. See its version 0.1 compatibility boundary.
- [Shared foundations](foundations/README.md): semantic tokens and opt-in CSS primitives. Loaded once for extracted components.

[Composition workspace](examples/index.html) is the common integration page. It starts with Navigation + header Breadcrumbs; `examples/` connects public component APIs and supplies data, without duplicating their implementations. See [examples documentation](examples/README.md).

[Combined standalone example](examples/shared-foundations.html) demonstrates changing a shared accent for both components, without application assets or duplicated foundation CSS.

## Shared assets

[Icons](icons/assets/README.md) is an SVG asset library with an optional renderer and individual exportable SVG files. Its catalogue lives in `icons/`; components do not depend on the catalogue.

## Structure

```text
design-system/
  icons/assets/            # SVG files, optional renderer, presentation CSS and license
  foundations/
    tokens.css
    primitives.css
    README.md
  components/
    breadcrumbs/           # JS, CSS, manifest, README, isolated example, tests
    tabs/                  # JS, CSS, manifest, README, isolated example, tests
    navigation/             # preserved responsive layout and navigation; optional Breadcrumbs composition
  testing/                 # shared DOM fixture and foundation tests; not runtime
  examples/
    shared-foundations.html
playground/
  theme-adapter.css         # existing app variables → design-system tokens
  breadcrumbs/
    editor.js              # style configuration tool; never part of component export
    editor.css
    workspace-adapter.js   # header routing and host theme
  tabs/
    example.js             # product-specific example data
top-schrank-ui.html
```

## Shared CSS versus independence

Foundations define common design decisions once: semantic colours, font family, spacing scale, motion timings and keyboard focus. Components depend on this small explicit foundation, not on each other or the application's full stylesheet.

Component CSS owns local layout and visual states. Breadcrumb decorative hover and the active tab underline are deliberately separate contracts. Do not build a generic utility abstraction solely to avoid a few repeated layout declarations.

Public per-component tokens (`--ds-bc-*`, `--ds-tabs-*`) can override semantic defaults without changing other components. The host application's light/dark/matrix themes and selected font map through the playground-only theme adapter. Packaged standalone foundation themes need no app adapter.

## Export contract

Every manifest lists local `runtimeFiles`, direct `dependencies` and `exportFiles` relative to its directory. An export resolves these paths and includes their union, deduplicating shared files. Breadcrumbs + Tabs need **six unique runtime files**: two JS files, two component CSS files and two foundation CSS files. They do not need either playground tool or its adapters.

Keep the folder layout when moving files, or let a future build/export step rewrite paths. There is no ZIP/export UI yet. No build step or package installation is needed to run the source examples.

## Checks

From the workspace root:

```sh
node --test design-system/components/*/tests/*.test.cjs design-system/testing/*.test.cjs playground/breadcrumbs/editor.test.cjs
```

Tests cover component behaviour and boundaries through Node's runner and the shared DOM fixture. Browser visual verification remains separate from these tests.

The main HTML is a multi-file playground: keep `design-system/` and `playground/` beside it when moving the workspace. Other legacy components remain in the original HTML until explicitly extracted. Navigation version 0.1 retains its compatibility IDs and original CSS cascade; application routes, editor/preview tools and page content remain outside its export.

## Configuration tools

Each component or layout element may have its own `tool.js` for configuring appearance **or functionality**. Tools are loaded explicitly by examples and excluded from runtime/export. Catalogues and global appearance settings live in the top-level `appearance/`, `fonts/`, `icons/` and `palette/` directories; reusable UI runtimes live under `components/`.

## Settings

[Shared settings](storage/README.md) is an optional injected service. The example host owns one versioned JSON document and supplies component/layout scopes or compatibility adapters. Runtime components never import configurators or access browser storage directly. Template configuration export excludes editor/session state.

## Design-token standard

Use [DTCG 2025.10](tokens/README.md) for design-value interchange and canonical
appearance storage as tools are migrated. Palette is the first implementation.
Component runtimes consume CSS variables and ordinary behaviour options; tools
and storage stay outside their export boundary. The linked document specifies
the supported profile, migration status and workflow for future token types.

# Host configuration and catalogues

Host-level tools have their own directories directly under `design-system/`, alongside `components/`, `foundations/`, `storage/` and `tokens/`.

- `palette/`: Dynamic theme colour editor (initially Light/Dark/Matrix) and reference palettes. Owns `tool.js` / `tool.css`; consumes `foundations/themes.js` and the DTCG token layer.
- `fonts/`: font chooser, loading and typography preview.
- `icons/`: searchable icon catalogue and category metadata. `icons/assets/` contains the portable SVGs, optional renderer, stylesheet, license and export manifest.
- `appearance/`: shared configuration controls, palette swatches and storage helpers used by development tools.

`examples/` composes these elements and runtime components. Layout elements are not implicit dependencies of component exports. Each component **and each layout element** may own an optional `tool.js` (and `tool.css`) for configuring appearance or behaviour. Such a tool stays separate from the runtime, is loaded explicitly by the host, and declares its dependencies. Never import a tool into a runtime or silently include it in the runtime export.

