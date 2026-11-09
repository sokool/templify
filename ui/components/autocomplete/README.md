# Autocomplete

A data-driven combobox extracted from the original prototype. Small uses compact rows; Big uses a visual catalogue. Both support single selection or multiple removable chips. Suggestions can combine an image, icon, label and detail. The list starts closed and its summary is below the suggestions.

## Dependencies and export

For HTML-first export use `autocomplete.html` and [UI](../../README.md). The client adopts the existing input and suggestion nodes; Form CSS is imported automatically. Classic usage loads foundations, Form `form.css`, `validation.js`, `field.js`, then `autocomplete.css` and `autocomplete.js`.

The configurator has been removed. `size` and `multiple` remain component options,
also supplied initially through `data-size` and `data-multiple` in HTML.

## API

Browser global `DesignSystemAutocomplete`; CommonJS is available for model tests.

```js
const control = DesignSystemAutocomplete.mount(host, {
  label: 'Find material',
  items: [{id: 'oak', label: 'Natural oak', detail: 'Warm wood', icon: 'layers'}],
  size: 'small', // small | big
  multiple: true,
  name: 'materials',
  onChange(ids, {items, query}) { /* caller owns selected IDs */ }
});
```

Optional item fields: `image`, `icon`, `group`, `keywords`, `disabled`. IDs must be unique. Supply a trusted `renderIcon(name)` renderer for SVG assets; otherwise a simple glyph fallback is used. Text values render safely as text.

Options also include `value` (selected IDs), `placeholder`, `accessibleLabel`, `disabled`, `limit`, `filter(items, query)`, `onQuery(query)`, `queryName`, `suggestionsLabel` and `emptyText`. `name` submits one hidden field per selected ID; `queryName` independently names the query input.

The mounted instance exposes `input`, `field`, `element`, `list`, `popup`, `open()`, `close()`, `choose(id)`, `update(patch)`, `getValue()`, `getSelectedItems()`, `getQuery()`, `setQuery(text, {open:false})`, `setError(message)`, `reset()` and `destroy()`. Programmatic updates do not emit change callbacks. `onChange` receives a fresh ID array. Updates remove selections absent from new data. Switching to single selection keeps the first selected item.

Arrow keys navigate enabled options, Enter selects, Escape/Tab close, and Backspace removes the last chip when the query is empty. Pointer departure from the control via outside click or focus also closes suggestions. Multiple instances have unique ARIA IDs. Selection state belongs to the instance; storage and filtering other components belong to the caller.

## Validation

Run `node --test tests/*.test.cjs` and open `tests/browser.html` for real DOM checks, including keyboard, chips, single/multiple modes, disabled states, safe labels, FormData, updates and teardown.

Runtime configuration can be passed through `update()`. Persistence belongs to the caller.
