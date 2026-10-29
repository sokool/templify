# Shared CSS foundations

Load `tokens.css`, then `primitives.css`, exactly once before component styles. Both Breadcrumbs and Tabs declare this shared dependency in their manifests. Foundations have no JavaScript, component dependencies or application selectors.

## Ownership

| Layer | Owns | Does not own |
| --- | --- | --- |
| `tokens.css` | Semantic colours, palette references, typography defaults, spacing scale, motion timings, focus measurements | Component markup or selected-state layout |
| `primitives.css` | Opt-in box sizing (`ds-component`), keyboard focus (`ds-focusable`) | Global element resets, routing, component behaviour |
| Component CSS | Local layout, states and decoration, e.g. a tab underline | Copies of the shared palette or keyboard-focus recipe |
| `playground/theme-adapter.css` | Mapping the existing app's tokens to `--ds-*` | Exported component styling |

Components can expose `--ds-tabs-*` or `--ds-bc-*` overrides while falling back to semantic `--ds-*` tokens. Different visual contracts stay local: a breadcrumb link's decorative hover is not the active underline of a tab.

`data-ds-theme="light|dark|matrix"` supports the packaged standalone themes. The existing playground uses its own theme through the separate adapter. No font download is initiated by the foundation.

## Deduplication and export

1. Each component manifest names its direct shared dependencies.
2. An export includes the union of those paths, not one foundation copy per component.
3. Preserve the `design-system/foundations/` and `design-system/components/` structure, so relative paths remain meaningful.
4. Load shared files once in the host document. Component CSS does not use hidden `@import` dependencies.
5. Export no playground assets, application adapters or test fixtures unless explicitly requested as examples/development files.

This is the export contract, not an implemented ZIP/export UI. Components are already organized according to it.

Do not create a generic stylesheet for every coincidentally repeated declaration. Share stable design decisions and true behavioural contracts; keep a few local layout declarations local when sharing them would couple unrelated components.

## Theme configuration

`themes.js` is an optional foundation runtime, independent of components and the
example editor. It starts with Light, Dark and Matrix and supports any number of named themes. `tokens.css`
provides the matching defaults for applications that do not load JavaScript.
Keep these defaults synchronized; `testing/themes.test.cjs` verifies agreement.

`DesignSystemThemes.create({target, storage?, storageKey?, initialTheme?})` applies
tokens to a host element. Its API is `add(label, sourceTheme)`, `remove(theme)`, `next()`, `select(theme)`,
`setColour(theme, role, '#RRGGBB')`, `reset(theme?)`, `getState()` and
`subscribe(callback)` (returns an unsubscribe function). Stored configuration is
validated; each mode retains its own overrides. Components read CSS variables;
they never import this runtime, storage or the Palette editor.

Semantic roles: page, panel, text, muted, border, divider, accent, selection and
hover. Fonts are configured independently through `--ds-font-family`.

## Component tools are not runtime foundations

Component-specific configurators belong next to their component as `tool.js`
(and optional `tool.css`). Their location does not make them part of the exported
design system. `runtimeFiles` / `exportFiles` in each manifest exclude them;
`excluded` and optional `tool` metadata make that boundary explicit. Never load a
tool from a component entry. Examples own tool composition and persistence.

Form validation uses the semantic `--ds-colour-error` role (configurable as “Error text & outline” in the Palette tool). Components consume this token rather than detecting Light/Dark/Matrix themselves.

Colour application declarations are maintained in `colour-roles.json` plus opt-in
`colourRoles` entries in component manifests. `build-colour-roles.cjs` generates
`colour-roles.js`, loaded before the theme controller. Category operations are in
`tokens/colour-system.js`; colour-generation and contrast dependencies stay in
`palette/` tooling. See `palette/README.md` for the declaration workflow.
