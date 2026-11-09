# Timeline

Migrated from the original Extended library. Browser global `DesignSystemTimeline`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, items: [{title, date?, datetime?, description?}]`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

For HTML-first export use `timeline.html` and [UI](../../README.md). Classic usage loads `defaults.css`, `primitives.css`, `timeline.css` and `timeline.js`.

Example: `../../../index.html#topschrank.components.timeline`.
