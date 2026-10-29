# Notifications

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemNotifications`. CommonJS is also supported.

`kind: info | success | warning | error`, `title`, `message: string | Node`, optional `action: {label, onClick}`, `dismissible`, `onDismiss`.

`mount(element, options)` → `update(options)`, `destroy()`. `createToaster({document, container?, duration?})` → `show(options)` returning an id, `dismiss(id)`, `destroy()`. Duration defaults to 2400 ms; 0 keeps a toast until dismissed. Host owns when messages appear.

## Dependencies and export

Load `../../foundations/tokens.css` and `../../foundations/primitives.css` once, then `notifications.css` and `notifications.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-colour-text`, `--ds-colour-accent`, `--ds-colour-page`, `--ds-colour-panel`, `--ds-colour-divider`, `--ds-accent-1`.

Examples and their data live in `../../examples/components.js`; open `../../examples/index.html#topschrank.components.notifications`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.
