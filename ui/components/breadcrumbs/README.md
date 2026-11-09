# Breadcrumbs

Independent dot-separated path navigation, extracted from the Top Schrank playground.

## Files and dependencies

Local runtime: **`breadcrumbs.js` + `breadcrumbs.css`**. Shared runtime: **`../../defaults.css` + `../../primitives.css`**, loaded once per page, including when Tabs is present. No other components, packages, icon set, router, font download or storage are required. The workspace header, configurator previews and isolated example all use this implementation.

For HTML-first export use `breadcrumbs.html` and [UI](../../README.md). The HTML-first
client preserves links supplied by the server. Classic API tests use Node's test runner.

The JavaScript is a plain script to preserve opening the existing playground via `file://`, without a server or bundler. It exposes one browser namespace, `DesignSystemBreadcrumbs`; CommonJS exports support tests. This is a source module, not a framework-specific component.

## Use

```html
<link rel="stylesheet" href="./ui/defaults.css">
<link rel="stylesheet" href="./ui/primitives.css">
<link rel="stylesheet" href="./ui/components/breadcrumbs/breadcrumbs.css">
<script src="./ui/components/breadcrumbs/breadcrumbs.js"></script>
<nav id="project-path"></nav>
<script>
const breadcrumbs = DesignSystemBreadcrumbs.mount(
  document.getElementById('project-path'),
  {
    label: 'Breadcrumb',
    items: [
      { id: 'home', label: 'topschrank', emphasisLength: 3, href: '/' },
      { id: 'orders', label: 'orders', href: '/orders' },
      { id: 'board', label: 'kanbanboard', href: '/orders/board' }
    ],
    appearance: { size: 23, weight: 'contrast', hover: 'draw' }
  }
);
</script>
```

Without `onNavigate`, links navigate normally. For a client-side router, supply `onNavigate(item, event)`. The callback intercepts an unmodified primary click only; Ctrl/Cmd-click and other browser link gestures are preserved. The last item remains clickable and gets `aria-current="page"`.

`label` and item labels are plain text, never interpreted as HTML. `emphasisLength` optionally bolds a prefix of the first item. IDs are opaque data: the component does not interpret routes or project types. JavaScript/data URL protocols are rejected.

## Lifecycle

```js
breadcrumbs.update({ items: nextPath });
breadcrumbs.update({ appearance: { size: 18, longPaths: 'full' } });
breadcrumbs.destroy();
```

The mount target must be a dedicated `<nav>`. Mount once per target, then update. `destroy()` removes owned listeners, markup, attributes and inline `--ds-bc-*` properties; it leaves the host element intact. Do not use those properties for unrelated host styles.

Every instance has its own settings. There are no global document appearance attributes or global configuration state. The component installs a document pointer listener solely to close its own overflow popup; `destroy()` removes it.

## Appearance

| Option | Values / meaning |
| --- | --- |
| `size` | Font size in px, 10–48; default 23 |
| `scheme` | `hierarchy`, `progressive`, `alternating`, `accent-trail`, `current-only`, `neutral-ramp`, `nearby`, `monochrome` |
| `weight` | `contrast`, `balanced`, `quiet`, `uniform` |
| `hover` | `curve`, `line`, `dot`, `dash`, `double`, `marker`, `tint`, `glow`, `corners`, `wave`, `draw`, `none` |
| `longPaths` | `collapse` keeps root + last two levels, with earlier levels in a disclosure; `full` displays every level |
| `brandFocus` | Uses `accent` for the current path item; default true |
| `separator` | Visual separator text; default `.` |
| `colours` | Partial object: `brand`, `parent`, `current`, `dot`, `hover` |
| `accent`, `panel`, `border`, `text`, `soft` | Optional colours for current emphasis and overflow popup |
| `accents`, `greys` | Optional non-empty colour arrays for the palette-trail / grey-step schemes |

All colours fall back to the shared foundation. Applications may supply their own
`--ds-bc-*` CSS properties. Classic `appearance` options map to these properties;
`--ds-bc-font-family` falls back to `--ds-font-family`.

The component emits semantic `nav > ol > li` markup with links, decorative separators and a native `details/summary` disclosure. Escape closes the disclosure and returns focus to its summary; clicking outside closes it. CSS respects reduced motion. Long full paths may wrap; host layouts may choose to constrain or locally scroll the example area.

## Boundaries

- Component: rendering, scoped styles, path overflow, focus/dismissal, appearance calculation. Shared foundation: semantic tokens, box sizing and keyboard focus appearance.
- Application adapter: route IDs and URLs, navigation callback, mapping theme tokens.
- Playground: select controls, colour picker, seven examples, saved settings.

The configurator has been removed. The legacy host adapter is in
`../../../workspace/breadcrumbs-adapter.js`; workspace composes Breadcrumbs directly.

## Verification

```sh
node --test tests/*.test.cjs
```

Open `example.html` to inspect the independent rendering. Open the main playground to inspect the application integration. No build step is required.
