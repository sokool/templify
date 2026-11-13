# Window

One independent component for popups and side panels. By default, native `<dialog>.showModal()` supplies top-layer stacking, background inertness and focus containment. With `lockScroll: false`, the same component uses `.show()`: the background stays scrollable and interactive, without a backdrop or modal focus trap. No application routing, storage, icons, content components or configuration tools are imported.

## API

`DesignSystemWindow.mount(host, options)` returns `element` (dialog), `body`, `open()`, `close(reason='api', {immediate:false})`, `isOpen()`, `update(patch)`, `getSize()`, `subscribeResize(listener)` (returns an unsubscribe function) and `destroy()`.

Options:

- `title`, `content` and `footer` (plain text or explicit DOM Nodes; never evaluated HTML).
- `mode`: `modal` (default) or `side`; `side`: `right` (default), `left`, `top` or `bottom`.
- `size`: `auto`, `xs` (320 px), `sm` (400 px), `md` (480 px), `lg` (640 px), `xl` (800 px). Sets width for popups and left/right panels, height for top/bottom panels. Auto fits content. Left/right panels fill the viewport height; top/bottom panels fill its width. All sizes remain viewport-bounded.
- `width` / `height`: optional explicit pixel overrides (`null` fits content), retained for compatibility and manual resizing. Without a named size, width defaults to 480 and height to content height (`null`). Explicit dimensions take precedence over a preset. Updating `size` restores that preset; manual resizing switches `data-size` to `custom`.
- `resizable`: false by default. Enables a draggable, keyboard-focusable bottom-right corner for popups or the inner edge for panels. Left/right panels resize horizontally; top/bottom panels vertically. Arrow keys on the active axis resize by 10 px; Shift uses 50 px steps.
- `closeOnEscape`, `closeOnBackdrop`, `showClose`, `lockScroll`: true by default.
- `lockScroll: false` makes either layout non-modal, allowing real page scrolling and background interaction. It can change while open without losing content. Backdrop dismissal applies only to blocking windows; Escape and explicit close work in both modes.
- `duration`: 220 ms by default (0–2000); side panels slide in from their screen edge and slide back out without fading or scaling. Centred popups retain their fade/scale animation. Reduced-motion preferences disable animation.
- `initialFocus`: an element or a selector inside the body.
- `onOpen()` and `onClose(reason)` callbacks. Close reasons include `button`, `escape`, `backdrop`, or caller-supplied values.
- `onResize({width, height})`: called after a completed manual resize, not programmatic updates or viewport changes. `subscribeResize` observes the same events. `getSize()` returns the preferred dimensions (`null` means content-sized); viewport clamping does not overwrite them. Pointer cancellation, lost capture, disabling resize and teardown cancel an unfinished resize without saving it or losing the selected preset.
- `container`: optional portal destination; defaults to the host document body.

Creation does not open the window. Header, scrollable body and optional footer are separate. Content updates happen only when supplied in a patch; changing appearance preserves embedded controls and their values. Callers mount/destroy any embedded components themselves. Explicit close remains available even when dismissal by Escape/backdrop is disabled. Focus returns to the opener; scroll locking is reference counted across overlapping windows. Destroy closes immediately and releases locks/listeners/timers.

For HTML-first export use `window.html` and [UI](../../README.md). The client adopts
the existing dialog and preserves its body/controls. Behaviour attributes are
documented in the HTML comment and map to the same options used by `update()`.
Classic usage loads foundations, `window.css` and `window.js`.

Open `../../../index.html#topschrank.components.window`. The Window uses the real browser viewport, including when examples emulate a narrower device. Test real device widths for full-screen side panels.

The workspace page includes an authoring-only playground (`workspace/window-demo.js`
and `.css`): layout, size and behaviour controls with a single open action.
Size offers Auto plus XS/S/M/L/XL; manually resized dimensions display as Custom
without adding another preset. The sample composes User identity, Badges, Progress,
FormField, Notifications and Buttons: checking tasks updates progress and status;
saving shows a confirmation. There are no diagnostic controls in the window.
Its controls use the public Window API and
are never exported.
Demo behaviour settings are local to this preview; they do not change shared
settings or the exported HTML. The ordinary Cancel footer action remains available
even when the close button, Escape and backdrop are disabled.
Option changes preserve sample form values while the page remains mounted.

Templify shares scroll-lock and resize settings across its Window instances and enables resize by
default. Explicit per-window options take precedence over shared settings,
including live updates: Kanban's Used components panel always uses
`lockScroll: false` so the board stays scrollable and interactive.
`workspace/windows.js` persists manually chosen sizes separately at
`preview.windows.<stable-window-id>.size`: the Window demo, Kanban dependencies
and Palette colour picker each retain their own size across navigation/reload.
Preferences belong to the current browser profile, not a theme; they never alter
other windows' default sizes and are excluded from template/token/CSS exports.
Full workspace backups retain them. Runtime does not access browser storage.
