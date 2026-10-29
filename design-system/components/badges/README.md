# Badges

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemBadges`. CommonJS is also supported.

`label`, optional `icon: Node`, `fill`, `ink`, `edge`.

`mount(container, options)` → `element` (the badge), `update(options)`, `destroy()`. Curved line is the selected style. Badges size to their text and do not introduce button semantics.

## Dependencies and export

Load `../../foundations/tokens.css` and `../../foundations/primitives.css` once, then `badges.css` and `badges.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-badge-fill`, `--ds-badge-ink`, `--ds-badge-edge`.

Examples and their data live in `../../examples/components.js`; open `../../examples/index.html#topschrank.components.badges`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
