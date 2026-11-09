# Loading State

Migrated from the original Extended library. Browser global `DesignSystemLoadingState`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `loading (true), label, lines (3, maximum 12), content: string | Node`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

For HTML-first export use `loading-state.html` and [UI](../../README.md). Classic usage loads `defaults.css`, `primitives.css`, `loading-state.css` and `loading-state.js`.

Example: `../../../index.html#topschrank.components.loadingstate`.
