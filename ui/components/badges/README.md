# Badges

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemBadges`. CommonJS is also supported.

`label`, optional `icon: Node`, `fill`, `ink`, `edge`.

`mount(container, options)` → `element` (the badge), `update(options)`, `destroy()`. Curved line is the selected style. Badges size to their text and do not introduce button semantics.

## Dependencies and export

For HTML-first export use `badges.html` and the exporter described in [UI](../../README.md). Classic workspace usage loads foundations, `badges.css` and `badges.js`. Fonts and colours inherit semantic tokens; optional icons are DOM Nodes.

Public appearance tokens: `--ds-badge-fill`, `--ds-badge-ink`, `--ds-badge-edge`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.badges`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
