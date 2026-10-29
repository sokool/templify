# List

Generic tabular List migrated from the original Order list. No order-specific data,
application routes, storage keys, icons, configurators or other component imports.
Normal retains secondary text; Compact makes each cell one line with ellipsis.
Pager controls remain small (28 px) and use native buttons and table semantics.

## Usage

Load shared `../../defaults.css` and `../../primitives.css` once, then
`list.css` and `list.js`. Fonts and semantic colours come from the host theme.

```js
const list = DesignSystemList.mount(host, {
  label: 'Projects',
  columns: [
    {id:'name', label:'Project', secondaryKey:'location', mobile:true},
    {id:'reference', label:'Reference', mobile:false},
    {id:'stage', label:'Stage', mobile:true}
  ],
  rows: [{id:'p1', name:'Workshop', location:'Berlin', reference:'P-001', stage:'New'}],
  density: 'normal', pageSize: 6, device: 'auto',
  onDensityChange(density) { /* host owns optional persistence */ }
});
```

Column fields: unique `id`, `label`, optional `key` (row key, defaults to id),
`secondaryKey`, `strong`, `monospace`, `align:'right'`, `width` (CSS width or
`{desktop,tablet,mobile}`), `desktop/tablet/mobile` visibility overrides,
`render(value,row,{document,device,density})` for caller-composed cells.
A renderer returns text, a DOM node, or `{element,destroy}`; disposables are
released on rerender and destroy. Strings are rendered with textContent.
Rows have unique `id`, values matching keys, and an optional `accent` CSS colour.
Literal accent values belong to caller data, not component styles.

The host can compose Badges or other components through cell renderers; List
has no dependency on them. Example-only Badge sizes live in `examples/list.css`.

Default automatic responsive visibility: all columns on desktop, first five on
tablet, first three on mobile. Explicit booleans override those defaults. Auto
uses the **container width**, ≤620 px mobile, ≤1100 px tablet, otherwise desktop.
An explicit device mode supports host previews. Changing the mode retains density
and current page. Normal secondary content remains visible on mobile.

Options: `page`, `pageSize`, `density`, `device`, `showDensityControl`, `emptyText`,
`onPageChange(page)` and `onDensityChange(density)`. Callbacks fire for user controls;
programmatic changes are quiet. `update(patch)` refreshes data/configuration and
clamps the page if fewer rows remain. `setPage(number)`, `setDensity(mode)`, `page`,
`density`, `device`, `element` and `destroy()` form the public API.
Pagination limits the number of visible page buttons for large datasets.
Sorting, filtering, fetching and persistence belong to the host. No Actions column
is inserted. List is not an ARIA grid and does not override native table navigation.

The example reuses Kanban's sample records and composes Autocomplete for filtering
and Badges for stages. It keeps desktop 8 / tablet 5 / mobile 3 columns. Its density
is persisted through `components.list` in the shared store; rows/query/page stay
outside template configuration. No `tool.js` is needed for the built-in density
control, which is part of the usable List UI.

Open `../../../app/index.html#topschrank.components.list`.
Run `node --test tests/*.test.cjs` for responsiveness, paging, lifecycle and safety.
