# Kanban board

Generic columns, card placement, responsive horizontal navigation and drag/reorder behaviour. No business/domain terminology, sample data, persistence, router or configurator inside the runtime.

## Explicit dependencies

Export `model.js`, `kanban-board.js`, `kanban-board.css`, and the shared `foundations/tokens.css` + `primitives.css` once. Load `model.js` before `kanban-board.js`. No packages or direct component imports are required.

The renderer is injected. The example composes **Card + Kanban board**; exporting that composition also includes Card's own two files. Foundations are deduplicated. The board can use a different renderer with the same contract.

```js
const board = DesignSystemKanbanBoard.mount(container, {
  columns: [{id:'new',label:'New'}, {id:'done',label:'Done'}],
  items: [{id:'sample',columnId:'new',title:'A card'}],
  renderItem(item, context) {
    const element = document.createElement('article');
    return DesignSystemCard.mount(element, {...item, ...context});
  },
  onMove({id, fromColumnId, columnId, beforeId, items}) {
    // Save in the host application if wanted.
  },
  onActivate(item) { /* host opens details */ }
});
```

`columns` and `items` have stable unique IDs. Items carry opaque caller data; only `id` and `columnId` are required. Items are cloned at the boundary. Duplicate IDs and references to unknown columns throw. Array order determines order within each column.

`renderItem(item, context)` returns `{element,destroy?,update?,focus?,canDrag?,closeMenu?}`. Context contains `device`, `descriptionId`, `onActivate`, `move(columnId,beforeId?)`, and action data for details, moving to another column, moving up/down and arming a drag. Renderer lifecycle is destroyed/recreated on structural updates; mount no persistent application state inside it. `update({device})` handles device changes without rebuilding the board.

## Public API

- `getState()` returns cloned columns/items.
- `move(id,columnId,beforeId=null)` moves/reorders and calls `onMove`; invalid targets return false.
- `setFilter(predicate|null)` filters the rendered subset; it does not delete hidden items.
- `setDevice('auto'|'desktop'|'tablet'|'mobile')` selects preview mode. Actual small viewport width still applies.
- `scrollPage(-1|1)` moves one column, or a group of three on tablet.
- `update({columns?,items?,...options})` replaces data/options.
- `destroy()` cancels gestures, observers, animation frames, timers, menus and listeners.

Optional `toolbar: Node` is a composition slot. Its search/add controls belong to the host, not to Kanban board. `viewport: Element` supplies preview width; otherwise the mount width determines breakpoints. `viewportTop: () => number` identifies an occluding sticky header for centering edge indicators. Labels can be supplied with `label` and `emptyLabel`.

## Device behaviour preserved

| Mode | Horizontal navigation | Card movement |
| --- | --- | --- |
| Desktop (>1024px preview) | Continuous hover edges, 5% sensitive width. Matching flat indicators at 50% of visible card area. White arrows, 750ms fade. No top scroll track. | Mouse movement threshold 6px; dragged preview anchors at original grab point. Alt + arrow keys and card actions. |
| Tablet (621–1024px) | Three columns fitted to available board width; native touch scroll snaps in groups of three. Final page ends at final column. No edge overlays. | Stationary 450ms hold, smooth 320ms pickup, no rotation or handover jump. |
| Mobile (≤620px) | One centered column, 20px side space to suggest adjacent columns; native swipe and centered snap. No edge overlays. | Same touch pickup; normal pan before the hold cancels pickup. |

The ghost copies rendered source styles and dimensions, keeps the pointer grab point as transform origin, and clips to the card's box. Escape, pointer cancellation, lost capture, resize and teardown cancel safely. Drop markers and column counts follow the same model as keyboard/menu movement. Reduced-motion preference removes pickup/fade animation.

Column and scroll colours use shared semantic tokens (`--ds-colour-lane`, `--ds-colour-lane-header`, `--ds-colour-scroll-indicator`, `--ds-colour-scroll-border`), configurable with the example's Palette tool. Card owns its own content appearance.

## Examples and tooling boundary

`examples/kanban.js` composes both modules and owns filtering, multi-selection chips, add/details dialogs and storage. `examples/kanban-data.js` supplies the 19 sample cards. These files are not exported with either component. That example toolbar is an integration harness, not an extracted Autocomplete/Form component; migration of those controls remains separate.

`tool.js` / `tool.css` provide preview-only **Randomise card borders** and **Reset borders** controls, excluded from runtime exports. The host injects `themes`, `getItems()` and an optional tool-only `settings` scope into `DesignSystemKanbanBoardTool.mount`, then binds each rendered Card with `bind(element, item.id)` and destroys that binding with the renderer. Randomisation covers every item, including filtered-out cards, using Brand/Accent/Greys references from the active Palette. Colours stay with IDs across movement, filtering and renderer recreation; theme edits update through CSS variables, while deleted references fall back to the shared Card border.

The example saves the latest assignments per theme at `preview.kanban-board.borders` in the shared workspace settings. They restore after page navigation and reload, but belong only to the tool: no Kanban/Card component settings or runtime persistence are introduced. They are excluded from template/token/CSS exports; full workspace backups retain them. Reset restores Card's shared outline/lower edge and saves that reset for the active theme, without clearing other themes. Without an injected settings scope the tool works in memory.

## Verification

Node tests cover model validation, immutable reorder, responsive sizing, filtering, renderer cleanup, keyboard movement, pointer anchor/ghost size, touch hold/cancel and export boundaries. Browser checks exercise the composed page, action menu, details, actual mouse drag/drop, keyboard movement, filtering, tablet three-column geometry and mobile column/snap/hidden-edge geometry. Physical finger swipes and pickup on real tablet/phone hardware still require a device check; DOM tests are not a substitute for that.

[Open composition](../../examples/index.html#topschrank.components.kanbanboard).
