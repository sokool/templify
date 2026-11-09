/* Composition only: generic example data, persistence and dialogs.
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
      windows,
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
      return DesignSystemCard.mount(host, options);
    }
    if (standalone) {
      const previewSection = make('section', 'card-preview-section');
      const previewHeader = make('header');
      const previewTitle = make('h2', '', 'Preview');
      previewTitle.id = 'card-preview-title';
      previewHeader.append(
        previewTitle,
        make('p', '', 'Shared font and theme styles. Hover or focus the card to compare shadows.'),
      );
      previewSection.setAttribute('aria-labelledby', previewTitle.id);
      const stage = make('div', 'example-card-stage');
      const preview = make('div', 'example-card-preview');
      preview.style.maxWidth = '360px';
      const host = make('article');
      preview.append(host);
      stage.append(preview);
      previewSection.append(previewHeader, stage);
      element.append(previewSection, status);
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
      disposables.push(card);
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
    const host = make('div');
    element.append(host, status);
    board = DesignSystemKanbanBoard.mount(host, {
      columns: ExampleKanbanData.columns,
      items: current,
      device: getDevice(),
      viewport,
      viewportTop,
      renderItem(item, context) {
        return mountCard(make('article'), { ...item, ...context });
      },
      onActivate: openDetails,
      onMove({ items }) {
        current = items;
        try {
          storage?.setItem(
            key,
            JSON.stringify(items.map(({ id, columnId }) => ({ id, columnId }))),
          );
        } catch {}
      },
    });
    const off = subscribeDevice((device) => board.setDevice(device));
    const usage = make('div', 'kanban-used-components');
    const componentList = make('ul');
    for (const [label, anchor, description] of [
      ['Card', 'card', 'Injected renderer for board items, including content, metadata and action menus.'],
      ['Buttons', 'buttons', 'The Used components edge tab.'],
      ['Window', 'window', 'The right sidebar displaying this list; composed by the host, not the board runtime.'],
    ]) {
      const item = make('li');
      const link = make('a', 'example-link', label);
      link.setAttribute('href', '#topschrank.components.' + anchor);
      item.append(link, make('span', '', ' — ' + description));
      componentList.append(item);
    }
    usage.append(
      make('p', '', 'The board runtime has no direct component dependencies. These components are composed by this page; Card is supplied through renderItem and can be replaced.'),
      componentList,
    );
    // Host chrome is portalled outside the preview so its edge follows the real
    // browser viewport, including in Tablet/Mobile preview and while scrolling.
    const edgeTabs = make('div', 'component-page-edge-tabs');
    edgeTabs.setAttribute('role', 'group');
    edgeTabs.setAttribute('aria-label', 'Component panels');
    const usageIcon = make('span', 'component-page-edge-icon');
    usageIcon.setAttribute('aria-hidden', 'true');
    usageIcon.innerHTML = icons.svg('layers');
    const usagePanel = (windows?.forWindow('kanban.used-components') || DesignSystemWindow).mount(element, {
      title: 'Used components',
      mode: 'side',
      side: 'right',
      lockScroll: false,
      content: usage,
      initialFocus: 'a',
      onOpen() { usageButton.element.setAttribute('aria-expanded', 'true'); },
      onClose() { usageButton.element.setAttribute('aria-expanded', 'false'); },
    });
    const usageButton = DesignSystemButtons.mount(edgeTabs, {
      label: 'Used components',
      icon: usageIcon,
      variant: 'secondary',
      onClick: () => usagePanel.open(),
    });
    usageButton.element.setAttribute('aria-haspopup', 'dialog');
    usageButton.element.setAttribute('aria-controls', usagePanel.element.id);
    usageButton.element.setAttribute('aria-expanded', 'false');
    doc.body.append(edgeTabs);
    function navigateDependency(event) {
      if (event.target.closest('a')) usagePanel.close('navigate', { immediate: true });
    }
    componentList.addEventListener('click', navigateDependency);
    return {
      destroy() {
        off();
        componentList.removeEventListener('click', navigateDependency);
        usagePanel.destroy();
        usageButton.destroy();
        edgeTabs.remove();
        board.destroy();
        dialog.remove();
        element.replaceChildren();
      },
    };
  }
  root.ExampleKanban = Object.freeze({ mount });
})(globalThis);
