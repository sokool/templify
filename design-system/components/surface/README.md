# Surface

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemSurface`. CommonJS is also supported.

Existing children are preserved. Optional `content: string | Node`, `bg`, `text`, `border`, numeric `radius`, `padding`, `borderWidth`, and `shadow: none | soft | raised`.

`mount(element, options)` → `update(options)`, `destroy()`. Destroy restores pre-existing inline tokens and keeps content. `defaults`, `tokens` and `shadows` describe the public appearance contract; they do not load an editor.

## Dependencies and export

Load `../../foundations/tokens.css` and `../../foundations/primitives.css` once, then `surface.css` and `surface.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-surface-bg`, `--ds-surface-text`, `--ds-surface-border`, `--ds-surface-radius`, `--ds-surface-padding`, `--ds-surface-border-width`, `--ds-surface-shadow`.

Examples and their data live in `../../examples/components.js`; open `../../examples/index.html#topschrank.components.surface`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

## Development tool — excluded from the component

`tool.js` and `tool.css` are a configurator placed beside this component for convenience. They are **not part of the design-system runtime or export**. The runtime never imports them. The example host explicitly loads the tool and injects document/storage. Shared editor plumbing stays in `../../appearance/appearance.js` and `appearance.css`; palette reference data comes from examples as well.

The tool stores its own settings under `design-system-examples-surface` in localStorage and applies public appearance tokens to the example root. It can be removed without changing component behaviour. Font/colour controls and persistence must never be moved into the runtime entry.
