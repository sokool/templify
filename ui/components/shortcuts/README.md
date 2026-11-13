# Shortcuts

One catalogue, one binding per action and one document keyboard dispatcher.
Components register actions; their configuration references the action's ID,
never a separate copy of the combination. Navigation registers `navigation.search`
with default **Cmd+K / Ctrl+K** (`Mod+K`), and `navigation.toggleSidebar` with
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

`Mod` accepts either Cmd or Ctrl; `Cmd`, `Command`, `Meta`, `Ctrl` and `Control`
are aliases, not independent bindings. Any combination of Mod, Alt and Shift
with a letter/digit is supported, including `Shift+K`. Two or more modifiers
also work without a character: `Mod+Shift`, `Mod+Alt`, `Alt+Shift` and
`Mod+Alt+Shift`. A single modifier or an unmodified character is not a binding.
Modifier-only shortcuts run once on the first release, only if no other key
was pressed, so `Mod+Shift+K` never also triggers `Mod+Shift`. Release all
modifiers before starting the next combination; window blur cancels a sequence.
`normalise`, `fromEvent`, `format` and `aria` are shared helpers.
Already handled events, IME and AltGraph are ignored. Native browser behavior
remains available when no action confirms success, including disabled menu search.

## Required declarative component shortcuts

Every component with configurable keyboard shortcuts must also expose `data-*`
attributes on its root element so applications can declare bindings in HTML,
without JavaScript setup. These attributes supply defaults when the component
registers its actions with the shared Shortcuts catalogue. Saved user preferences
managed through Shortcuts take precedence over those defaults.

Component shortcut attributes include:

| Attribute | Registered action | Default when omitted |
| --- | --- | --- |
| `data-search-shortcut` (Navigation) | `navigation.search` | `Mod+K` |
| `data-collapse-shortcut` (Navigation) | `navigation.toggleSidebar` | `Mod+B` |
| `data-theme-shortcut` (Theme switcher) | `theme-switcher.nextTheme` | `Mod+Shift+L` |

For example, `data-search-shortcut="Mod+J"` declares a different default for menu
search. Navigation observes changes to these attributes and forwards them through
`setDefault`; an empty attribute declares no default binding. See
[Navigation configuration](../navigation/README.md#shared-keyboard-shortcuts).

Components register handlers and action availability, but must not add separate
shortcut dispatchers or duplicate binding state. Disabling a feature disables
its action without discarding the user's binding. Components unregister actions
when destroyed. The shared catalogue and dispatcher must work even when the
Shortcuts editor is not displayed.

## Searchable component actions

Components can expose commands in [Search](../search/README.md) by opting into the
same catalogue. Do not register a second handler or binding map for the palette:

```js
const unregister = shortcuts.register({
  id: 'editor.create', label: 'Create document', group: 'Editor',
  description: 'Start a new draft', keywords: ['new', 'write', 'draft'],
  icon: 'file-plus', // Optional symbolic name; image may supply an image URL.
  searchable: true,
  defaultShortcut: null, // Discoverable even without a keyboard binding.
  enabled: () => editor.canCreate(),
  handler: () => editor.create() === true,
});
// Component destruction:
unregister();
```

`get()`/`list()` include this metadata and current `enabled` availability.
`execute(id, event = {})` rechecks availability and invokes the same handler,
returning true only on confirmed success. It neither fabricates keyboard events
nor prevents browser defaults. `searchable` defaults to false; commands are not
inferred from arbitrary page buttons.

A `null` binding removes only keyboard activation. The command remains usable in
Search. `enabled()` disables both entry points without discarding preferences.
Search hides unavailable actions and rechecks them when activated. Components
unregister actions when destroyed.

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
Pass `actionIds: ['theme-switcher.nextTheme']` to `mount()` to show only selected
actions while still editing the same shared catalogue.
Server-rendered rows with only `data-shortcut-id` reference component actions;
adding `data-shortcut` explicitly declares an application action handled through
the exported `ui:shortcut` event.
The exported client uses that same catalogue rather than a private dispatcher;
removing the editor leaves Navigation and its shortcuts operational.
Backspace/Delete disables a binding; recording never invokes its action.
To record a modifier-only shortcut, press its modifiers together and release.
The editor saves the complete combination on the first release, not intermediate
combinations while keys are being pressed. Leaving the input cancels a pending
modifier sequence.

Run `node --test tests/*.test.cjs`.
