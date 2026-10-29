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

`../../colours/colour-roles.json` declares shared foundation roles. Components may
contribute `colourRoles` in their manifest. Form and Kanban board currently opt in.
A declaration has `id`, `label`, `css`, `category` and `purpose`; it must correspond
to a CSS variable the component actually consumes. Identical IDs share one role
and list all owners; conflicting CSS bindings fail the build. Components without
special roles need no contribution.

Run `node ui/scripts/build-colour-roles.cjs` to regenerate the
file:// compatible catalogue `../../colours/colour-roles.js`. Add a DTCG default for
any new required role to each built-in theme, then regenerate token defaults with
`node ui/scripts/build-defaults.cjs`. Components still know only CSS
variables, never category IDs or concrete colours.

## Modules

- `../../colours/colour-system.js`: category operations, migration, safe deletion, aliases.
- `../../themes/themes.js`: injected persistence, active theme and CSS application.
- `generator.js` + `vendor/`: editor-only colour computations.
- `tool.js` / `tool.css`: shared Form fields and Buttons, editor composition.

Controller additions: `addColour`, `updateColour`, `removeColour`, `assign`,
`assignMany`, `replaceColours`. `add(label, source, {colours, assignments})`
creates and activates a generated theme atomically. `getState()` includes
`colours[theme][category]` and `assignments[theme][role]` as well as resolved
`palettes`. Names/base presets use `$extensions["org.topschrank.theme"]`.

Run `node --test ui/testing/colour-system.test.cjs`.

Applications occupies the full content width beneath the category lists. Each
application declaration supplies a `section` and `description`, shown with its
name, colour swatch and current HEX. Clicking an application opens the reusable
Window component with Brand/Accent/Greys choices and custom colour/HEX controls.
Palette choices apply immediately and close the picker; custom input remains open
for adjustment. Window handles Escape, backdrop dismissal and focus restoration.

## Shared popup picker

`../palette-picker/palette-picker.js` / `.css` are the reusable editor tool, first integrated in Progress and also exposed under **Tools → Palette picker**.
`PalettePicker.mount(host, {themes, label, value, defaultValue, onChange})` renders
one compact trigger and an anchored, non-modal Popover with Brand/Accent/Greys and custom colour/HEX.
Selections may be semantic (`{kind:'semantic',role:'accent'}`), palette references
(`{kind:'palette',category:'brand',id:'colour-1',fallback:'#22447F'}`) or custom HEX
(`{kind:'custom',value:'#123456'}`). `getCSS()` yields a generic CSS colour expression.
References follow the active theme; a saved fallback covers missing colours. The
component receiving CSS does not import this tool or understand these references.
The picker subscribes to the injected theme controller, and `destroy()` unsubscribes
and removes its popup. FormField is an editor-only dependency. The Popover opens near its trigger, flips above when necessary, fits the viewport and dismisses on outside click or Escape. It has no backdrop, focus trap or scroll lock.

Pass `paletteOnly:true` (used by Card) to exclude custom colour controls and reject custom/missing references. Supply a semantic `defaultValue` so unavailable selections fall back to the active theme, never a saved HEX. `validForTheme` and `resolveTheme` expose the same policy for injected authoring controllers. Other tools retain their existing custom-colour support.

## Shared shadows

**Shadows** provides None, Soft, Medium and Strong previews. Choose an editable profile with the shared Form select; Form sliders edit X/Y offsets, blur, spread and opacity. The palette-only picker supplies the shadow colour. None is always shadow-free; **Reset shadow profile** restores only the selected definition in the active theme.

`../../shadows/shadows.js` contains validation/defaults and CSS generation, without editor or storage dependencies. `../shadows/shadows.js` / `.css` implement the compact editor under **Theme → Shadows**, outside the Palette page. Components consume `--ds-shadow-none`, `--ds-shadow-soft`, `--ds-shadow-medium` and `--ds-shadow-strong`, never import the tool, and opt in individually; this change integrates Card only.

Definitions are theme-specific metadata under `$extensions["org.topschrank.shadows"]`, not a new DTCG token type. The existing colour-token profile is unchanged. Definitions survive theme copies, persistence and DTCG JSON import/export; CSS export emits the resolved shadow variables. Deleted palette references return to the active Text role, never an old HEX. Invalid shadow imports are rejected atomically.

Theme-specific component tool preferences use `$extensions["org.topschrank.components"]`; Card stores its colours, square preview size and chosen shadow profiles there. Safe CSS-variable bindings also export with each theme. Unconfigured themes clear those bindings rather than inheriting another theme's choices.

Run `node --test ui/testing/shadows.test.cjs ui/components/card/tests/*.test.cjs ui/components/card/configurator/tests/*.test.cjs`.

**Contrast checker** has also moved from Palette to **Tools → Contrast checker**.
Its implementation is `../contrast-checker/`, using the shared picker and
the existing injected contrast calculator. Palette now focuses on themes, colour
categories and semantic applications rather than embedding generic editors.
