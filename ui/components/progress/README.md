# Progress

Migrated from the original Extended library. Browser global `DesignSystemProgress`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, value (0–100), max (100), indeterminate (false)`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

For HTML-first export use `progress.html` and [UI](../../README.md). Classic usage loads `defaults.css`, `primitives.css`, `progress.css` and `progress.js`.

Example: `../../../index.html#topschrank.components.progress`.

Appearance is optional: `appearance: {fill, border, shadow}` takes generic CSS
colour values or `var(...)` references. These map to `--ds-progress-fill`,
`--ds-progress-border`, `--ds-progress-shadow`. The outline is 1px; the colour of
the soft outer shadow is mixed with transparency. Value updates preserve appearance.
Destroy restores pre-existing inline variables. No palette or settings knowledge
exists in the runtime.

The configurator has been removed. The HTML-first client updates the existing
native progress element via `Templify.get(element).update({value, max, indeterminate})`.
