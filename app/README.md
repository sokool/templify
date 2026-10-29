# Templify application

Open `index.html` directly in a browser or serve the repository with a static server.
No package installation or build is required. Google Fonts previews need network access.

- `workspace/workspace.js` composes Navigation, Breadcrumbs, routes, component
  previews, configurators and global tools through their public APIs.
- `workspace/` also owns page-specific composition, sample datasets and preview CSS.
- `storage/settings.js` provides injectable persistence; `storage/workspace-settings.js`
  owns host scopes and compatibility mappings. Runtime components never import them.
- UI definitions, assets, components and authoring tools live under `../ui/`.

The menu groups Colours, Typography, Icons and Glyphs, and Shadows under **Theme**.
**Tools** contains Contrast checker and Palette picker. Device and active-theme
controls remain workspace utilities.

Existing route anchors, storage keys and public JavaScript names are retained so
reorganizing files does not discard configuration or break bookmarked destinations.
The new Theme overview is at `#templify.theme`.

The application was previously the composition workspace under
`design-system/examples/`. Small standalone examples now live in `../ui/examples/`;
they do not depend on this host. `../top-schrank-ui.html` is the historical playground,
not a second implementation of the main application.
