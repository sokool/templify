# Counts And Summaries

Migrated from the original Extended library. Browser global `DesignSystemCountsAndSummaries`; CommonJS supported.

`mount(element, options)` returns `element`, `update(patch)` and `destroy()`.

Data: `label, items: [{label, value, description?}]`. Text renders safely as text. No application data, storage, tools, fonts catalogue or icon registry is imported. Host controls state and callbacks; examples own demo buttons.

Load foundations `tokens.css` and `primitives.css` once, then `counts-and-summaries.css` and `counts-and-summaries.js`. There are no component or package dependencies. Colours and fonts inherit semantic tokens. The manifest lists the full export.

Example: `../../../app/index.html#topschrank.components.countsandsummaries`.
