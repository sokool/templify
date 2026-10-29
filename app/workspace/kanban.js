/* Composition only: generic example data, filter UI, persistence and dialogs.
   Card and Kanban board are connected here, not inside either runtime module. */
(function (root) {
  'use strict';
  function mount(
    element,
    {
      document: doc,
      viewport,
      getDevice,
      subscribeDevice,
      viewportTop,
      storage,
      icons,
      cardTool,
      themes,
      borderToolSettings,
      standalone = false,
    },
  ) {
    const disposables = [],
      key = 'design-system-examples-kanban-v1';
    const make = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    let board,
      borderTool,
      current = ExampleKanbanData.items.map((item) => ({ ...item }));
    try {
      const saved = JSON.parse(storage?.getItem(key) || 'null');
      if (Array.isArray(saved)) {
        const byId = new Map(current.map((item) => [item.id, item]));
        const seen = new Set(),
          restored = [];
        for (const entry of saved) {
          if (
            byId.has(entry.id) &&
            !seen.has(entry.id) &&
            ExampleKanbanData.columns.some((c) => c.id === entry.columnId)
          ) {
            restored.push({ ...byId.get(entry.id), columnId: entry.columnId });
            seen.add(entry.id);
          }
        }
        current = restored.concat(current.filter((item) => !seen.has(item.id)));
      }
    } catch {}
    const status = make('p', 'example-status');
    status.setAttribute('role', 'status');
    const dialog = make('dialog', 'example-kanban-dialog');
    doc.body.append(dialog);
    function closeDialog() {
      dialog.close();
      dialog.replaceChildren();
    }
    function openDetails(item) {
      dialog.replaceChildren();
      const close = make('button', 'example-state-button', 'Close');
      close.type = 'button';
      close.addEventListener('click', closeDialog);
      dialog.append(
        make('h2', '', item.title),
        make('p', '', item.subtitle),
        make('p', '', item.description),
        make('p', '', item.metaLeft + ' · ' + item.metaRight),
        make('p', '', item.footer),
        close,
      );
      dialog.showModal();
    }
    function mountCard(host, options) {
      let menuEnabled = cardTool?.getState().menuEnabled ?? true;
      const card = DesignSystemCard.mount(host, { ...options, menuEnabled });
      const borderBinding = borderTool?.bind(host, options.id);
      const unsubscribe = cardTool?.subscribe((settings) => {
        if (settings.menuEnabled === menuEnabled) return;
        menuEnabled = settings.menuEnabled;
        card.update({ menuEnabled });
      });
      return {
        ...card,
        destroy() {
          unsubscribe?.();
          borderBinding?.destroy();
          card.destroy();
        },
      };
    }
    if (standalone) {
      const configurationSection = make('section', 'card-tool-section');
      const configurationHeader = make('header');
      const configurationTitle = make('h2', '', 'Configuration');
      configurationTitle.id = 'card-configuration-title';
      configurationHeader.append(
        configurationTitle,
        make('p', '', 'Theme colours, shadows, menu and square preview size. Saved per theme.'),
      );
      const editor = make('div');
      configurationSection.setAttribute('aria-labelledby', configurationTitle.id);
      configurationSection.append(configurationHeader, editor);

      const previewSection = make('section', 'card-preview-section');
      const previewHeader = make('header');
      const previewTitle = make('h2', '', 'Preview');
      previewTitle.id = 'card-preview-title';
      previewHeader.append(
        previewTitle,
        make('p', '', 'Shared font and theme styles. Hover or focus the card to compare shadows.'),
      );
      previewSection.setAttribute('aria-labelledby', previewTitle.id);
      const stage = make('div', 'card-tool-stage');
      const preview = make('div', 'card-tool-preview');
      const host = make('article');
      preview.append(host);
      stage.append(preview);
      previewSection.append(previewHeader, stage);
      element.append(configurationSection, previewSection, status);
      const item = current[0];
      const card = mountCard(host, {
        ...item,
        device: getDevice(),
        onActivate: () => openDetails(item),
        actions: [
          { id: 'details', label: 'View details', onSelect: () => openDetails(item) },
          {
            id: 'copy',
            label: 'Copy reference',
            onSelect: () => {
              doc.defaultView.navigator.clipboard
                ?.writeText(item.metaLeft)
                .then(() => (status.textContent = 'Reference copied.'))
                .catch(() => (status.textContent = 'Copy is unavailable in this browser.'));
            },
          },
        ],
      });
      disposables.push(card, cardTool.mount(editor, { preview }));
      const off = subscribeDevice((device) => card.update({ device }));
      return {
        destroy() {
          off();
          disposables.forEach((view) => view.destroy());
          dialog.remove();
          element.replaceChildren();
        },
      };
    }
    element.append(
      make(
        'p',
        'example-lead',
        'Drag to move or reorder. On touch screens, hold a card to pick it up; swipe to change columns. Keyboard: Alt + arrow keys.',
      ),
    );
    const borderControls = make('div');
    element.append(borderControls);
    borderTool = DesignSystemKanbanBoardTool.mount(borderControls, {
      themes,
      settings: borderToolSettings,
      getItems: () => current,
    });
    const toolbar = make('div', 'example-kanban-toolbar'),
      add = make('button', 'example-kanban-add');
    add.type = 'button';
    add.innerHTML = icons.svg('file-plus');
    add.setAttribute('aria-label', 'Add a card');
    add.dataset.tooltip = 'Add a card';
    const search = make('div', 'example-kanban-search');
    const results = make('span', 'example-kanban-results');
    results.setAttribute('role', 'status');
    toolbar.append(add, search, results);
    let selected = [];
    const searchable = (item) =>
      [
        item.title,
        item.subtitle,
        item.metaLeft,
        ExampleKanbanData.columns.find((c) => c.id === item.columnId)?.label,
      ]
        .join(' ')
        .toLowerCase();
    const suggestionItems = () =>
      current.map((item) => ({
        id: item.id,
        label: item.title,
        detail: [item.metaLeft, item.subtitle].filter(Boolean).join(' · '),
        group: ExampleKanbanData.columns.find((c) => c.id === item.columnId)?.label,
        icon: 'file-text',
      }));
    const autocomplete = DesignSystemAutocomplete.mount(search, {
      label: 'Search cards',
      placeholder: 'Title, reference, location or column…',
      size: 'small',
      multiple: true,
      limit: 12,
      items: suggestionItems(),
      renderIcon: (name) => icons.svg(name),
      onChange(value) {
        selected = value;
        applyFilter();
      },
      onQuery() {
        applyFilter();
      },
    });
    const field = autocomplete.input;
    function applyFilter() {
      const query = autocomplete.getQuery().trim().toLowerCase();
      const predicate = (item) =>
        (!selected.length || selected.includes(item.id)) &&
        (!query || searchable(item).includes(query));
      board?.setFilter(predicate);
      results.textContent = 'Results: ' + current.filter(predicate).length + ' / ' + current.length;
    }
    function openAdd() {
      dialog.replaceChildren();
      const form = make('form'),
        title = make('input'),
        description = make('textarea');
      title.placeholder = 'Card title';
      title.required = true;
      title.setAttribute('aria-label', 'Card title');
      description.placeholder = 'Description';
      description.setAttribute('aria-label', 'Description');
      const save = make('button', 'example-state-button', 'Add card'),
        cancel = make('button', 'example-state-button', 'Cancel');
      save.type = 'submit';
      cancel.type = 'button';
      cancel.addEventListener('click', closeDialog);
      form.append(make('h2', '', 'Add a card'), title, description, save, cancel);
      dialog.append(form);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!title.value.trim()) return;
        const item = {
          id: 'card-' + Date.now(),
          columnId: ExampleKanbanData.columns[0].id,
          title: title.value.trim(),
          description: description.value,
          metaLeft: 'No reference',
          metaRight: '—',
          footer: 'No due date',
          footerMuted: true,
        };
        current = [...current, item];
        selected = [];
        autocomplete.update({ items: suggestionItems(), value: [] });
        autocomplete.setQuery('');
        board.update({ items: current });
        applyFilter();
        closeDialog();
        status.textContent = 'Card added for this session. Reload to restore sample content.';
      });
      dialog.showModal();
    }
    add.addEventListener('click', openAdd);
    const host = make('div');
    element.append(host, status);
    board = DesignSystemKanbanBoard.mount(host, {
      columns: ExampleKanbanData.columns,
      items: current,
      device: getDevice(),
      viewport,
      viewportTop,
      toolbar,
      renderItem(item, context) {
        return mountCard(make('article'), { ...item, ...context });
      },
      onActivate: openDetails,
      onMove({ items }) {
        current = items;
        autocomplete.update({ items: suggestionItems() });
        try {
          storage?.setItem(
            key,
            JSON.stringify(items.map(({ id, columnId }) => ({ id, columnId }))),
          );
        } catch {}
        const query = field.value.trim().toLowerCase();
        results.textContent =
          'Results: ' +
          current.filter(
            (item) =>
              (!selected.length || selected.includes(item.id)) &&
              (!query || searchable(item).includes(query)),
          ).length +
          ' / ' +
          current.length;
      },
    });
    results.textContent = 'Results: ' + current.length + ' / ' + current.length;
    const off = subscribeDevice((device) => board.setDevice(device));
    const usage = make('section', 'example-card kanban-used-components');
    const usageTitle = make('h2', '', 'Used components');
    usageTitle.id = 'kanban-used-components-title';
    usage.setAttribute('aria-labelledby', usageTitle.id);
    const componentList = make('ul');
    for (const [label, anchor, description] of [
      ['Card', 'card', 'Injected renderer for board items, including content, metadata and action menus.'],
      ['Autocomplete', 'autocomplete', 'Card search, filtering and multiple selection in the host toolbar.'],
      ['Form', 'forms', 'Fields and validation used indirectly by Autocomplete.'],
      ['Buttons', 'buttons', 'Randomise card borders and Reset borders controls in the configurator.'],
    ]) {
      const item = make('li');
      const link = make('a', 'example-link', label);
      link.setAttribute('href', '#topschrank.components.' + anchor);
      item.append(link, make('span', '', ' — ' + description));
      componentList.append(item);
    }
    usage.append(
      usageTitle,
      make('p', '', 'The board runtime has no direct component dependencies. These components are composed by this page or its configurator; Card is supplied through renderItem and can be replaced.'),
      componentList,
    );
    element.append(usage);
    return {
      destroy() {
        off();
        autocomplete.destroy();
        board.destroy();
        borderTool.destroy();
        dialog.remove();
        element.replaceChildren();
      },
    };
  }
  root.ExampleKanban = Object.freeze({ mount });
})(globalThis);
