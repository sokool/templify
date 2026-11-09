# Buttons

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemButtons`. CommonJS is also supported.

`label`, `disabled`, `type: button | submit | reset`, optional `onClick(event)`, `fill`, `ink`, `ariaLabel`, `icon: Node`, `variant: primary | split | secondary | ghost`.

`mount(container, options)` → `element` (the native button), `update(options)`, `destroy()`. The Split action arrow is decorative; the entire button invokes one action. Disabled state uses native button semantics.

## Dependencies and export

For HTML-first export use `buttons.html` and the exporter described in [UI](../../README.md). Classic workspace usage loads foundations, `buttons.css` and `buttons.js`. Fonts and colours inherit semantic tokens; optional icons are DOM Nodes.

Public appearance tokens: `--ds-button-fill`, `--ds-button-ink`, `--ds-colour-accent`, `--ds-colour-on-accent`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.buttons`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

The optional `appearance: {fill, ink, border, shadow}` accepts generic CSS colour
values. Partial appearance updates preserve the remaining colours. Public
`--ds-button-border` and `--ds-button-shadow` tokens control the outline and soft
shadow. Secondary buttons respect explicit colours too.

The configurator has been removed. Exported HTML retains its icon/label nodes;
`Templify.get(button).update({icon, label, disabled, variant})` updates them in place.

Runtime defaults inherit foundation accent (brand background), on-accent text,
border and muted shadow tokens. Buttons declares no Palette Applications roles.
Each instance can override fill, ink, border and shadow without changing others.
