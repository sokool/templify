# Accordion

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemAccordion`. CommonJS is also supported.

`items: [{id, label, content: string | Node, open?}]`, `multiple` (default true), optional `onChange(id, open)`.

`mount(element, options)` → `setOpen(id, open?)`, `update(options)`, `destroy()`. Native details/summary supplies pointer, Enter and Space interaction.

## Dependencies and export

Load `../../foundations/tokens.css` and `../../foundations/primitives.css` once, then `accordion.css` and `accordion.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-colour-text`, `--ds-colour-muted`, `--ds-colour-divider`.

Examples and their data live in `../../examples/components.js`; open `../../examples/index.html#topschrank.components.accordion`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
