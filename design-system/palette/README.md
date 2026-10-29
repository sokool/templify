# Palette colour-system tool

Palette configures themes. It is a tool, not an exported UI component. Component
runtimes import neither this editor nor chroma.js. The example host injects the
`DesignSystemThemes` controller and shared settings service; no localStorage calls
belong to the tool.

## Two layers

- `themes.<id>.colors.brand`, `.accent`, `.greys`: named DTCG colour primitives.
  Each category may contain zero or more colours; there is no fixed palette size.
- Semantic application roles (Page, Text, Border, Column background, etc.) refer to
  primitives using DTCG aliases. A custom role colour remains a concrete token.

Editing a primitive updates every linked application. Removing one resolves its
references before deletion, preserving existing interface colours as custom values.
Empty categories are valid. Import validates the complete document before applying
it. Old role-only themes are upgraded without changing their semantic colours.
Built-in defaults include the original six accents plus the error colour.

The category list, names, colour values and assignments round-trip through shared
settings, DTCG import/export and theme copies. Export/import actions remain in
**Settings**. CSS export includes semantic variables and every named palette
primitive as `--ds-palette-<category>-<id>`. The footer cycles all current themes.

## Generator and contrast

`generator.js` uses vendored **chroma.js 3.2.0** for OKLab/OKLCH colours, scales,
luminance, colour distance and WCAG contrast. One or several six-digit HEX seeds
become the Brand colours. Accent colours use deterministic hue rotations; Greys
are a low-chroma ramp tinted by the average seed hue. Counts are user-configurable
(the generator limits each generated ramp to 128 colours; manual category growth
has no fixed count). New themes can instead copy an existing theme.

Auto assign is an explicit, editable starting point based on the source theme's
Light/Dark/Matrix preset. It favours readable text/background pairs, but cannot
guarantee every combination of arbitrary user colours. The contrast checker
accepts palette selections, HEX and colour pickers, and shows WCAG ratio and
thresholds for AA text, AAA text and large text/non-text UI. This is a pair check,
not an accessibility audit. Generator and checker require no network at runtime.

Library source/licensing: `vendor/README.md`, `vendor/LICENSE.chroma-js`.
Official documentation: https://gka.github.io/chroma.js/ .

## Opt-in component applications

`foundations/colour-roles.json` declares shared foundation roles. Components may
contribute `colourRoles` in their manifest. Form and Kanban board currently opt in.
A declaration has `id`, `label`, `css`, `category` and `purpose`; it must correspond
to a CSS variable the component actually consumes. Identical IDs share one role
and list all owners; conflicting CSS bindings fail the build. Components without
special roles need no contribution.

Run `node design-system/foundations/build-colour-roles.cjs` to regenerate the
file:// compatible catalogue `foundations/colour-roles.js`. Add a DTCG default for
any new required role to each built-in theme, then regenerate token defaults with
`node design-system/tokens/build-defaults.cjs`. Components still know only CSS
variables, never category IDs or concrete colours.

## Modules

- `tokens/colour-system.js`: category operations, migration, safe deletion, aliases.
- `foundations/themes.js`: injected persistence, active theme and CSS application.
- `palette/generator.js` + `vendor/`: editor-only colour computations.
- `palette/tool.js` / `tool.css`: shared Form fields and Buttons, editor composition.

Controller additions: `addColour`, `updateColour`, `removeColour`, `assign`,
`assignMany`, `replaceColours`. `add(label, source, {colours, assignments})`
creates and activates a generated theme atomically. `getState()` includes
`colours[theme][category]` and `assignments[theme][role]` as well as resolved
`palettes`. Names/base presets use `$extensions["org.topschrank.theme"]`.

Run `node --test design-system/testing/colour-system.test.cjs`.

Applications occupies the full content width beneath the category lists. Each
application declaration supplies a `section` and `description`, shown with its
name, colour swatch and current HEX. Clicking an application opens the reusable
Window component with Brand/Accent/Greys choices and custom colour/HEX controls.
Palette choices apply immediately and close the picker; custom input remains open
for adjustment. Window handles Escape, backdrop dismissal and focus restoration.

## Shared popup picker

`picker.js` / `picker.css` are a reusable editor tool, first integrated in Progress.
`PalettePicker.mount(host, {themes, label, value, defaultValue, onChange})` renders
one compact trigger and an anchored, non-modal Popover with Brand/Accent/Greys and custom colour/HEX.
Selections may be semantic (`{kind:'semantic',role:'accent'}`), palette references
(`{kind:'palette',category:'brand',id:'colour-1',fallback:'#22447F'}`) or custom HEX
(`{kind:'custom',value:'#123456'}`). `getCSS()` yields a generic CSS colour expression.
References follow the active theme; a saved fallback covers missing colours. The
component receiving CSS does not import this tool or understand these references.
The picker subscribes to the injected theme controller, and `destroy()` unsubscribes
and removes its popup. FormField is an editor-only dependency. The Popover opens near its trigger, flips above when necessary, fits the viewport and dismisses on outside click or Escape. It has no backdrop, focus trap or scroll lock.
