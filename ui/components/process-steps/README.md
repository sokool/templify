# Process Steps

Migrated from the original Extended library. Browser global `DesignSystemProcessSteps`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, items: [{label, description?, status: done | current | pending}]`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

For HTML-first export use `process-steps.html` and [UI](../../README.md). Classic usage loads `defaults.css`, `primitives.css`, `process-steps.css` and `process-steps.js`.

Example: `../../../index.html#topschrank.components.processsteps`.
