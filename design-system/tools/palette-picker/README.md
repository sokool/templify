# Palette picker

Reusable compact colour trigger and anchored non-modal Popover. Load
`palette-picker.css`, `../tools.css`, shared Form assets and
`palette-picker.js`. Browser global: `PalettePicker`; CommonJS is supported.

```js
const picker = PalettePicker.mount(host, {
  themes,
  label: 'Background',
  value: { kind: 'semantic', role: 'panel' },
  defaultValue: { kind: 'semantic', role: 'panel' },
  paletteOnly: true,
  onChange(selection, css) {},
});
```

`paletteOnly:true` excludes custom HEX/system colour controls and validates
selections against the current theme. Semantic defaults cover deleted palette
entries without saved HEX fallbacks. Other editors can opt into custom colours.

`getValue()`, `getCSS()`, `update(selection)` and `destroy()` support host-owned
state and lifecycle. The picker never writes storage. Escape/outside focus closes
the popup; it follows its trigger and fits the viewport. The standalone Tools
page demonstrates both modes and persists its selections per theme.
