# Shortcuts

One catalogue, one binding per action and one document keyboard dispatcher.
Components register actions; their configuration references the action's ID,
never a separate copy of the combination. Navigation registers `navigation.search`
with default **Cmd+F / Ctrl+F** (`Mod+F`), and `navigation.toggleSidebar` with
**Cmd+B / Ctrl+B** (`Mod+B`). Both are editable in Navigation or this catalogue.

## Runtime

Load `shortcuts.js` before components using it. It has no Form, Palette or npm
dependencies. Share one instance across the application:

```js
const shortcuts = DesignSystemShortcuts.create({ document });
const navigation = DesignSystemNavigation.mount(root, { shortcuts, viewport });

const unregister = shortcuts.register({
  id: 'editor.save',
  group: 'Editor',
  label: 'Save',
  defaultShortcut: 'Mod+S',
  enabled: () => editor.ready,
  handler: () => editor.save(), // Return true only when handled successfully.
});
shortcuts.set('editor.save', 'Mod+Shift+S');
shortcuts.set('editor.save', null); // Disable binding, retain catalogue entry.
shortcuts.reset('editor.save');
```

`get(id)` and `list()` return snapshots; `subscribe(listener)` returns an
unsubscribe function. `configure(bindings)` replaces effective preferences,
falling back to each registered action's default when missing or invalid.
Unregister actions when unmounting; call `destroy()` to detach the dispatcher.
If bindings coincide, the first enabled handler returning true wins.

`Mod` accepts either Cmd or Ctrl. Alt/Shift combinations with letters/digits are
supported. `normalise`, `fromEvent`, `format` and `aria` are shared helpers.
Already handled events, IME and AltGraph are ignored. Native browser behavior
remains available when no action confirms success, including disabled menu search.

## Recorder component

Shortcuts is itself the recorder/editor, not a configurator of another component.
For HTML-first export use `shortcuts.html` and [UI](../../README.md). The client
adopts the server-rendered recorder rows. The caller handles `ui:shortcut` and
persists `ui:change` if needed; no theme/storage dependency is included.

Classic workspace usage: `DesignSystemShortcuts.mount(host, {shortcuts})`, with
`shortcuts.css`. It displays the supplied catalogue with recording and Reset.
Backspace/Delete disables a binding; recording never invokes its action.

Run `node --test tests/*.test.cjs`.
