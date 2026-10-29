# Tooltip

Migrated from the original prototype into an independent runtime module. The original HTML is retained as a reference and is not modified by this migration.

## API

Browser global: `DesignSystemTooltip`. CommonJS is also supported.

A scope element or document. Descendants with `data-tooltip` or `title` become triggers. Options: `selector`, `distance` (6 px), `duration` (350 ms).

`mount(scope, options)` → `show(anchor, text?)`, `hide(immediate?)`, `update(options)`, `destroy()`. Uses hover and keyboard focus, viewport-aware placement, native top-layer popovers when supported, fade in/out, and reduced-motion support. Hides on pointer leave, click, scrolling, resize, focus loss, Escape or anchor removal. ARIA descriptions and native titles are restored; listeners and timers are removed on destroy. Tooltips are noninteractive descriptions, not menus.

## Dependencies and export

Load `../../defaults.css` and `../../primitives.css` once, then `tooltip.css` and `tooltip.js`. `manifest.json` lists the complete export. No other component, package, icon registry, routing, storage, font selector or theme editor is required. Fonts and colours are inherited through semantic tokens; optional icons are supplied as DOM Nodes. Text is rendered as text, not HTML.

Public appearance tokens: `--ds-tooltip-bg`, `--ds-tooltip-text`, `--ds-tooltip-border`, `--ds-tooltip-accent`, `--ds-tooltip-weight`, `--ds-tooltip-style`, `--ds-tooltip-padding`, `--ds-tooltip-size`.

Examples and their data live in `../../../app/workspace/components.js`; open `../../../app/index.html#topschrank.components.tooltip`. Behaviour and export-boundary tests live in `../../testing/migrated-components.test.cjs`.

## Development tool — excluded from the component

`configurator/configurator.js` and `configurator/configurator.css` are a configurator placed beside this component for convenience. They are **not part of the design-system runtime or export**. The runtime never imports them. The example host explicitly loads the tool and injects document/storage. Shared editor plumbing stays in `../../tools/shared/appearance/appearance.js` and `appearance.css`; palette reference data comes from examples as well.

The tool stores its own settings under `design-system-examples-tooltip` in localStorage and applies public appearance tokens to the example root. It can be removed without changing component behaviour. Font/colour controls and persistence must never be moved into the runtime entry.
