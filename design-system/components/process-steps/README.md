# Process Steps

Migrated from the original Extended library. Browser global `DesignSystemProcessSteps`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, items: [{label, description?, status: done | current | pending}]`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

Load foundations `tokens.css` and `primitives.css` once, then `process-steps.css` and `process-steps.js`. There are no component or package dependencies. Colours and fonts inherit semantic tokens. The manifest lists the full export.

Example: `../../examples/index.html#topschrank.components.processsteps`.
