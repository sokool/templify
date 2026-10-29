const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Tool = require('../tool.js');
const Board = require('../kanban-board.js');
const Card = require('../../card/card.js');
const Button = require('../../buttons/buttons.js');
const Themes = require('../../../foundations/themes.js');
const Settings = require('../../../storage/settings.js');
const { createFixture } = require('../../../testing/kanban-fixture.cjs');

const token = '--ds-card-accent';
const items = [
  { id: 'one', columnId: 'a', title: 'One' },
  { id: 'two', columnId: 'a', title: 'Two' },
  { id: 'three', columnId: 'b', title: 'Three' },
];

function setup(t, random = () => 0) {
  const fixture = createFixture();
  const settings = Settings.create();
  const toolSettings = settings.scope('preview.kanban-board');
  const themes = Themes.create({ target: fixture.document.createElement('html') });
  const subscribe = themes.subscribe;
  let subscriptions = 0;
  themes.subscribe = (listener) => {
    subscriptions++;
    const off = subscribe(listener);
    return () => {
      subscriptions--;
      off();
    };
  };
  const tool = Tool.mount(fixture.element, {
    themes, settings: toolSettings, getItems: () => items, Button, random,
  });
  t.after(() => tool.destroy());
  return { ...fixture, themes, settings, toolSettings, tool, subscriptions: () => subscriptions };
}

test('each card gets an independent active-palette reference; reroll and Reset use shared Buttons', (t) => {
  let sample = 0;
  const { tool, themes, element, document } = setup(t, () => sample++ / 100);
  const cards = items.map(({ id }) => {
    const card = document.createElement('article');
    tool.bind(card, id);
    return card;
  });
  assert(cards.every((card) => card.style.getPropertyValue(token) === ''));
  const buttons = element.querySelectorAll('button');
  assert.equal(buttons[0].textContent, 'Randomise card borders');
  assert.equal(buttons[1].textContent, 'Reset borders');
  assert(buttons[1].disabled);
  // Only references from the complete active Palette are eligible.
  const state = themes.getState();
  const choices = ['brand', 'accent', 'greys'].flatMap((category) =>
    state.colours.light[category].map(({ id }) => `var(--ds-palette-${category}-${id})`),
  );
  sample = 0;
  buttons[0].emit('click');
  assert.equal(sample, 3);
  assert(cards.every((card) => choices.includes(card.style.getPropertyValue(token))));
  const first = cards.map((card) => card.style.getPropertyValue(token));
  sample = 70;
  buttons[0].emit('click');
  assert.notDeepEqual(cards.map((card) => card.style.getPropertyValue(token)), first);
  assert(!buttons[1].disabled);
  assert.match(element.querySelector('p').textContent, /3 card borders/);
  buttons[1].emit('click');
  assert(cards.every((card) => card.style.getPropertyValue(token) === ''));
  assert(buttons[1].disabled);
});

test('colours stay with IDs through filtering, movement, device changes and renderer recreation', (t) => {
  let sample = 0;
  const { tool, document } = setup(t, () => (sample++ % 3) / 3);
  const host = document.createElement('div');
  document.body.append(host);
  const board = Board.mount(host, {
    columns: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    items,
    renderItem(item, context) {
      const card = Card.mount(document.createElement('article'), { ...item, ...context });
      const binding = tool.bind(card.element, item.id);
      return {
        ...card,
        destroy() {
          binding.destroy();
          card.destroy();
        },
      };
    },
  });
  t.after(() => board.destroy());
  const colours = () => Object.fromEntries(
    host.querySelectorAll('.ds-kanban__item').map((item) => [
      item.dataset.itemId, item.querySelector('.ds-card').style.getPropertyValue(token),
    ]),
  );
  board.setFilter((item) => item.id === 'two');
  tool.randomise();
  const visibleColour = colours().two;
  board.setFilter(null);
  const before = colours();
  assert.equal(before.two, visibleColour);
  assert.equal(new Set(Object.values(before)).size, 3);
  assert(board.move('one', 'b', 'three'));
  board.setDevice('mobile');
  assert.deepEqual(colours(), before);
  board.update({ items: board.getState().items });
  assert.deepEqual(colours(), before);
  tool.reset();
  assert(Object.values(colours()).every((value) => value === ''));
});

test('theme assignments are isolated and follow palette edits/deletions without HEX fallbacks', (t) => {
  const { tool, themes, document } = setup(t);
  const card = document.createElement('article');
  tool.bind(card, 'one');
  tool.randomise();
  const reference = themes.getState().colours.light.brand[0];
  const light = card.style.getPropertyValue(token);
  assert.equal(light, `var(--ds-palette-brand-${reference.id})`);
  themes.updateColour('light', 'brand', reference.id, '#123456');
  assert.equal(card.style.getPropertyValue(token), light);
  themes.select('dark');
  assert.equal(card.style.getPropertyValue(token), '');
  tool.randomise();
  themes.select('light');
  assert.equal(card.style.getPropertyValue(token), light);
  tool.reset();
  themes.select('dark');
  assert(card.style.getPropertyValue(token));
  themes.select('light');
  tool.randomise();
  themes.removeColour('light', 'brand', reference.id);
  assert.equal(card.style.getPropertyValue(token), '');
  assert.equal(themes.getComponentSettings('light', 'kanban-board'), null);
  assert.equal(themes.getComponentSettings('dark', 'kanban-board'), null);
  assert.equal(themes.getComponentSettings('light', 'card'), null);
});

test('the latest roll survives remount/reload as tool-only settings, and resets persist per theme', () => {
  const { element, document } = createFixture();
  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
  };
  let settings = Settings.create({ storage });
  const themes = Themes.create({ target: document.createElement('html') });
  let sample = 0;
  const mount = () => Tool.mount(element, {
    themes,
    settings: settings.scope('preview.kanban-board'),
    getItems: () => items,
    Button,
    random: () => sample,
  });
  let tool = mount();
  const card = document.createElement('article');
  tool.bind(card, 'one');
  tool.randomise();
  const first = card.style.getPropertyValue(token);
  sample = 0.9;
  tool.randomise();
  const latest = card.style.getPropertyValue(token);
  assert.notEqual(latest, first);
  themes.select('dark');
  sample = 0.5;
  tool.randomise();
  const dark = card.style.getPropertyValue(token);
  tool.destroy();

  // Navigation away/back reuses the store, but recreates the tool.
  tool = mount();
  tool.bind(card, 'one');
  assert.equal(card.style.getPropertyValue(token), dark);
  tool.destroy();

  // A browser reload creates a fresh settings service from the same storage.
  settings = Settings.create({ storage });
  tool = mount();
  tool.bind(card, 'one');
  themes.select('light');
  assert.equal(card.style.getPropertyValue(token), latest);
  assert.match(element.querySelector('p').textContent, /Saved per theme/);
  tool.reset();
  tool.destroy();
  settings = Settings.create({ storage });
  tool = mount();
  try {
    tool.bind(card, 'one');
    assert.equal(card.style.getPropertyValue(token), '');
    themes.select('dark');
    assert.equal(card.style.getPropertyValue(token), dark);
    assert.equal(settings.get('preview.kanban-board.borders').length, 1);
    assert(settings.exportJSON({ template: false }).includes('kanban-board'));
    assert(!settings.exportJSON().includes('kanban-board'));
    assert(!themes.exportTokens().includes('kanban-board'));
    assert(!themes.exportCSS().includes(latest));
    assert.deepEqual(settings.get('components', {}), {});
    assert.equal(themes.getComponentSettings('light', 'kanban-board'), null);
    assert.equal(themes.getComponentSettings('dark', 'kanban-board'), null);
    assert.equal(themes.getComponentSettings('light', 'card'), null);
  } finally {
    tool.destroy();
  }
});

test('malformed saved preferences are ignored and unavailable palette references inherit Card borders', () => {
  const { element, document } = createFixture();
  const themes = Themes.create({ target: document.createElement('html') });
  const settings = Settings.create().scope('preview.kanban-board');
  const valid = { category: 'brand', id: themes.getState().colours.light.brand[0].id };
  for (const saved of [null, {}, [null, {}, { theme: 'light', cards: null }], [{
    theme: 'light',
    cards: [
      null,
      { id: 'one', colour: { category: 'other', id: valid.id } },
      { id: 'one', colour: { category: 'brand', id: 'bad);color:red' } },
      { id: 'one', colour: { category: 'brand', id: 'missing' } },
      { id: 'two', colour: valid },
    ],
  }]]) {
    settings.set('borders', saved);
    const tool = Tool.mount(element, { themes, settings, getItems: () => items, Button });
    try {
      const card = document.createElement('article');
      tool.bind(card, 'one');
      assert.equal(card.style.getPropertyValue(token), '');
      if (Array.isArray(saved) && saved[0]?.cards?.length) {
        const other = document.createElement('article');
        tool.bind(other, 'two');
        assert.equal(other.style.getPropertyValue(token), `var(--ds-palette-brand-${valid.id})`);
      }
    } finally {
      tool.destroy();
    }
  }
});

test('bindings and teardown restore prior overrides and remove theme/button listeners', (t) => {
  const { tool, themes, document, element, subscriptions } = setup(t);
  const card = document.createElement('article');
  card.style.setProperty(token, 'var(--original-border)');
  const binding = tool.bind(card, 'one');
  tool.randomise();
  assert.notEqual(card.style.getPropertyValue(token), 'var(--original-border)');
  binding.destroy();
  tool.reset();
  assert.equal(card.style.getPropertyValue(token), 'var(--original-border)');
  tool.bind(card, 'one');
  tool.randomise();
  const buttons = element.querySelectorAll('button');
  assert.equal(subscriptions(), 1);
  tool.destroy();
  assert.equal(subscriptions(), 0);
  assert.equal(element.children.length, 0);
  assert.equal(card.style.getPropertyValue(token), 'var(--original-border)');
  assert(buttons.every((button) => button.listeners.get('click').size === 0));
  themes.select('dark');
  assert.equal(card.style.getPropertyValue(token), 'var(--original-border)');
});

test('an empty Palette disables randomisation and leaves inherited Card appearance alone', (t) => {
  const { themes, tool, element, document } = setup(t);
  const getState = themes.getState;
  themes.getState = () => {
    const state = getState();
    state.colours[state.theme] = { brand: [], accent: [], greys: [] };
    return state;
  };
  const card = document.createElement('article');
  tool.bind(card, 'one');
  themes.select('dark');
  assert(element.querySelector('button').disabled);
  assert.equal(tool.randomise(), false);
  assert.equal(card.style.getPropertyValue(token), '');
});

test('the composed Kanban mounts the tool and disposes bindings, subscriptions and menus', () => {
  const { element, document } = createFixture();
  const themes = Themes.create({ target: document.createElement('html') });
  const borderToolSettings = Settings.create().scope('preview.kanban-board');
  const context = {
    DesignSystemCard: Card,
    DesignSystemKanbanBoard: Board,
    DesignSystemButtons: Button,
    DesignSystemAutocomplete: {
      mount(host, options) {
        const input = document.createElement('input');
        input.value = '';
        host.append(input);
        return { input, getQuery: () => '', update() {}, destroy() { input.remove(); } };
      },
    },
  };
  for (const file of [
    '../tool.js', '../../../examples/kanban-data.js', '../../../examples/kanban.js',
  ]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
  }
  let device;
  const options = {
    document,
    themes,
    borderToolSettings,
    icons: { svg: () => '' },
    getDevice: () => 'desktop',
    subscribeDevice(listener) { device = listener; return () => { device = null; }; },
  };
  let view = context.ExampleKanban.mount(element, options);
  let controls = element.querySelector('.kanban-board-tool');
  controls.querySelector('button').emit('click');
  assert.equal(element.querySelectorAll('.ds-card').length, 19);
  assert(element.querySelectorAll('.ds-card').every((card) => card.style.getPropertyValue(token)));
  const colours = () => element.querySelectorAll('.ds-card')
    .map((card) => card.style.getPropertyValue(token));
  const saved = colours();
  view.destroy();
  view = context.ExampleKanban.mount(element, options);
  assert.deepEqual(colours(), saved);
  controls = element.querySelector('.kanban-board-tool');
  device('mobile');
  controls.querySelectorAll('button')[1].emit('click');
  assert(element.querySelectorAll('.ds-card').every((card) => !card.style.getPropertyValue(token)));
  view.destroy();
  assert.equal(device, null);
  assert.equal(element.children.length, 0);
  assert.equal(document.querySelectorAll('.ds-card-menu').length, 0);
  assert.equal(document.querySelectorAll('dialog').length, 0);
  view = context.ExampleKanban.mount(element, options);
  assert(colours().every((colour) => colour === ''));
  view.destroy();
});

test('Kanban exports exclude authoring assets and runtime never depends on the tool', () => {
  const base = path.join(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  assert.equal(manifest.tool.export, false);
  for (const file of ['tool.js', 'tool.css']) {
    assert(fs.existsSync(path.join(base, file)));
    assert(manifest.excluded.includes(file));
    assert(!manifest.exportFiles.includes(file));
    assert(!manifest.runtimeFiles.includes(file));
  }
  for (const file of manifest.runtimeFiles) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(base, file), 'utf8'),
      /DesignSystemKanbanBoardTool|DesignSystemThemes|Math\.random|--ds-card-accent/,
    );
  }
});
