# Tabs

Independent horizontal tab navigation with underlined selection. The selected rule is 3 px tall over a 2 px baseline, so it extends 1 px above it. All labels keep the same weight to avoid layout movement during selection.

## Runtime and shared CSS

Local runtime: `tabs.js` and `tabs.css`.

Shared runtime: `../../foundations/tokens.css` and `../../foundations/primitives.css`, **loaded once per page**, including when Breadcrumbs is present. No dependency on Breadcrumbs, Forms, icons, routing, storage, a framework or a package manager.

`manifest.json` lists local files, shared dependencies, export files and test-only support. The playground copy and its product text live in `../../../playground/tabs/example.js` and are excluded from the runtime/export.

## Use

```html
<link rel="stylesheet" href="./design-system/foundations/tokens.css">
<link rel="stylesheet" href="./design-system/foundations/primitives.css">
<link rel="stylesheet" href="./design-system/components/tabs/tabs.css">
<script src="./design-system/components/tabs/tabs.js"></script>
<div id="product-details"></div>
<script>
const tabs = DesignSystemTabs.mount(document.getElementById('product-details'), {
  label: 'Product details',
  value: 'materials',
  items: [
    { id: 'materials', label: 'Materials', content: 'Available materials…' },
    { id: 'details', label: 'Details', content: 'Product details…' },
    { id: 'service', label: 'Service', content: 'Service options…', disabled: true }
  ],
  onChange(id, event) { console.log(id); }
});
</script>
```

Supply text or a real DOM node as `content`. Nodes are moved into their panels, not copied; their values and listeners survive updates. Label/content strings are plain text, never parsed HTML. A node can belong to only one panel/instance; do not share the same node between items.

Item IDs must be unique within one instance. The component generates unique DOM IDs across instances and links tabs to their panels with `aria-controls` / `aria-labelledby`. The first enabled item is the fallback when the requested selection is missing, disabled or removed. Empty/all-disabled collections have no active panel.

## API and keyboard

- `tabs.value`: current item ID, or null when none is enabled.
- `tabs.select(id)`: changes selection without invoking `onChange`; returns false for an unavailable item.
- `tabs.update({items?, value?, label?, activation?, onChange?})`: updates the same instance and retains valid selection.
- `tabs.destroy()`: removes owned listeners, markup and component classes. The host remains.

`onChange` runs for user selection changes, not initial render or programmatic updates.

Arrow Left/Right wraps between enabled tabs; Home/End moves to the first/last enabled tab. Automatic activation is the default. With `activation: 'manual'`, arrows move focus and Enter/Space selects. Tab moves through the active tab and its visible panel. Disabled tabs are skipped.

## Style boundaries

The component uses only `.ds-tabs*` styles and the opt-in shared `.ds-component` / `.ds-focusable` primitives. It never resets arbitrary application buttons.

Optional per-component CSS tokens are listed in the manifest. They fall back to the shared semantic foundation:

```css
#product-details {
  --ds-tabs-accent: #22447F;
  --ds-tabs-font-size: 14px;
  --ds-tabs-gap: 18px;
}
```

Colours and fonts in the current application are mapped by `playground/theme-adapter.css`. That application adapter is not a dependency of Tabs and is excluded from export. Focus comes from `foundations/primitives.css`; timing values come from `foundations/tokens.css`. The active underline, spacing specific to tabs and panel layout stay in `tabs.css`.

## Verify

Open `example.html`, or run from this directory:

```sh
node --test tests/*.test.cjs
```

Tests use Node's runner and the shared DOM fixture in `design-system/testing/`. This fixture is test-only, not a runtime dependency or a substitute for browser layout verification.
