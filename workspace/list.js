/* Example composition: domain-specific columns/data, badges, storage and device preview. */
(function (root) {
  'use strict';
  function mount(
    page,
    { settings, getDevice = () => 'auto', subscribeDevice = () => () => {} } = {},
  ) {
    const doc = page.ownerDocument,
      host = doc.createElement('div');
    host.className = 'example-list';
    page.append(host);
    settings?.defaults(root.DesignSystemList.defaults);
    const data = root.ExampleKanbanData,
      stages = new Map(data.columns.map((column) => [column.id, column.label]));
    const rows = data.items.map((card) => ({
      id: card.id,
      name: card.title,
      address: card.subtitle,
      reference: card.metaLeft,
      stage: stages.get(card.columnId),
      date: card.footer,
      estimate: card.metaRight,
      city: card.subtitle.split(',')[0],
      project: card.description,
      colour: 'var(--ds-card-accent,var(--ds-colour-accent))',
      accent: 'var(--ds-card-accent,var(--ds-colour-accent))',
    }));
    const columns = [
      {
        id: 'name',
        label: 'Order',
        secondaryKey: 'address',
        desktop: true,
        tablet: true,
        mobile: true,
        width: { desktop: '19%', tablet: '30%', mobile: '46%' },
      },
      {
        id: 'reference',
        label: 'Reference',
        monospace: true,
        tablet: true,
        mobile: false,
        width: { desktop: '12%', tablet: '19%' },
      },
      {
        id: 'stage',
        label: 'Stage',
        tablet: true,
        mobile: true,
        width: { desktop: '10%', tablet: '15%', mobile: '26%' },
        render(value) {
          const host = doc.createElement('span');
          const badge = root.DesignSystemBadges.mount(host, { label: value });
          return { element: host, destroy: () => badge.destroy() };
        },
      },
      {
        id: 'date',
        label: 'Due date',
        tablet: true,
        mobile: false,
        width: { desktop: '13%', tablet: '21%' },
      },
      {
        id: 'estimate',
        label: 'Estimate',
        strong: true,
        tablet: true,
        mobile: true,
        width: { desktop: '10%', tablet: '15%', mobile: '28%' },
      },
      { id: 'city', label: 'City', tablet: false, mobile: false, width: '10%' },
      { id: 'project', label: 'Project', tablet: false, mobile: false, width: '18%' },
      {
        id: 'colour',
        label: 'Card colour',
        tablet: false,
        mobile: false,
        width: '8%',
        render(value) {
          const wrap = doc.createElement('span');
          wrap.className = 'example-list-colour';
          const swatch = doc.createElement('i');
          swatch.style.background = value;
          swatch.setAttribute('aria-hidden', 'true');
          const label = doc.createElement('span');
          label.textContent = 'Palette';
          wrap.append(swatch, label);
          return wrap;
        },
      },
    ];
    const toolbar = doc.createElement('div');
    toolbar.className = 'example-list-toolbar';
    const searchHost = doc.createElement('div');
    searchHost.className = 'example-list-search';
    const results = doc.createElement('span');
    results.className = 'example-list-results';
    results.setAttribute('role', 'status');
    toolbar.append(searchHost, results);
    host.prepend(toolbar);
    const listHost = doc.createElement('div');
    host.append(listHost);
    const list = root.DesignSystemList.mount(listHost, {
      ...settings?.snapshot(),
      label: 'Orders list',
      columns,
      rows,
      device: getDevice(),
      onDensityChange: (value) => settings?.set('density', value),
    });
    const search = root.DesignSystemAutocomplete.mount(searchHost, {
      label: 'Search list',
      placeholder: 'Customer, reference, city or stage…',
      size: 'small',
      multiple: true,
      items: rows.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.reference + ' · ' + row.address,
        group: row.stage,
      })),
      onQuery: filter,
      onChange: filter,
    });
    function filter() {
      const selected = search.getValue(),
        query = search.getQuery().trim().toLowerCase();
      const filtered = rows.filter(
        (row) =>
          (!selected.length || selected.includes(row.id)) &&
          (!query ||
            [row.name, row.address, row.reference, row.stage, row.project]
              .join(' ')
              .toLowerCase()
              .includes(query)),
      );
      list.update({ rows: filtered, page: 1 });
      results.textContent = 'Results: ' + filtered.length + ' / ' + rows.length;
    }
    filter();
    const off = subscribeDevice((device) => list.update({ device }));
    return {
      destroy() {
        off();
        search.destroy();
        list.destroy();
        host.remove();
      },
    };
  }
  root.ExampleList = { mount };
})(globalThis);
