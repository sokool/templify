# Export tool

**Tools → Export** (`#topschrank.tools.export`) selects components, resolves HTML
composition dependencies and downloads `templify-components.zip`. It does not
replace configuration imports/backups in Settings or export current theme preferences.

- `export.js`: UI composed with FormField and Buttons. All/clear selection, dependency
  explanations, package contents, progress, error/retry and teardown.
- `browser.js`: local esbuild-wasm compiler and fflate ZIP adapter. Compiler initialization
  is deferred until download; repeated exports reuse it. No CDN or export endpoint.
- `../../export/project.cjs`: shared selection, entry, compilation and package rules.
  The CLI uses native esbuild at the exact same version; browser output matches it.
- `../../scripts/build-export-tool.cjs`: generates `dist/export.js`, `sources.json`,
  `esbuild.wasm` and tool dependency licenses. `sources.json` is a derived source
  snapshot, never a hand-maintained manifest. Runtime components do not depend on it.

Run `npm ci` and `npm run build`, then serve the repository over HTTP. Rebuild after
component source changes. Generated assets are ignored by Git; Docker builds and
copies them into the static Nginx image. No Node service is deployed.

ZIP contents: `index.html`, one `ui.css`, one `ui.js`, local `htmx.min.js`, original
documented `components/*.html`, and licenses. Only selected/required components are
compiled; authoring tools, compiler and source snapshot are not part of the ZIP.

Unmount aborts source loading and prevents late downloads after an in-flight build.
Generated Blob URLs and event handlers are released. Compiler state intentionally
lives for the application lifetime, allowing exports after returning to this page.

Validation: `npm test` and `npm run test:browser`. Browser tests download/unzip the
real package, compare every file to CLI output and run the extracted preview.
