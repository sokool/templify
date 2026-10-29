# User Identity

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemUserIdentity`. CommonJS is also supported.

`name`, `description`, optional `initials` and `image`. Initials are derived from the name when omitted. Failed images fall back to initials.

`mount(element, options)` → `update(options)`, `destroy()`. Text and image data are supplied by the host; there is no user-domain or authentication dependency.

## Dependencies and export

Load `../../foundations/tokens.css` and `../../foundations/primitives.css` once, then `user-identity.css` and `user-identity.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-colour-text`, `--ds-colour-muted`, `--ds-colour-divider`.

Examples and their data live in `../../examples/components.js`; open `../../examples/index.html#topschrank.components.useridentity`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
