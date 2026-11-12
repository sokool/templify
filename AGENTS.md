# Project rules

## Component HTML documentation

- Write documentation comments in component HTML in English, including descriptions copied into exports.
- Every exportable template (`ui/components/<name>/<name>.html`) must start with a comment containing these sections, in order: `Component`, `Purpose`, `Elements`, `JavaScript behavior`.
- Describe the component's actual behavior. Preserve API names, HTML attributes and identifiers when translating documentation.
- Keep descriptions in the source templates; exporters copy them without translating or generating separate descriptions.

## Component keyboard shortcuts

- Configurable component keyboard shortcuts must also be declarable through `data-*` attributes on the component's root element, without application-side JavaScript setup.
- Components register stable action IDs, default bindings and handlers with the shared Shortcuts catalogue. Shortcuts owns binding management and keyboard dispatch; components must not implement separate shortcut dispatchers or duplicate binding state.
- Shortcut attributes supply registration defaults. Saved user preferences managed through Shortcuts take precedence. For Navigation, use `data-search-shortcut` for `navigation.search` (default `Mod+F`) and `data-collapse-shortcut` for `navigation.toggleSidebar` (default `Mod+B`).
- Disabling a component feature must also disable its shortcut action without discarding the user's binding. Components unregister their actions when destroyed.
