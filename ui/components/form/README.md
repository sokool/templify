# Form fields

One field per type, with one shared implementation. The Form catalogue loads the
actual exported HTML templates rather than building a second demonstration form.
There is no duplicate playground or separate disabled/read-only field catalogue.

## Independent exports

Choose any `field-*` component in **Tools → Export**, or use:

```sh
npm run export -- --components field-number,field-range,field-select --out ./my-fields
```

Each field includes its documented HTML, shared CSS and local JavaScript. It does
not require the Form container, Buttons, workspace, storage or configuration tools.
The existing exporter discovers fields by the same directory convention as every
other component; no field manifest or special export path is needed.

| Family | Export names |
| --- | --- |
| Text | `field-text`, `field-password`, `field-email`, `field-tel`, `field-url`, `field-search`, `field-textarea` |
| Numeric | `field-number`, `field-quantity`, `field-range` |
| Date/time | `field-date`, `field-time`, `field-datetime-local`, `field-month`, `field-week` |
| Choices | `field-checkbox`, `field-radio`, `field-switch` |
| Lists | `field-select`, `field-multiselect`, `field-suggestions` |
| Other | `field-file`, `field-color`, `field-hidden` |

Single/grouped selects use the same renderer; single/multiple files use the same
file field. A checkbox group can contain one or several options. Attributes such as
`multiple`, `disabled`, `readonly`, `required`, `min`, `max` and `step` configure the
existing field rather than introducing another implementation.

## Runtime boundaries

- `field.js`: builds fields with `mount(host, options)` or hydrates existing HTML
  with `enhance(element, options)`. Both paths share validation, events and cleanup.
- `controls.js`: one select/multiselect option renderer, number stepping, slider
  fill, free-text suggestions and shared popup positioning/dismissal.
- `pickers.js`: themed calendar, time, month, ISO-week and hex-colour dialogs.
- `validation.js`: native `ValidityState` messages and at-least-one group rules.
- `form.css`: field geometry and theme-token styling, including all popups.
- `field-client.js`: the HTML-first lifecycle used by independent field exports.
- `form.html` / `client.js`: optional empty native form container. The application
  inserts selected field templates and its own buttons/endpoints.
- `form.js`: retained classic composition API; submission is intercepted only by
  this explicit JavaScript API, never by the HTML-first Form/field clients.
- `workspace/form*.js/css`: catalogue ordering/loading/layout only; not exported.

Native controls stay in the DOM and remain the source of values, native validity,
`FormData`, defaults and reset. Without JavaScript, controls retain platform UI.
The system file chooser remains system-owned even with JavaScript.

## Behaviour

- Numbers: compact themed up/down buttons or `data-quantity="true"` for minus/plus.
  Both use native `stepUp`/`stepDown`; disabled/read-only and bounds disable buttons.
- Slider: native range keyboard behaviour, themed track/fill/thumb, live output
  and optional `data-unit`. The fill and accessible value update on input/reset.
- Select: arrows, Home/End, typeahead, Enter/Space, Escape and outside dismissal.
  Selected options retain a tick and selection colour independently of hover and
  the keyboard focus outline.
- Multiselect: the same renderer in an always-visible listbox. Click/Space toggles
  without modifier keys; Shift+click adds a range. `selectedOptions`, native size,
  optgroups, disabled options and repeated FormData keys remain supported.
- Suggestions: a native datalist supplies values to a themed filtered combobox;
  users may still submit arbitrary free text.
- Date/time: custom themed popups replace unstyleable platform popups. Calendar
  arrows/Home/End/PageUp/PageDown move focus; heading buttons switch month/year
  views. ISO text entry permits distant dates and precise time steps/seconds.
  Datetime/time changes are drafts until Apply; Escape/outside dismissal cancels.
  Weeks are ISO Monday–Sunday weeks, including cross-year boundaries.
- Colour: current-theme palette shortcuts plus arbitrary six-digit hex entry.
- Every field exposes `control`, `controls`, `focusTarget`, `getValue()`,
  `validate()`, `setError()`, `sync()`, `reset()` and `destroy()`.
  `reset()` clears field UI after native form reset, not native values itself.
- Native property changes should be followed by `sync()` or input/change events;
  supported attribute mutations are observed automatically.
- HTML-first fields never intercept submission. Applications own `action/method`,
  HTMX attributes and server validation. Error messages are shared with ARIA.
- Destroy removes owned helpers, listeners and observers, restores native focus
  targets and leaves server-owned markup intact. Classic `mount` owns its DOM and
  removes it on destroy.

## Classic API compatibility

Load foundations and `form.css`, then `validation.js`, `pickers.js`, `controls.js`,
`field.js` and optionally `form.js`. CommonJS is also supported.

```js
const field = DesignSystemFormField.mount(host, {
  type: 'number', name: 'budget', label: 'Budget', unit: 'PLN',
  attrs: { value: 14200, min: 0, max: 1000000, step: 100 },
});
```

The composition API still supports sections, `addField`, `attachField`, submitter
values, image coordinates, externally associated fields and native reset.

## Themes and verification

Light, Dark, Matrix and custom themes use shared semantic tokens, font, corners and
shadows. No popup retains platform grey/blue colours. Field overrides:
`--ds-form-field-height`, `--ds-form-field-radius`, `--ds-form-control-font-size`,
`--ds-form-surface`, `--ds-form-error`.

```sh
npm test
npx playwright test ui/testing/form-fields.browser.cjs
```

Browser tests cover every independent export, catalogue uniqueness, native
submission/reset, number bounds, slider keyboard/fill, select hover/selection,
themed pickers, calendar navigation, ISO weeks and HTMX teardown/reinitialization.
`tests/browser.html` retains the classic native DOM/FormData regression suite.
