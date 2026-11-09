# Surface

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemSurface`. CommonJS is also supported.

Existing children are preserved. Optional `content: string | Node`, `bg`, `text`, `border`, numeric `radius`, `padding`, `borderWidth`, and `shadow: none | soft | raised`.

`mount(element, options)` → `update(options)`, `destroy()`. Destroy restores pre-existing inline tokens and keeps content. `defaults`, `tokens` and `shadows` describe the public appearance contract; they do not load an editor.

## Dependencies and export

For HTML-first export use `surface.html` and the exporter described in [UI](../../README.md). Classic workspace usage loads foundations, `surface.css` and `surface.js`. Fonts and colours inherit semantic tokens.

Public appearance tokens: `--ds-surface-bg`, `--ds-surface-text`, `--ds-surface-border`, `--ds-surface-radius`, `--ds-surface-padding`, `--ds-surface-border-width`, `--ds-surface-shadow`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.surface`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

The configurator has been removed. Style the server-rendered container through
the documented CSS custom properties; no JavaScript is needed for static content.
