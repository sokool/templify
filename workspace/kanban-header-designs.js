/* Preview composition only; component runtime and user preferences are unchanged. */
(function () {
  'use strict';

  const designs = [
    { id: 'folder', number: '01', name: 'Folder tab', short: 'Zakładka teczki połączona z kolumną.',
      description: 'Nazwa na krótkim języczku ze ściętą krawędzią, połączonym z kolumną. Licznik pozostaje poza zakładką.' },
    { id: 'big-counter', number: '02', name: 'Big counter', short: 'Duża liczba, mniejsza nazwa. Bez ramek.',
      description: 'Duży, lekki licznik po lewej i mniejsza nazwa obok. Hierarchię buduje typografia, bez dodatkowego tła i obramowania.' },
    { id: 'underline', number: '03', name: 'Underline', short: 'Kolor etapu w cienkiej linii.', preserved: true,
      description: 'Otwarty nagłówek z delikatnym podkreśleniem. Wyraźnie oddziela karty, nie zamykając tytułu w pudełku.' },
    { id: 'label', number: '04', name: 'Label', short: 'Pastelowa pastylka tylko pod nazwą.',
      description: 'Nazwa etapu w niewielkiej kolorowej pastylce, licznik osobno przy prawej krawędzi. Reszta nagłówka pozostaje otwarta.' },
    { id: 'steps', number: '05', name: 'Steps', short: 'Numeracja podkreśla kolejność etapów.', preserved: true,
      description: 'Drobny numer porządkowy przed nazwą. Spokojny, techniczny charakter, który dobrze pasuje do procesu realizacji.' },
    { id: 'divider', number: '06', name: 'Divider', short: 'Nazwa w linii. Licznik na jej końcu.',
      description: 'Nazwa wkomponowana w cienką poziomą linię, licznik na jej końcu. Techniczny, uporządkowany wygląd bez osobnego paska.' },
    { id: 'tint', number: '07', name: 'Color wash', short: 'Pastelowe tło przypisane do etapu.', preserved: true,
      description: 'Każdy etap ma własną stonowaną powierzchnię. Bez obramowania; dobry kierunek, jeśli kolumny mają być rozpoznawalne od razu.' },
    { id: 'split', number: '08', name: 'Split', short: 'Neutralna nazwa, kolorowy segment liczby.',
      description: 'Dwudzielny nagłówek: neutralne pole z nazwą i osobny kolorowy segment z liczbą, rozciągnięty na całą wysokość.' },
  ];

  const choices = document.getElementById('design-choices');
  const preview = document.getElementById('board-preview');
  const heading = document.getElementById('preview-heading');
  const description = document.getElementById('preview-description');
  const compare = document.getElementById('compare-toggle');
  const theme = document.getElementById('theme-toggle');
  const status = document.getElementById('selection-status');
  let selected = designs[2];
  let comparing = false;

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  for (const design of designs) {
    const button = make('button', 'ds-component ds-button ds-focusable study-choice');
    button.type = 'button';
    button.dataset.variant = 'secondary';
    button.dataset.design = design.id;
    button.dataset.preserved = String(Boolean(design.preserved));
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-controls', 'board-preview');

    const thumbnail = make('span', 'header-study study-thumbnail');
    thumbnail.dataset.headerDesign = design.id;
    thumbnail.setAttribute('aria-hidden', 'true');
    for (const column of ExampleKanbanData.columns.slice(0, 2)) {
      const lane = make('span', 'ds-kanban__column');
      const title = make('span', 'ds-kanban__heading');
      const count = ExampleKanbanData.items.filter((item) => item.columnId === column.id).length;
      title.append(make('span', '', column.label), make('span', 'ds-kanban__count', count));
      const card = make('span', 'study-card-skeleton');
      card.append(make('span'), make('span'), make('span'));
      lane.append(title, card);
      thumbnail.append(lane);
    }

    const copy = make('span', 'study-choice-copy');
    const title = make('span', 'study-choice-title');
    title.append(make('span', 'study-choice-number', design.number), make('span', '', design.name));
    title.append(make('span', 'study-choice-status', design.preserved ? 'Zostaje' : 'Nowy'));
    copy.append(title, make('span', 'study-choice-description', design.short));
    button.append(thumbnail, copy);
    button.addEventListener('click', () => select(design));
    choices.append(button);
  }

  DesignSystemKanbanBoard.mount(preview, {
    columns: ExampleKanbanData.columns,
    items: ExampleKanbanData.items,
    label: 'Podgląd nagłówków kolumn Kanban',
    renderItem(item, context) {
      // Preserve Card's appearance and movement actions; this study has no details dialog.
      return DesignSystemCard.mount(make('article'), {
        ...item,
        ...context,
        actions: context.actions.filter((action) => action.id !== 'open'),
      });
    },
  });

  function render() {
    preview.dataset.headerDesign = comparing ? 'current' : selected.id;
    heading.textContent = comparing ? 'Obecny nagłówek' : selected.number + ' / ' + selected.name;
    description.textContent = comparing
      ? 'Wdrożony wariant 03 / Underline: otwarty nagłówek z cienkim podkreśleniem i licznikiem w kolorze etapu.'
      : selected.description;
    compare.setAttribute('aria-pressed', String(comparing));
    compare.textContent = comparing ? 'Wróć do wariantu ' + selected.number : 'Porównaj z obecnym';
    for (const button of choices.children) {
      button.setAttribute('aria-pressed', String(button.dataset.design === selected.id));
    }
    status.textContent = 'Twój wybór: ' + selected.number + ' / ' + selected.name + '. Podaj numer, który chcesz rozwinąć.';
  }

  function select(design, updateURL = true) {
    selected = design;
    comparing = false;
    if (updateURL) history.replaceState(null, '', '#' + design.number);
    render();
  }

  function readChoice() {
    select(designs.find((design) => design.number === location.hash.slice(1)) || designs[2], false);
  }

  compare.addEventListener('click', () => {
    comparing = !comparing;
    render();
  });
  theme.addEventListener('click', () => {
    const dark = document.documentElement.dataset.dsTheme !== 'dark';
    document.documentElement.dataset.dsTheme = dark ? 'dark' : 'light';
    theme.setAttribute('aria-pressed', String(dark));
    theme.textContent = dark ? 'Jasny motyw' : 'Ciemny motyw';
  });
  window.addEventListener('hashchange', readChoice);
  readChoice();
})();
