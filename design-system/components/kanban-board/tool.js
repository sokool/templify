/* Saved authoring preferences only. No randomisation or storage in the board runtime. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemKanbanBoardTool = api;
})(globalThis, function (root) {
  'use strict';

  function mount(
    host,
    { themes, settings, getItems, random = Math.random, Button = root.DesignSystemButtons } = {},
  ) {
    const document = host.ownerDocument;
    const assignments = new Map();
    const bindings = new Set();
    const token = '--ds-card-accent';
    const categories = ['brand', 'accent', 'greys'];
    const saved = settings?.get('borders', []);
    if (Array.isArray(saved)) {
      for (const entry of saved) {
        if (typeof entry?.theme !== 'string' || !Array.isArray(entry.cards)) continue;
        const cards = new Map();
        for (const card of entry.cards) {
          const reference = card?.colour;
          if (
            typeof card?.id === 'string' &&
            categories.includes(reference?.category) &&
            typeof reference?.id === 'string' &&
            /^[a-z][a-z0-9-]*$/.test(reference.id)
          )
            cards.set(card.id, { category: reference.category, id: reference.id });
        }
        if (cards.size) assignments.set(entry.theme, cards);
      }
    }
    host.classList.add('kanban-board-tool');
    host.classList.add('ds-tool');
    const actions = document.createElement('div');
    actions.className = 'kanban-board-tool-actions';
    const note = document.createElement('p');
    note.setAttribute('role', 'status');
    host.append(actions, note);

    function palette(state) {
      return categories.flatMap((category) =>
        state.colours[state.theme][category].map(({ id }) => ({ category, id })),
      );
    }

    function colour(id, state) {
      const reference = assignments.get(state.theme)?.get(id);
      if (
        !reference ||
        !state.colours[state.theme][reference.category].some((item) => item.id === reference.id)
      )
        return '';
      return `var(--ds-palette-${reference.category}-${reference.id})`;
    }

    function sync() {
      const state = themes.getState();
      bindings.forEach((binding) => binding.update(state));
      const count = getItems().filter((item) => colour(item.id, state)).length;
      randomButton.update({ disabled: palette(state).length === 0 });
      resetButton.update({ disabled: !assignments.has(state.theme) });
      const description = count
        ? `${count} card borders randomised from the active Palette.`
        : 'Uses the shared Card border. Randomise the outline and lower edge per card.';
      note.textContent = description + (settings
        ? ' Saved per theme · Tool setting only.'
        : ' Tool preview only.');
    }

    function persist() {
      settings?.set('borders', Array.from(assignments, ([theme, cards]) => ({
        theme,
        cards: Array.from(cards, ([id, colour]) => ({ id, colour })),
      })));
    }

    function randomise() {
      const state = themes.getState();
      const choices = palette(state);
      if (!choices.length) return false;
      assignments.set(
        state.theme,
        new Map(getItems().map(({ id }) => [id, choices[Math.floor(random() * choices.length)]])),
      );
      persist();
      sync();
      return true;
    }

    function reset() {
      assignments.delete(themes.getState().theme);
      persist();
      sync();
    }

    const randomButton = Button.mount(actions, {
      label: 'Randomise card borders',
      variant: 'secondary',
      onClick: randomise,
    });
    const resetButton = Button.mount(actions, {
      label: 'Reset borders',
      variant: 'ghost',
      onClick: reset,
    });

    function bind(element, id) {
      const previous = element.style.getPropertyValue(token);
      function restore() {
        if (previous) element.style.setProperty(token, previous);
        else element.style.removeProperty(token);
      }
      const binding = {
        update(state) {
          const value = colour(id, state);
          if (value) element.style.setProperty(token, value);
          else restore();
        },
        destroy() {
          bindings.delete(binding);
          restore();
        },
      };
      bindings.add(binding);
      binding.update(themes.getState());
      return { destroy: binding.destroy };
    }

    sync();
    const unsubscribe = themes.subscribe(sync);
    return {
      bind,
      randomise,
      reset,
      destroy() {
        unsubscribe();
        bindings.forEach((binding) => binding.destroy());
        assignments.clear();
        randomButton.destroy();
        resetButton.destroy();
        host.replaceChildren();
        host.classList.remove('kanban-board-tool');
        host.classList.remove('ds-tool');
      },
    };
  }

  return Object.freeze({ mount });
});
