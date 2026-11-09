# Tooltip

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemTooltip`. CommonJS is also supported.

A scope element or document. Descendants with `data-tooltip` or `title` become triggers. Options: `selector`, `distance` (6 px), `duration` (350 ms).

`mount(scope, options)` → `show(anchor, text?)`, `hide(immediate?)`, `update(options)`, `destroy()`. Uses hover and keyboard focus, viewport-aware placement, native top-layer popovers when supported, fade in/out, and reduced-motion support. Hides on pointer leave, click, scrolling, resize, focus loss, Escape or anchor removal. ARIA descriptions and native titles are restored; listeners and timers are removed on destroy. Tooltips are noninteractive descriptions, not menus.

## Dependencies and export

For HTML-first export use `tooltip.html` and the exporter described in [UI](../../README.md). Classic workspace usage loads foundations, `tooltip.css` and `tooltip.js`. Fonts and colours inherit semantic tokens.

Public appearance tokens: `--ds-tooltip-bg`, `--ds-tooltip-text`, `--ds-tooltip-border`, `--ds-tooltip-accent`, `--ds-tooltip-weight`, `--ds-tooltip-style`, `--ds-tooltip-padding`, `--ds-tooltip-size`.

Examples and their data live in `../../../workspace/components.js`; open `../../../index.html#topschrank.components.tooltip`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

The configurator has been removed. In HTML-first usage set public CSS tokens on
the trigger or its parent. The client transfers them to the auxiliary tooltip,
including when the trigger arrives through HTMX.
