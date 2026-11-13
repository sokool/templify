# Corners tool

`DesignSystemCornersTool.mount(host, { themes })` edits the active theme's shared
corner scale and assignments under **Theme → Corners** (`#templify.theme.corners`).
Load `corners.js`, `corners.css`, `../shared/tools.css` and the shared Form and
Buttons assets. Only authoring controls use `ds-tool`; live component previews do not.
`destroy()` removes subscriptions, owned controls and the tool's DOM.

The DOM-free model lives in `../../corners/corners.js`. Small, Medium, Large and
Extra large accept whole pixel values from 0 to 64. None (0) and Pill (9999) are
immutable. Buttons, Form controls, Cards & panels, Popups, Windows, Navigation
items and Badges & chips reference profiles, not independent pixel values.

Themes exposes `setCorners(theme, { profiles, assignments })` for partial edits.
`resetCorners(theme)` resets this section only; pass `'profiles', profile` or
`'assignments', group` as the second and third arguments to reset one choice.
Settings are stored in the `org.topschrank.corners` theme extension and follow
theme copy, reset, persistence and token/CSS exports, including component ZIPs.
Older documents without the extension use defaults.

Components consume `--ds-radius-buttons`, `--ds-radius-controls`,
`--ds-radius-panels`, `--ds-radius-popups`, `--ds-radius-windows`,
`--ds-radius-navigation` and `--ds-radius-badges`. These reference foundation
variables such as `--ds-radius-large`. Components may expose a local override
such as `--ds-button-radius` or `--ds-card-radius`. Existing explicit overrides
(including Surface's numeric radius option) take precedence. The authoring tool
is never included in component exports.

Avatar geometry, radio buttons, status dots and decorative shapes stay unchanged.
Intentionally square rows and flush edges stay square; side windows round only
their exposed corners. Split button fills and card menus derive inner corners
from the corresponding outer radius with a zero clamp.
