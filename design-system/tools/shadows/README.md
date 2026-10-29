# Shadows tool

`DesignSystemShadowsTool.mount(host, { themes })` provides a compact editor for
the selected theme's Soft, Medium and Strong profiles. None is immutable and
always shadow-free. Form supplies the select/sliders, Buttons supplies Reset and
PalettePicker supplies palette-only colour selection.

Load `shadows.css`, `../tools.css` and `shadows.js`, together with those shared
control assets. The editor is mounted in **Tools → Shadows**, not inside Palette.
`destroy()` removes subscriptions, popups and owned controls.

The pure definition/validation module is `../../foundations/shadows.js`; no
component runtime imports the editor. See `../../palette/README.md` for profile
metadata, theme-specific persistence and CSS/token exports.
