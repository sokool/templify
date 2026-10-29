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

## Configuration

Load Form Field/validation, Buttons, Themes, `configurator/configurator.js`, `configurator/configurator.css` and
`../../tools/shared/tools.css`. The tool uses compact **Form** fields, not custom inputs.

```js
const tool = DesignSystemShortcutsTool.create({ themes, shortcuts });
const catalogue = tool.mount(host); // All registered actions, per-action Reset.
const reference = tool.mountField(configurationHost, 'navigation.search', {
  label: 'Search shortcut',
});
```

Both fields edit exactly the same runtime binding. Focus and press a combination;
Backspace/Delete disables it, Escape clears a validation error, Reset restores the
action's default. Recording never invokes the action. Each mounted view has
`destroy()`; the adapter's `destroy()` detaches theme/persistence subscriptions.

Preferences live in the selected Palette theme under
`$extensions["org.topschrank.components"].shortcuts.bindings`. Theme switching,
copying, token import/export and reload retain the same scope. Unregistered IDs
are preserved in storage for components loaded later.

The workspace supplies a migration from `navigation.searchShortcut` to
`shortcuts.bindings["navigation.search"]` for every palette. This preserves explicit
`null`, gives existing central preferences precedence, and removes only the old
shortcut property, keeping Navigation's other settings. Resetting Navigation
resets this same binding, not a second copy.

Run `node --test tests/*.test.cjs`.
