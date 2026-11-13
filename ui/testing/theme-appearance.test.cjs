const { test } = require('node:test');
const assert = require('node:assert/strict');
const Themes = require('../themes/themes.js');
const Settings = require('../../storage/settings.js');
const { Document } = require('./dom-fixture.cjs');
function setup(settings = Settings.create()) {
  const target = new Document().createElement('html');
  return { settings, target, themes: Themes.create({ target, settings }) };
}

test('complete theme profiles isolate typography and icons alongside colours and shadows', () => {
  const { themes, target, settings } = setup();
  themes.setAppearance('light', { fontFamily: 'Inter', iconSize: 28, iconStroke: 2.5 });
  themes.setColour('light', 'panel', '#FAFAFA');
  themes.setShadow('light', 'soft', { blur: 30 });
  assert.equal(target.style.get('--ds-icon-size'), '28px');
  assert.match(target.style.get('--ds-font-family'), /Inter/);
  themes.select('dark');
  assert.equal(target.style.get('--ds-colour-panel'), Themes.defaults.dark.panel);
  assert.match(target.style.get('--ds-shadow-soft'), /12px/);
  assert.equal(target.style.get('--ds-icon-size'), '20px');
  assert.equal(target.style.get('--ds-icon-stroke'), '1.75');
  assert.match(target.style.get('--ds-font-family'), /Manrope/);
  themes.select('light');
  assert.equal(target.style.get('--ds-colour-panel'), '#FAFAFA');
  assert.match(target.style.get('--ds-shadow-soft'), /30px/);
  const id = themes.add('Complete copy');
  assert.deepEqual(themes.getState().appearance[id], themes.getState().appearance.light);
  themes.setAppearance(id, { fontFamily: 'Roboto' });
  assert.equal(themes.getState().appearance.light.fontFamily, 'Inter');
  const restored = setup(settings).themes;
  assert.deepEqual(restored.getState().appearance, themes.getState().appearance);
  const imported = setup().themes;
  imported.importTokens(JSON.parse(themes.exportTokens()));
  assert.deepEqual(imported.getState().appearance, themes.getState().appearance);
  assert.match(themes.exportCSS(), /--ds-font-family: "Inter", system-ui, sans-serif/);
  assert.match(themes.exportCSS(), /--ds-icon-size: 28px/);
  assert.match(themes.exportCSS(), /--ds-icon-stroke: 2.5/);
  themes.reset(id);
  assert.equal(themes.getState().appearance[id].fontFamily, 'Manrope');
  const state = themes.getState(); state.appearance.light.fontFamily = 'mutated';
  assert.equal(themes.getState().appearance.light.fontFamily, 'Inter');
});

test('invalid appearance edits and imports are atomic and cannot inject CSS', () => {
  const { themes } = setup(), before = themes.exportTokens();
  for (const values of [{ fontFamily: 'Inter";color:red' }, { iconSize: 100 }, { iconStroke: NaN }, { iconStroke: 0 }, { unknown: 'x' }]) {
    assert.throws(() => themes.setAppearance('light', values), /Invalid/);
    assert.equal(themes.exportTokens(), before);
  }
  const tokens = themes.getTokens();
  tokens.themes.light.$extensions ||= {};
  tokens.themes.light.$extensions['org.topschrank.appearance'] = { fontFamily: 'url(evil)' };
  assert.throws(() => themes.importTokens(tokens), /Invalid/);
  assert.equal(themes.exportTokens(), before);
});

test('legacy global font migrates once without overwriting theme-specific choices', () => {
  const settings = Settings.create(); settings.set('layout.fonts.family', 'Poppins');
  const first = setup(settings).themes;
  assert(Object.values(first.getState().appearance).every(value => value.fontFamily === 'Poppins'));
  first.setAppearance('dark', { fontFamily: 'Inter' });
  const second = setup(settings).themes;
  assert.equal(second.getState().appearance.dark.fontFamily, 'Inter');
  assert.equal(second.getState().appearance.light.fontFamily, 'Poppins');
  second.reset('dark');
  assert.equal(setup(settings).themes.getState().appearance.dark.fontFamily, 'Manrope');
});
