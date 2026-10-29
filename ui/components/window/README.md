# Window

One independent component for popups and side panels. By default, native `<dialog>.showModal()` supplies top-layer stacking, background inertness and focus containment. With `lockScroll: false`, the same component uses `.show()`: the background stays scrollable and interactive, without a backdrop or modal focus trap. No application routing, storage, icons, content components or configuration tools are imported.

## API

`DesignSystemWindow.mount(host, options)` returns `element` (dialog), `body`, `open()`, `close(reason='api', {immediate:false})`, `isOpen()`, `update(patch)`, `getSize()`, `subscribeResize(listener)` (returns an unsubscribe function) and `destroy()`.

Options:

- `title`, `content` and `footer` (plain text or explicit DOM Nodes; never evaluated HTML).
- `mode`: `modal` (default) or `side`; `side`: `right` (default) or `left`.
- `width`: 480 by default, constrained to the screen. Mobile side panels can fill its width.
- `height`: `null` (content height) by default; explicit popup heights stay within the viewport. Side panels always fill the viewport height.
- `resizable`: false by default. Enables a draggable, keyboard-focusable bottom-right corner for popups or the inner vertical edge for side panels. Arrow keys resize; Shift uses larger steps. Side panels resize horizontally only.
- `closeOnEscape`, `closeOnBackdrop`, `showClose`, `lockScroll`: true by default.
- `lockScroll: false` makes either layout non-modal, allowing real page scrolling and background interaction. It can change while open without losing content. Backdrop dismissal applies only to blocking windows; Escape and explicit close work in both modes.
- `duration`: 220 ms by default (0–2000); reduced-motion preferences disable animation.
- `initialFocus`: an element or a selector inside the body.
- `onOpen()` and `onClose(reason)` callbacks. Close reasons include `button`, `escape`, `backdrop`, or caller-supplied values.
- `onResize({width, height})`: called after a completed manual resize, not programmatic updates or viewport changes. `subscribeResize` observes the same events. `getSize()` returns the preferred dimensions; viewport clamping does not overwrite them. Pointer cancellation, lost capture, disabling resize and teardown cancel an unfinished resize without saving it.
- `container`: optional portal destination; defaults to the host document body.

Creation does not open the window. Header, scrollable body and optional footer are separate. Content updates happen only when supplied in a patch; changing appearance preserves embedded controls and their values. Callers mount/destroy any embedded components themselves. Explicit close remains available even when dismissal by Escape/backdrop is disabled. Focus returns to the opener; scroll locking is reference counted across overlapping windows. Destroy closes immediately and releases locks/listeners/timers.

Load foundations `tokens.css` / `primitives.css`, `window.css` and `window.js`. No other component or package is required. `manifest.json` lists the export. `configurator/configurator.js` is an optional development configurator that reuses FormField; it is excluded from runtime/export. Examples compose User identity, FormField and Buttons inside Window without making them runtime dependencies.

Open `../../../app/index.html#topschrank.components.window`. The Window uses the real browser viewport, including when examples emulate a narrower device. Test real device widths for full-screen side panels.

The optional tool accepts an injected `settings` scope (`defaults`, `snapshot`, `set`). The example host supplies it from the shared store and restores appearance/behaviour after reload. The tool exports its default configuration as `defaults`; runtime configuration can be passed directly through `update()` without loading the tool. Selection/demo content is not persisted as template configuration.

The tool exposes **Lock page scroll** and **Allow manual resize**. Templify shares
these two behaviour settings across its Window instances and enables resize by
default. Explicit per-window options take precedence over shared settings,
including live updates: Kanban's Used components panel always uses
`lockScroll: false` so the board stays scrollable and interactive.
`app/workspace/windows.js` persists manually chosen sizes separately at
`preview.windows.<stable-window-id>.size`: the Window demo, Kanban dependencies
and Palette colour picker each retain their own size across navigation/reload.
Preferences belong to the current browser profile, not a theme; they never alter
other windows' default sizes and are excluded from template/token/CSS exports.
Full workspace backups retain them. Runtime does not access browser storage.
