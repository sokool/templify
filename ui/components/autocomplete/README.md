# Autocomplete

A data-driven combobox extracted from the original prototype. Small uses compact rows; Big uses a visual catalogue. Both support single selection or multiple removable chips. Suggestions can combine an image, icon, label and detail. The list starts closed and its summary is below the suggestions.

## Dependencies and export

Load foundations `tokens.css` and `primitives.css` once, then Form `form.css`, `validation.js`, `field.js`, followed by `autocomplete.css` and `autocomplete.js`. The input is the same FormField used by Form; its markup, errors and styling are not copied. `manifest.json` lists the complete export and dependencies. No packages, application routes, sample data, icon catalogue, font selector or persistence are required.

`configurator/configurator.js` is a development configurator, explicitly loaded by examples. It is excluded from the component runtime/export and uses FormField selects. Example data and image thumbnails live in `examples/autocomplete-data.js`; the Kanban toolbar also uses this component.

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

The optional tool accepts an injected `settings` scope (`defaults`, `snapshot`, `set`). The example host supplies it from the shared store and restores appearance/behaviour after reload. The tool exports its default configuration as `defaults`; runtime configuration can be passed directly through `update()` without loading the tool. Selection/demo content is not persisted as template configuration.
