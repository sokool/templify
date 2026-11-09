# User Identity

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemUserIdentity`. CommonJS is also supported.

`name`, `description`, optional `initials` and `image`. Initials are derived from the name when omitted. Failed images fall back to initials.

`mount(element, options)` → `update(options)`, `destroy()`. Text and image data are supplied by the host; there is no user-domain or authentication dependency.

## Dependencies and export

For HTML-first export use `user-identity.html` and the exporter described in [UI](../../README.md). Classic workspace usage loads foundations, `user-identity.css` and `user-identity.js`. Fonts and colours inherit semantic tokens.

Public appearance tokens: `--ds-colour-text`, `--ds-colour-muted`, `--ds-colour-divider`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.useridentity`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
