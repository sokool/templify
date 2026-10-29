# Shared settings service

`settings.js` is an optional, injectable persistence service. It imports no component,
configuration tool, DOM API or browser storage global. The application owns one instance.
It accepts any synchronous `getItem` / `setItem` storage adapter, including localStorage,
a memory implementation or a host adapter. Without storage it works in memory.

```js
const settings = DesignSystemSettings.create({storage: window.localStorage});
const tooltipSettings = settings.scope('components.tooltip');
tooltipSettings.defaults({size: 12, padding: '8px 11px'});
tooltipSettings.set('size', 14);
const appearance = tooltipSettings.snapshot();
// The host applies appearance through the component's public API / CSS tokens.
// A development tool may receive tooltipSettings; the runtime never imports the tool.
```

## Document and namespaces

One localStorage entry, `design-system-workspace`, contains a JSON document:

```json
{
  "schema": "design-system-workspace",
  "version": 2,
  "data": {
    "tokens": {},
    "layout": {},
    "components": {},
    "preview": {},
    "session": {}
  }
}
```

- `tokens`: DTCG design values; theme colours are the first migrated group.
- `layout`: selected theme, selected font, navigation preferences.
- `components`: explicitly configured appearance and behaviour by component name.
- `preview`: editor/device preferences, excluded from the template export.
- `session`: sample card placement and other working data, excluded from template export.

A scope has `get(key, fallback)`, `has(key)`, `set(key, value)`, `patch(values)`,
`defaults(values)`, `snapshot()` and `subscribe(callback)` → unsubscribe.
Values and snapshots are defensive JSON copies. Functions, undefined, nonfinite
numbers and unsafe prototype keys are rejected. Do not store DOM nodes, callbacks,
HTML markup, user records or large files here. Component configuration is distinct
from application data and native form submission.

`batch(fn)` coalesces writes/notifications; it is not a transaction with rollback.
Subscriptions fire for store changes, including changes outside a scope.
`status` reports persistence availability/errors. Failed writes retain in-memory data.
An unsupported schema/version is not overwritten; corrupt JSON can be replaced on
the next successful write. There is no cross-tab conflict resolution or backend sync.
A localStorage entry belongs to the browser origin/profile; file:// and HTTP previews
may have separate saved settings. It is not a JSON file on disk.

## Existing consumers

`adapter(routes)` provides a Web Storage-shaped interface for existing injected
controllers. The composition root maps their logical keys to canonical paths, with
JSON or text encoding. Consumers never receive raw browser storage.
`migrateLegacy(routes)` imports only missing paths, preserves newer settings and
leaves legacy keys intact for rollback. Only the unified entry receives new writes.
The original prototype's separate settings are not imported or modified.

## Export boundary

`exportTemplate()` returns a defensive `{schema, version, tokens, layout, components}` object;
`exportJSON()` serializes it. `exportJSON({template:false})` exports a full workspace backup.
These methods export configuration, **not** bundled CSS/JS/HTML. The future exporter
can resolve module manifests/dependencies and apply this snapshot without bundling
`tool.js`, example datasets or localStorage. Workspace v1 is accepted and upgraded on the next write; the host migrates palette
colours to DTCG. Import/version migration beyond v2 is a separate operation; do not treat arbitrary JSON as executable code.

Run: `node --test app/storage/tests/*.test.cjs` from the repository root.
