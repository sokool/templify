# Buttons

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemButtons`. CommonJS is also supported.

`label`, `disabled`, `type: button | submit | reset`, optional `onClick(event)`, `fill`, `ink`, `ariaLabel`, `icon: Node`, `variant: primary | split | secondary | ghost`.

`mount(container, options)` → `element` (the native button), `update(options)`, `destroy()`. The Split action arrow is decorative; the entire button invokes one action. Disabled state uses native button semantics.

## Dependencies and export

Load `../../defaults.css` and `../../primitives.css` once, then `buttons.css` and `buttons.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-button-fill`, `--ds-button-ink`, `--ds-colour-accent`, `--ds-colour-on-accent`.

Examples and their data live in `../../../app/workspace/components.js`; open `../../../app/index.html#topschrank.components.buttons`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

The optional `appearance: {fill, ink, border, shadow}` accepts generic CSS colour
values. Partial appearance updates preserve the remaining colours. Public
`--ds-button-border` and `--ds-button-shadow` tokens control the outline and soft
shadow. Secondary buttons respect explicit colours too.

The editor is in `configurator/configurator.js` / `configurator/configurator.css`, excluded from runtime exports. It reuses
PalettePicker and FormField and accepts injected `themes` and scoped `settings`.
It stores independent `items` (label, style, colour references and generic CSS
appearance) under `components.buttons`. The first button cannot be removed.
Additional buttons can be added or removed. Styles: primary, split, secondary
(outline), ghost. Reset with “Inherit palette”.

Runtime defaults inherit foundation accent (brand background), on-accent text,
border and muted shadow tokens. Buttons declares no Palette Applications roles.
Each instance can override fill, ink, border and shadow without changing others.
