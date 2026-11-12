# Shortcuts

One catalogue, one binding per action and one document keyboard dispatcher.
Components register actions; their configuration references the action's ID,
never a separate copy of the combination. Navigation registers `navigation.search`
with default **Cmd+F / Ctrl+F** (`Mod+F`), and `navigation.toggleSidebar` with
**Cmd+B / Ctrl+B** (`Mod+B`). Both are editable in Navigation or this catalogue.

## Runtime

Load `shortcuts.js` before components using it. It has no Form, Palette or npm
dependencies. `create({ document })` returns the same catalogue for that document,
so components and editors automatically share one dispatcher. Creating without a
document provides an isolated, non-dispatching catalogue for tests or other hosts.

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
`bindings()` returns only user overrides for host persistence, not copies of
registration defaults. This lets reset and later HTML default changes work
without accidentally turning defaults into saved user preferences.
Preferences can be configured before actions register and survive component
unregistration/re-registration within the document. `setDefault(id, value)`
updates a declared default without overriding a user preference; `reset(id)`
removes that preference and uses the current default. Components use this for
live changes to their shortcut attributes.

Unregister actions when unmounting. The dispatcher attaches when the first action
registers and detaches when the last unregisters. Only the document owner should
call catalogue `destroy()` to dispose the shared service; destroying a component
or editor must not destroy other components' actions.
If bindings coincide, the first enabled handler returning true wins.

`Mod` accepts either Cmd or Ctrl. Alt/Shift combinations with letters/digits are
supported. `normalise`, `fromEvent`, `format` and `aria` are shared helpers.
Already handled events, IME and AltGraph are ignored. Native browser behavior
remains available when no action confirms success, including disabled menu search.

## Required declarative component shortcuts

Every component with configurable keyboard shortcuts must also expose `data-*`
attributes on its root element so applications can declare bindings in HTML,
without JavaScript setup. These attributes supply defaults when the component
registers its actions with the shared Shortcuts catalogue. Saved user preferences
managed through Shortcuts take precedence over those defaults.

For Navigation, the required attributes are:

| Attribute | Registered action | Default when omitted |
| --- | --- | --- |
| `data-search-shortcut` | `navigation.search` | `Mod+F` |
| `data-collapse-shortcut` | `navigation.toggleSidebar` | `Mod+B` |

For example, `data-search-shortcut="Mod+K"` declares a different default for menu
search. Navigation observes changes to these attributes and forwards them through
`setDefault`; an empty attribute declares no default binding. See
[Navigation configuration](../navigation/README.md#shared-keyboard-shortcuts).

Components register handlers and action availability, but must not add separate
shortcut dispatchers or duplicate binding state. Disabling a feature disables
its action without discarding the user's binding. Components unregister actions
when destroyed. The shared catalogue and dispatcher must work even when the
Shortcuts editor is not displayed.

## Recorder component

Shortcuts is itself the recorder/editor, not a configurator of another component.
For HTML-first export use `shortcuts.html` and [UI](../../README.md). The client
adopts the server-rendered recorder rows. The caller handles `ui:shortcut` and
persists `ui:change` if needed; no theme/storage dependency is included.

Classic workspace usage: `DesignSystemShortcuts.mount(host, {shortcuts})`, with
`shortcuts.css`. The catalogue is optional and defaults to the shared document
catalogue. The editor adopts existing server-rendered rows and adds rows for
registered component actions, regardless of registration order. It displays
recording and Reset, and updates when components register or unregister.
Server-rendered rows with only `data-shortcut-id` reference component actions;
adding `data-shortcut` explicitly declares an application action handled through
the exported `ui:shortcut` event.
The exported client uses that same catalogue rather than a private dispatcher;
removing the editor leaves Navigation and its shortcuts operational.
Backspace/Delete disables a binding; recording never invokes its action.

Run `node --test tests/*.test.cjs`.
