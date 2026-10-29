# Shared authoring tools

Generic editors live here, independently of the components that use them.

| Tool | Module | Workspace destination |
| --- | --- | --- |
| Palette picker | `palette-picker/palette-picker.js` + `.css` | `#topschrank.tools.palettepicker` |
| Shadows | `shadows/shadows.js` + `.css` | `#topschrank.tools.shadows` |
| Contrast checker | `contrast-checker/contrast-checker.js` + `.css` | `#topschrank.tools.contrastchecker` |

`examples/tools.js` only composes their workspace pages. Component configurators
use these same modules, not copies. Contrast checker and Shadows live in Tools,
not inside the Palette page. Components never import tools.

## Compact by default

All authoring controls must be compact. Load `tools.css` and give their control
container the `ds-tool` class: 34px Form controls, small picker triggers, tight
spacing and compact buttons. Use responsive rows and short descriptions; do not
reserve viewport-height whitespace. Never apply this class to the component's
preview — the preview must show its real production dimensions and typography.

Use the existing Form fields, Buttons and Palette picker rather than duplicating
controls. JavaScript and CSS must remain formatted and readable, not minified.

Text-field sizing excludes checkbox, radio and range controls. Form owns their
geometry; tool padding/min-height must not stretch its switch into a square.

## Theme-owned settings

The host injects the active theme controller. Tool preferences belong to the
selected Palette theme and use its canonical persistence, copy and export paths.
Reset affects only the active theme's corresponding settings.

Shadow definitions remain in `foundations/shadows.js`: they are shared design
tokens, not editor UI. Their authoring controls live in `tools/shadows/` and are
used from the Tools submenu and selected by component configurators.
