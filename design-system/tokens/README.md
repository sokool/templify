# Project design-token standard

DTCG Format Module **2025.10** is the project's interchange format for design values.
Reference: https://www.designtokens.org/tr/2025.10/format/ . It is a Community Group
specification, not a W3C Recommendation. Workspace schema versions are independent.

## Boundaries

- A configurator edits typed tokens; it does not invent its own colour storage format.
- `tokens/` validates and translates supported tokens. It imports no UI/tool/storage.
- The host injects persistence and applies translated CSS variables.
- Components consume semantic CSS variables, with optional component variables.
  They do not parse DTCG, import tools or read localStorage.
- Behaviour (pagination, Escape dismissal, navigation state), datasets and callbacks
  are not design tokens. Keep these in ordinary component/layout configuration.
- `tool.js` / `tool.css` belong to their component or layout directory and are excluded
  from runtime exports. No runtime -> tool imports.

## First implemented profile: Palette

`palette.tokens.json` is the authored default document. `defaults.js` is a generated
file:// compatible bundle. Regenerate it with `node design-system/tokens/build-defaults.cjs`.
A test checks that the two are identical. The theme controller derives its defaults
from this document; do not independently edit colour constants in controller code.

```json
{
  "themes": {
    "light": {
      "$type": "color",
      "accent": {
        "$value": {"colorSpace": "srgb", "components": [0.13333333333333333, 0.26666666666666666, 0.4980392156862745], "alpha": 1}
      }
    }
  }
}
```

`themes.light`, `themes.dark`, `themes.matrix` are ordinary DTCG groups. Their
relationship to theme modes and CSS selectors is a **project convention**, not an
invented DTCG mode property. The theme controller binds role names to existing
`--ds-colour-*` properties. Export does not rename component CSS variables.

The current translator supports sRGB colour objects, inherited colour `$type`,
whole-token `{path.to.token}` aliases, and chained aliases. It rejects missing/cyclic
references and unsupported token types/properties instead of guessing. This is an
explicit subset, **not a full DTCG validator**: other colour spaces, property-level
JSON Pointer references, group `$extends` and composite types are not implemented.
The Palette UI requires opaque sRGB values; direct HEX editing replaces an alias
at that role with a concrete colour. Other aliases remain intact on import/export.

`DesignSystemTokens` / CommonJS exports:
`colour(hex)`, `validate(document)`, `resolve(document,path)`, `cssColour(value)`,
`fromPalettes(legacy)`, `toPalettes(document,bindings)`, `compileThemes(document,bindings)`.
Validation occurs before import changes the current document. No code from JSON is
executed. Input size is limited by the tool; persisted data is validated on restore.

## Storage and export

Workspace document v2 stores DTCG at `data.tokens` and the selected theme at
`data.layout.theme`. The example host converts old v1 `layout.palette.palettes`
once, preserves customized colours and other preferences, then removes the old
palette copy. Existing per-key legacy browser records remain untouched.
The standalone theme controller accepts an injected Web Storage adapter as a
compatibility boundary; it now writes `{theme,tokens}` too.

Download `palette.tokens.json` for interchange or `themes.css` for a production app.
CSS contains all current theme selectors, with the first theme as the default. It needs no editor,
theme runtime or localStorage. The full workspace/template JSON is an application
configuration envelope, **not** a pure DTCG file.

## Migration status and next steps

Palette theme roles are migrated. Fonts and existing Surface/Tooltip/Breadcrumb
appearance settings still use their previous representation and need explicit,
tested adapters before moving to tokens. Do not claim the full design system is
already DTCG-backed. Reference brand swatches/greys and per-record Kanban accents
remain catalogue/sample data; assigning a reference colour to a theme role creates
that role's DTCG token. Future typography, dimensions, shadows and motion should
extend the translator with valid DTCG types before migrating their tools.

Run `node --test design-system/tokens/tests/*.test.cjs`.

## Dynamic theme groups

`themes` contains one or more groups, in insertion/cycle order. There is no fixed
list of three modes. IDs use lowercase letters, digits and hyphens, starting with
a letter, so they are safe both as token paths and CSS selectors. Each group must
supply every semantic colour role. Custom groups may carry project metadata:
`"$extensions": {"org.topschrank.theme": {"label": "Ocean", "base": "dark"}}`.
This extension records a display name and built-in fallback preset, not a DTCG
mode feature. The controller sets both `data-ds-theme` (actual ID) and
`data-ds-theme-base` (preset used for auxiliary foundation styles).

## Colour primitives and application aliases

Every theme may include `colors.brand`, `colors.accent`, and `colors.greys` groups.
Each contains any number of named colour tokens. Token `$description` stores the
user-facing colour name. Semantic tokens remain at the theme root for compatibility:
`themes.light.text.$value = "{themes.light.colors.brand.colour-1}"`.

`colour-system.js` upgrades old role-only themes, edits categories and preserves
referencing values on deletion. Primitives, aliases and metadata are saved in the
same DTCG document, not in a parallel palette setting. `toPalettes()` resolves the
semantic role map; the theme controller also exposes category data to the tools.
