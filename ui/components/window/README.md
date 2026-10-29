# Window

One independent component for modal popups and modal side panels. Native `<dialog>.showModal()` supplies top-layer stacking, background inertness, focus containment and browser accessibility. The side-panel mode remains modal. No application routing, storage, icons, content components or configuration tools are imported.

## API

`DesignSystemWindow.mount(host, options)` returns `element` (dialog), `body`, `open()`, `close(reason='api', {immediate:false})`, `isOpen()`, `update(patch)` and `destroy()`.

Options:

- `title`, `content` and `footer` (plain text or explicit DOM Nodes; never evaluated HTML).
- `mode`: `modal` (default) or `side`; `side`: `right` (default) or `left`.
- `width`: 480 by default, constrained to the screen. Mobile side panels can fill its width.
- `closeOnEscape`, `closeOnBackdrop`, `showClose`, `lockScroll`: true by default.
- `duration`: 220 ms by default (0–2000); reduced-motion preferences disable animation.
- `initialFocus`: an element or a selector inside the body.
- `onOpen()` and `onClose(reason)` callbacks. Close reasons include `button`, `escape`, `backdrop`, or caller-supplied values.
- `container`: optional portal destination; defaults to the host document body.

Creation does not open the window. Header, scrollable body and optional footer are separate. Content updates happen only when supplied in a patch; changing appearance preserves embedded controls and their values. Callers mount/destroy any embedded components themselves. Explicit close remains available even when dismissal by Escape/backdrop is disabled. Focus returns to the opener; scroll locking is reference counted across overlapping windows. Destroy closes immediately and releases locks/listeners/timers.

Load foundations `tokens.css` / `primitives.css`, `window.css` and `window.js`. No other component or package is required. `manifest.json` lists the export. `configurator/configurator.js` is an optional development configurator that reuses FormField; it is excluded from runtime/export. Examples compose User identity, FormField and Buttons inside Window without making them runtime dependencies.

Open `../../../app/index.html#topschrank.components.window`. The Window uses the real browser viewport, including when examples emulate a narrower device. Test real device widths for full-screen side panels.

The optional tool accepts an injected `settings` scope (`defaults`, `snapshot`, `set`). The example host supplies it from the shared store and restores appearance/behaviour after reload. The tool exports its default configuration as `defaults`; runtime configuration can be passed directly through `update()` without loading the tool. Selection/demo content is not persisted as template configuration.
