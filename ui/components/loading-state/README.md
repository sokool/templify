# Loading State

Migrated from the original Extended library. Browser global `DesignSystemLoadingState`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `loading (true), label, lines (3, maximum 12), content: string | Node`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

Load foundations `tokens.css` and `primitives.css` once, then `loading-state.css` and `loading-state.js`. There are no component or package dependencies. Colours and fonts inherit semantic tokens. The manifest lists the full export.

Example: `../../../app/index.html#topschrank.components.loadingstate`.
