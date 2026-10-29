# Icons and glyphs

This directory is an **asset library**, not an application component. It contains reusable vector drawings and a small optional renderer. The catalogue, search box, size slider and clipboard interaction live in `icons/`.

## Structure

- `svg/{name}.svg`: individual, portable vector assets. Export only the icons a consumer needs, together with `LICENSE`.
- `icons.js`: classic browser script / CommonJS bundle exposing `DesignSystemIcons.svg(name, options)`, `has(name)` and `names`.
- `icons.css`: default inline SVG sizing and alignment through `.ui-icon`. Contexts can override icon size; colour comes from `currentColor`.
- `manifest.json`: dependency and export information.
- `LICENSE`: original source notice, retained during migration.

The 144 original SVG definitions render identically to the original playground. Five application utility drawings support Fonts, theme and device controls. The catalogue now has 480 icons in 15 categories of 32, without duplicate names. Additional SVGs come from the same Lucide 0.468.0 release. The additional `shapes` utility identifies Icons and glyphs; `square-terminal` identifies Matrix mode. All 482 assets have individual SVG files; the catalogue remains 15 × 32.

## Use

Load `icons.js`, then pass `DesignSystemIcons.svg` to Navigation as its `renderIcon` callback. Navigation remains independent of this particular library. Other components can accept an SVG or renderer in the same way.

`svg('search')` returns a decorative SVG string. The containing button/link must have an accessible name. `svg('search', {size: 24, label: 'Search'})` returns a named image when the SVG itself needs a label. Unknown names return an empty string; `has(name)` checks availability. Names and label text are not interpreted as markup.

Fonts, theme selection, storage, routing and catalogue controls are not dependencies. Icons use paths, not an icon font; changing the interface font cannot change their geometry. Text keyboard glyphs such as `⌘`, `↵` and `Esc` are typography examples in the catalogue tool and follow the interface font.

## Catalogue and composition

`../../tools/icons/icon-categories.js` organizes the catalogue and provides tags/aliases for searching; it is not needed by the asset runtime. `../../tools/icons/icons.js` renders the catalogue and accepts the SVG library, optional existing controls and a clipboard callback. Both the main playground and the shared examples use that tool and the same asset source.

Open `../../../app/index.html#topschrank.iconsandglyphs` to browse, search, resize and copy icon names. Configuration/presentation code must not be imported into production components.
