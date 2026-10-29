# Contrast checker

`DesignSystemContrastCheckerTool.mount(host, { themes, contrast })` compares two
colours using the shared compact Palette picker. `contrast` is an injected colour
calculator; the workspace reuses `PaletteGenerator.contrast` rather than copying
its WCAG/chroma.js logic. Load `contrast-checker.css`, `../shared/tools.css` and the
shared picker/control assets.

Palette selections and custom HEX are supported. The preview follows theme colour
edits and reports WCAG AA, AAA and large-text/UI thresholds. Selections persist
under the active theme's `contrast-checker-tool` settings. **Use theme Text / Panel**
resets only this pair. `destroy()` removes subscriptions and popups.

Open **Tools → Contrast checker** (`#topschrank.tools.contrastchecker`). This tool
is no longer embedded in Palette and never becomes a component runtime dependency.
