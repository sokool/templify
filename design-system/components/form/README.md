# Form

Native form controls with the migrated floating fine-line field, divided-row select, compact spacing and inline label errors. Missing HTML control types have been added. Runtime does not import any catalogue, configuration tool, theme selector, icon gallery, application data or storage.

## Boundaries

- `field.js`: one field frame, label, hint, errors and native control. Includes the shared single-select enhancement. Use this directly from other components/tools: supply data rather than duplicating a dropdown.
- `validation.js`: descriptive messages based on native `ValidityState`, plus at-least-one group validation.
- `form.js`: optional composition of fields into sections; owns submit/reset and field lifecycle.
- `form.css`: shared control typography, focus, state and responsive layout. It uses semantic foundation colours and the inherited font.
- `tool.js`: **example-only** visual error preview. Not part of the runtime or export.
- `../../examples/form-data.js`, `form.js`, `form.css`: catalogue, local submission inspector, demo data and playground. Not a component dependency.

The old monolithic prototype remains untouched. New examples consume this module.

## Usage

Load foundation CSS once, then `form.css`, `validation.js`, `field.js`, `form.js`, in that order. Classic browser globals and CommonJS exports are available; no bundler or package is required.

```js
const form = DesignSystemForm.mount(host, {
  label: 'Project form',
  sections: [{label: 'Contact', fields: [
    {name: 'name', label: 'Full name',
     attrs: {required: true, minlength: 2, autocomplete: 'name'},
     messages: {required: 'Enter your full name.'}},
    {kind: 'select', name: 'project', label: 'Project',
     attrs: {required: true}, options: [
       {value: '', label: 'Choose a project…'},
       {value: 'wardrobe', label: 'Made-to-measure wardrobe'}
     ]}
  ]}],
  onSubmit({data, submitter}) { /* caller sends FormData, if desired */ }
});
form.addField({kind: 'button', type: 'submit', name: 'action',
  text: 'Save', attrs: {value: 'save'}});
```

Independent select (including from a configurator):

```js
const select = DesignSystemFormField.mount(host, {
  kind: 'select', name: 'padding', label: 'Padding', value: 'regular',
  options: [{value: 'tight', label: 'Tight · 4 × 7 px'},
            {value: 'regular', label: 'Regular · 8 × 11 px'}],
  onChange({value, eventType}) { if (eventType === 'change') apply(value); }
});
```

No outer Form instance is necessary for individual fields. `field.control` is the real input/textarea/select, `field.controls` the group members, and `field.focusTarget` the visible target (select trigger when enhanced). Programmatic native property changes should be followed by `field.sync()` or a native input/change event. `destroy()` removes owned DOM and all event listeners. Fields have no hidden dependency on Buttons; native submit/reset semantics are local to Form.

## Data contract

Common: `kind` (default `input`), `type` (default `text`), `id` (generated if omitted), `name`, `label`, `accessibleLabel` for fields without visible labels, `hint`, `unit`, `fullWidth`, `attrs`, `messages`, `patternHint`, `onChange`, `onClick` (receives `{control,event}`).

- `input`: text, password, email (including `multiple`), tel, url, search, number, range, date, time, datetime-local, month, week, checkbox, radio, file, color, hidden, submit, image, reset, button.
- `textarea`: `kind:'textarea'`; rows, cols, maxlength and default value via `attrs`.
- `select`: data options `{value,label,selected,disabled}` or `{label,disabled,options:[...]}` for optgroups. `value` may initialize a single value or an array. `attrs.multiple/size` retain a native listbox. Single selects share one divided-row renderer and one event/keyboard implementation. The underlying native select remains the form value source.
- `checkbox-group` / `radio-group`: one `name`, `label` as legend, `options` with label/value/checked/disabled, `required` and optional required message. Checkboxes require at least one enabled option, not every option. `disabled:true` disables the entire fieldset.
- `suggestions`: datalist strings or `{value,label}`. Free text remains permitted. Only the input is submitted.
- `switch:true` on a checkbox gives the existing switch presentation while retaining native checkbox semantics.
- `quantity:true` on a number input adds min/max/step-aware decrement/increment controls.
- `actions`: details/summary commands using `options:[{label,type,value,onClick}]` and `onAction`. Commands do not select or submit a field value unless explicitly given a submit type/name. Errors may be assigned using `field.setError(message)`.

`attrs` forwards name, value, required, disabled, readonly, placeholder, minlength, maxlength, min, max, step, pattern, autocomplete, form, accept, multiple, checked, rows, cols, size, src, alt, inputmode, title, spellcheck, capture, dirname, form submit overrides and ARIA attributes. Browser applicability rules still apply (for example readonly has no effect on checkboxes). Use boolean values for boolean attributes.

## Behaviour

- Standard `FormData` controls inclusion: disabled excluded; readonly/hidden included; unchecked checks omitted; multi-values repeat the key; files remain File objects. `formData(submitter)` includes the chosen submit action. Image submit adds `.x/.y` coordinates of the click.
- Submit is intercepted with `novalidate`; field messages replace native browser popups. `onSubmit` runs only when registered fields are valid, unless the chosen submitter has `formnovalidate`. No request happens automatically. Native `form.submit()` bypasses submit events; use a submit button or `requestSubmit()`.
- Validation uses `ValidityState`; required, format, range, step, lengths and custom validity stay native. Custom messages can override required, typeMismatch, min, max, step, minlength, maxlength, pattern or customError. After a validation attempt, input/change updates affected errors.
- Error text is adjacent to the label on the top border, or alone on that border for an unlabelled field; ARIA invalid/describedby refer to the same message. Group errors cover all group controls. No grey error fill and no native tooltip.
- `attrs.form` supports externally associated fields. Use `form.attachField(externalField)` to include their custom validation/reset lifecycle, as well as native FormData. The Form takes ownership of attached fields for destruction. Arbitrary foreign controls are not silently enrolled in custom validation.
- Native reset restores value/defaultSelected/defaultChecked and clears errors, select state and action menus. Never call `field.reset()` to reset native values: it resets the field UI after a native form reset.
- Select keyboard: arrows, Home/End, typeahead, Enter/Space, Escape, Tab; disabled options/groups skipped; outside pointer/focus dismisses. Focus stays on the combobox and active descendant exposes navigation.
- Two-column compact grid becomes one column below 560px **of available form width**, including when the sidebar grows. Fields and option text share `--ds-form-control-font-size`. Dates, time, file pickers, color, native multi-select and datalist retain platform UI; visual details vary by browser. File accept is a picker hint, not server validation. Month/week pickers may fall back to text in browsers without native support.

## Styling and exporting

Public overrides: `--ds-form-field-height`, `--ds-form-field-radius`, `--ds-form-control-font-size`, `--ds-form-surface`, `--ds-form-error`. Semantic colours and `--ds-font-family` come from Foundations; Light/Dark/Matrix work without importing their tools.

`manifest.json` enumerates all runtime files and dependencies. Complete Form export has four local files plus the two shared foundation files, deduplicated with other components. A standalone field needs field.js, validation.js and form.css plus foundations. `tool.js` and examples are excluded.

## Verification

`node --test tests/validation.test.cjs` checks message mapping and group rules. Open `tests/browser.html` through your local development server to run real native DOM/FormData tests: all input types, option groups, keyboard selection, disabled/readonly/hidden semantics, multi-selection, files, image coordinates, submitters, form association, reset, errors, lifecycle. These are separate from the tiny DOM fixture used by other components.
