const { test } = require('node:test');
const assert = require('node:assert/strict');
const Themes = require('../themes/themes.js');
const Shadows = require('../shadows/shadows.js');
const Settings = require('../../app/storage/settings.js');
const { Document } = require('./dom-fixture.cjs');

function create(settings) {
  const document = new Document();
  const target = document.createElement('html');
  return { target, themes: Themes.create({ target, settings }) };
}

test('shadow profiles use safe shared variables, are editable per theme and keep None immutable', () => {
  const { themes, target } = create();
  assert.equal(target.style.get('--ds-shadow-none'), 'none');
  assert.match(target.style.get('--ds-shadow-soft'), /^0px 3px 12px 0px color-mix/);
  themes.setShadow('light', 'soft', { x: 4, y: 10, blur: 30, spread: -2, opacity: 25 });
  assert.match(target.style.get('--ds-shadow-soft'), /^4px 10px 30px -2px /);
  assert.match(target.style.get('--ds-shadow-soft'), /var\(--ds-colour-text\) 25%/);
  themes.select('dark');
  assert.equal(themes.getState().shadows.dark.soft.blur, 12);
  assert.equal(themes.getState().shadows.light.soft.blur, 30);
  assert.throws(() => themes.setShadow('dark', 'none', { opacity: 50 }));
  assert.equal(themes.resetShadow('dark', 'none'), false);
  themes.resetShadow('light', 'soft');
  assert.deepEqual(themes.getState().shadows.light.soft, Shadows.defaults.soft);
});

test('shadow colours follow palette references and deleted primitives return to the theme text colour', () => {
  const { themes, target } = create();
  const item = themes.getState().colours.light.brand[0];
  themes.setShadow('light', 'medium', {
    colour: { kind: 'palette', category: 'brand', id: item.id, fallback: '#123456' },
  });
  assert(target.style.get('--ds-shadow-medium').includes(`var(--ds-palette-brand-${item.id})`));
  assert(!target.style.get('--ds-shadow-medium').includes('#123456'));
  themes.updateColour('light', 'brand', item.id, '#AABBCC');
  assert.equal(target.style.get(`--ds-palette-brand-${item.id}`), '#AABBCC');
  themes.removeColour('light', 'brand', item.id);
  assert.deepEqual(themes.getState().shadows.light.medium.colour, {
    kind: 'semantic',
    role: 'text',
  });
  assert(target.style.get('--ds-shadow-medium').includes('var(--ds-colour-text)'));
});

test('theme copies, persistence and DTCG/CSS exports retain shadow definitions and component choices', () => {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
  };
  const { themes } = create(Settings.create({ storage }));
  themes.setShadow('light', 'strong', { blur: 70, opacity: 35 });
  const card = {
    size: 420,
    css: { '--ds-card-background': 'var(--ds-colour-hover)' },
  };
  themes.setComponentSettings('light', 'card', card);
  const copy = themes.add('Shadow copy', 'light');
  assert.equal(themes.getState().shadows[copy].strong.blur, 70);
  assert.deepEqual(themes.getComponentSettings(copy, 'card'), card);
  const { themes: restored } = create(Settings.create({ storage }));
  assert.equal(restored.getState().shadows[copy].strong.opacity, 35);
  const { themes: imported } = create();
  imported.importTokens(JSON.parse(themes.exportTokens()));
  assert.deepEqual(imported.getState().shadows, themes.getState().shadows);
  assert.deepEqual(imported.getComponentSettings(copy, 'card'), card);
  const css = imported.exportCSS();
  assert.match(css, /--ds-shadow-strong: 0px 16px 70px 0px /);
  assert.match(css, /--ds-card-background: var\(--ds-colour-hover\)/);
  const darkRules = [...css.matchAll(/\[data-ds-theme="dark"\]\s*\{([^}]+)\}/g)].at(-1)[1];
  assert.match(darkRules, /--ds-card-background: initial;/);
});

test('invalid shadow edits and imports are rejected atomically, including custom colours and CSS injection', () => {
  const { themes } = create();
  const before = themes.exportTokens();
  for (const values of [
    { x: 101 },
    { y: -101 },
    { blur: -1 },
    { blur: NaN },
    { spread: 101 },
    { opacity: 101 },
    { opacity: 0.5 },
    { toString: 12 },
    { colour: { kind: 'custom', value: '#123456' } },
    { colour: { kind: 'semantic', role: 'unknown' } },
    { colour: { kind: 'palette', category: 'brand', id: 'missing', fallback: '#123456' } },
  ]) {
    assert.throws(() => themes.setShadow('light', 'soft', values));
    assert.equal(themes.exportTokens(), before);
  }
  assert.throws(() =>
    themes.setComponentSettings('light', 'card', { css: { '--ds-card-shadow': 'url(evil)' } }),
  );
  const document = themes.getTokens();
  document.themes.light.$extensions = {
    [Shadows.extension]: { soft: { opacity: '50' } },
  };
  assert.throws(() => themes.importTokens(document));
  assert.equal(themes.exportTokens(), before);
});

test('theme runtime applies component variables without a tool and clears them on theme changes', () => {
  const { themes, target } = create();
  themes.setComponentSettings('light', 'card', {
    css: { '--ds-card-shadow': 'var(--ds-shadow-strong)' },
  });
  assert.equal(target.style.get('--ds-card-shadow'), 'var(--ds-shadow-strong)');
  themes.select('dark');
  assert.equal(target.style.getPropertyValue('--ds-card-shadow'), '');
  themes.select('light');
  assert.equal(target.style.get('--ds-card-shadow'), 'var(--ds-shadow-strong)');
});
