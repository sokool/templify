# Typography tool

Application-level font selection and typography preview.

The host explicitly loads `fonts.js` / `fonts.css` and exposes them under
**Theme → Typography**. Font selection and previews are authoring UI, not component
dependencies. The tool loads Google Fonts and applies `--ds-font-family`; system
fonts remain the offline fallback. Persistence is injected by the host.
