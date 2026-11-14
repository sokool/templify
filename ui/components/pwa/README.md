# PWA

HTML-first installation UI: a persistent button and a non-modal banner.
It does not implement offline caching, push notifications, or a feature switch.

## Configuration

All copy and platform instructions live in `pwa.html` and can be translated by
the host. Buttons uses the shared theme; the banner never locks scrolling or
automatically moves keyboard focus.

| Root attribute | Default | Meaning |
| --- | --- | --- |
| `data-pwa-prompt` | `auto` | `auto` suggests installation; `manual` only opens on user request |
| `data-pwa-delay` | `5000` | Minimum time after mounting, in milliseconds, before suggesting |
| `data-pwa-dismiss-days` | `7` | Cooldown after “Not now” or a dismissed native installer |
| `data-pwa-placement` | `inline` | `inline` or a responsive `fixed` banner at the bottom |

Automatic suggestions require a captured `beforeinstallprompt` event, iOS/iPadOS
instructions, or Safari on macOS. Unknown browsers only show instructions on
request. Native prompts are invoked directly from a click, never from a timer.
Safari instructions depend on OS/browser support and are not proof of installability.

## API and persistence

Exported HTML is initialised by `Templify.init()` and exposes its instance through
`Templify.get(element)`. Classic scripts expose `DesignSystemPWA`:

```js
// The host owns persistence and can capture installation events before views mount.
const controller = DesignSystemPWA.create({
  document,
  settings: preferences.scope('pwa'),
});
const view = DesignSystemPWA.mount(element, { controller });
view.update({ delay: 10000, dismissDays: 14 });
view.show();       // Our information banner, not a system installer.
// view.install() must be called during a user action to open a native installer.
view.getState();
view.destroy();
controller.destroy(); // Only after all views using it have been removed.
```

`settings` is an optional host adapter with `get(key, fallback)`,
`set(key, value)` and optional `subscribe(callback)` returning an unsubscribe
function. The only stored key is the absolute timestamp `dismissedUntil`.
Keep it in user preferences, not in theme/template configuration. Without an
adapter, the cooldown is in memory only. Views without an injected controller
share a reference-counted controller for their document; the first view supplies
its adapter. It is released when the last such view is destroyed.

`dismiss()` closes banners but leaves the manual button available. A dismissed
view does not automatically reopen until remounted; the saved cooldown also
applies to subsequent visits. Explicit user requests can open it at any time.

Events bubble from the root: `ui:pwa-show` (`reason`, `status`),
`ui:pwa-dismiss` (`dismissedUntil`), `ui:pwa-choice` (`outcome`),
`ui:pwa-installed`, and `ui:pwa-error` (`error`, `operation`).

## Honest installation states

- `standalone`: launched in standalone/minimal-ui/window-controls-overlay mode,
  or iOS reports `navigator.standalone`.
- `installed`: `appinstalled` was received in this controller's lifetime.
- `available`: a native installation event has been captured.
- `manual`: recognised iOS/iPadOS or macOS Safari installation instructions.
- `pending`: the installer was accepted; completion has **not** been confirmed.
- `unknown`: no native installer is currently available; this is **not** proof
  of installation or lack of installation.
- `unavailable`: local file or insecure context.

Controls hide for `standalone`, `installed` and `pending`. There is no universal
API to discover an already-installed PWA from an ordinary browser tab.

## Host requirements

Provide HTTPS (localhost works for development), a linked web app manifest with
`id`, `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, and app
icons of at least 192×192 and 512×512. A 180×180 PNG `apple-touch-icon` is useful
for iOS. Keep URLs within the intended app scope.

Templify's example is in `workspace/pwa.webmanifest`; it describes **Templify**,
not an application using exported components. Exports intentionally do not copy
the host manifest, icons, storage adapter, or service worker. Add your own
manifest to your application's document head. Current Chromium installation does
not require a service worker; add one separately only when its caching/update
policy has been designed.

Installation and the system UI must still be checked on real Android, iOS and
desktop devices. Browser tests simulate capability events and cannot install an
OS application.
