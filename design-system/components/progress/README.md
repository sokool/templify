# Progress

Migrated from the original Extended library. Browser global `DesignSystemProgress`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, value (0–100), max (100), indeterminate (false)`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

Load foundations `tokens.css` and `primitives.css` once, then `progress.css` and `progress.js`. There are no component or package dependencies. Colours and fonts inherit semantic tokens. The manifest lists the full export.

Example: `../../examples/index.html#topschrank.components.progress`.

Appearance is optional: `appearance: {fill, border, shadow}` takes generic CSS
colour values or `var(...)` references. These map to `--ds-progress-fill`,
`--ds-progress-border`, `--ds-progress-shadow`. The outline is 1px; the colour of
the soft outer shadow is mixed with transparency. Value updates preserve appearance.
Destroy restores pre-existing inline variables. No palette or settings knowledge
exists in the runtime.

`tool.js` / `tool.css` provide three compact palette-popup triggers. The host
injects `themes`, shared `settings` scope and the Progress instances to update.
The tool reuses `palette/picker.js`, FormField and a non-modal, anchored Popover. Config stores palette
references plus a generic `appearance` map for runtime/template consumers. These
editor dependencies remain excluded from `manifest.json` runtime/export files.
