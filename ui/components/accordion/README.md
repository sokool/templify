# Accordion

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemAccordion`. CommonJS is also supported.

`items: [{id, label, content: string | Node, open?}]`, `multiple` (default true), optional `onChange(id, open)`.

`mount(element, options)` → `setOpen(id, open?)`, `update(options)`, `destroy()`. Native details/summary supplies pointer, Enter and Space interaction.

## Dependencies and export

For HTML-first export use `accordion.html` and the exporter described in [UI](../../README.md). The following classic `mount()` API remains supported by workspace. Load `../../defaults.css` and `../../primitives.css` once, then `accordion.css` and `accordion.js`.

Public appearance tokens: `--ds-colour-text`, `--ds-colour-muted`, `--ds-colour-divider`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.accordion`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
