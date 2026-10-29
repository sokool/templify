const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { Document } = require('./dom-fixture.cjs'),
  Themes = require('../foundations/themes.js');
function host() {
  const document = new Document();
  return document.createElement('html');
}
function storage(value) {
  return {
    value,
    getItem() {
      return this.value;
    },
    setItem(key, value) {
      this.value = value;
    },
  };
}
test('theme edits apply semantic tokens, isolate modes and persist across reloads', () => {
  const target = host(),
    saved = storage(),
    themes = Themes.create({ target, storage: saved });
  themes.setColour('dark', 'panel', '#123456');
  assert.equal(target.style.get('--ds-colour-panel'), '#FFFFFF');
  themes.select('dark');
  assert.equal(target.style.get('--ds-colour-panel'), '#123456');
  assert.equal(target.dataset.dsTheme, 'dark');
  const restored = Themes.create({ target: host(), storage: saved });
  assert.equal(restored.getState().theme, 'dark');
  assert.equal(restored.getState().palettes.dark.panel, '#123456');
  restored.reset();
  assert.equal(restored.getState().palettes.dark.panel, Themes.defaults.dark.panel);
  assert.equal(restored.getState().palettes.light.panel, '#FFFFFF');
});
test('malformed configuration is rejected, blocked storage is harmless and snapshots are independent', () => {
  const target = host(),
    themes = Themes.create({
      target,
      storage: {
        getItem() {
          throw Error();
        },
        setItem() {
          throw Error();
        },
      },
    });
  assert.equal(themes.setColour('light', 'panel', 'url(x)'), false);
  assert.equal(themes.setColour('unknown', 'panel', '#123456'), false);
  assert.equal(themes.select('unknown'), false);
  const state = themes.getState();
  state.palettes.light.panel = 'broken';
  assert.equal(themes.getState().palettes.light.panel, '#FFFFFF');
  const restored = Themes.create({
    target: host(),
    storage: storage(
      JSON.stringify({
        theme: 'matrix',
        palettes: { matrix: { panel: 'url(x)', text: '#abcdef' } },
      }),
    ),
  });
  assert.equal(restored.getState().palettes.matrix.panel, Themes.defaults.matrix.panel);
  assert.equal(restored.getState().palettes.matrix.text, '#ABCDEF');
});
test('editor subscriptions stop on unmount and do not affect independent consumers', () => {
  const themes = Themes.create({ target: host() });
  let updates = 0;
  const off = themes.subscribe(() => updates++);
  themes.select('matrix');
  off();
  themes.select('light');
  assert.equal(updates, 1);
});
test('CSS defaults agree with theme data so components work without configuration runtime', () => {
  const css = fs.readFileSync(path.join(__dirname, '../foundations/tokens.css'), 'utf8');
  for (const [theme, colours] of Object.entries(Themes.defaults)) {
    const blocks = [
      ...css.matchAll(
        new RegExp('\\[data-ds-theme=[\\\'\"]?' + theme + '[\\\'\"]?\\][^{}]*\\{([^}]*)\\}', 'g'),
      ),
    ];
    const block = blocks.at(-1)?.[1] || '';
    for (const [role, value] of Object.entries(colours))
      assert(
        new RegExp(Themes.tokens[role] + '\\s*:\\s*' + value + '\\s*;', 'i').test(block),
        theme + ' ' + role,
      );
  }
});
test('arbitrary themes clone independently, cycle, persist and export in insertion order', () => {
  const saved = storage(),
    themes = Themes.create({ target: host(), storage: saved });
  const ocean = themes.add('Ocean', 'dark');
  assert.equal(themes.getState().themes.length, 4);
  assert.equal(themes.getState().theme, ocean);
  assert.equal(themes.getState().palettes[ocean].panel, Themes.defaults.dark.panel);
  themes.setColour(ocean, 'panel', '#102030');
  assert.equal(themes.getState().palettes.dark.panel, Themes.defaults.dark.panel);
  assert.equal(themes.next(), 'light');
  themes.select('matrix');
  assert.equal(themes.next(), ocean);
  const restored = Themes.create({ target: host(), storage: saved });
  assert.equal(restored.getState().theme, ocean);
  assert.equal(restored.getState().themes[3].label, 'Ocean');
  assert.match(restored.exportCSS(), new RegExp('data-ds-theme="' + ocean + '"'));
  assert.match(restored.exportCSS(), /#102030/);
  const imported = Themes.create({ target: host() });
  imported.importTokens(JSON.parse(restored.exportTokens()));
  assert.equal(imported.getState().themes[3].label, 'Ocean');
  assert.throws(() => themes.add('Ocean'));
  assert.throws(() => themes.add(''));
  assert.throws(() => themes.add('Other', 'missing'));
});
test('remove active themes selects the successor, keeps the last one and detaches aliases safely', () => {
  const themes = Themes.create({ target: host() }),
    custom = themes.add('Only theme');
  const doc = themes.getTokens();
  doc.themes[custom].accent = { $value: '{themes.dark.accent}' };
  themes.importTokens(doc);
  themes.select('dark');
  themes.remove('dark');
  assert.equal(themes.getState().theme, 'matrix');
  assert.equal(themes.getState().palettes[custom].accent, Themes.defaults.dark.accent);
  themes.remove('light');
  themes.remove('matrix');
  assert.equal(themes.getState().theme, custom);
  assert.equal(themes.next(), custom);
  assert.throws(() => themes.remove(custom), /at least one/);
  assert.equal(themes.getState().themes.length, 1);
  const restored = Themes.create({
    target: host(),
    storage: storage(JSON.stringify({ theme: custom, tokens: themes.getTokens() })),
  });
  assert.equal(restored.getState().theme, custom);
  const imported = Themes.create({ target: host() });
  imported.importTokens(themes.getTokens());
  assert.equal(imported.getState().theme, custom);
  const empty = themes.getTokens();
  empty.themes = {};
  assert.throws(() => themes.importTokens(empty));
  assert.equal(themes.getState().theme, custom);
});
