const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Themes = require('../themes/themes.js');
const Corners = require('../corners/corners.js');
const Tool = require('../tools/corners/corners.js');
const Buttons = require('../components/buttons/buttons.js');
const Settings = require('../../storage/settings.js');
const { Document } = require('./dom-fixture.cjs');

function create(settings) {
  const document = new Document();
  const target = document.createElement('html');
  return { document, target, themes: Themes.create({ target, settings }) };
}

test('corner profiles and group assignments are theme-owned, independent and immutable in snapshots', () => {
  const { themes, target } = create();
  assert.deepEqual(themes.getState().corners.light, Corners.defaults);
  assert.equal(target.style.get('--ds-radius-none'), '0px');
  assert.equal(target.style.get('--ds-radius-pill'), '9999px');
  themes.setCorners('light', { profiles: { large: 23 }, assignments: { controls: 'small', badges: 'pill' } });
  assert.equal(target.style.get('--ds-radius-large'), '23px');
  assert.equal(target.style.get('--ds-radius-controls'), 'var(--ds-radius-small)');
  assert.equal(target.style.get('--ds-radius-badges'), 'var(--ds-radius-pill)');
  themes.select('dark');
  assert.deepEqual(themes.getState().corners.dark, Corners.defaults);
  assert.equal(target.style.get('--ds-radius-large'), '12px');
  assert.equal(target.style.get('--ds-radius-controls'), 'var(--ds-radius-large)');
  themes.select('light');
  assert.equal(target.style.get('--ds-radius-large'), '23px');
  const state = themes.getState();
  state.corners.light.profiles.large = 99;
  state.corners.light.assignments.controls = 'none';
  assert.equal(themes.getState().corners.light.profiles.large, 23);
  assert.equal(themes.getState().corners.light.assignments.controls, 'small');
});

test('corners survive copying, persistence, token imports and complete CSS export without leaking into other themes', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) };
  const { themes } = create(Settings.create({ storage }));
  themes.setCorners('light', { profiles: { small: 0, xlarge: 64 }, assignments: { windows: 'small', buttons: 'pill' } });
  const copy = themes.add('Corner copy');
  assert.deepEqual(themes.getState().corners[copy], themes.getState().corners.light);
  themes.setCorners(copy, { profiles: { small: 7 } });
  assert.equal(themes.getState().corners.light.profiles.small, 0);
  const restored = create(Settings.create({ storage })).themes;
  assert.deepEqual(restored.getState().corners, themes.getState().corners);
  const imported = create().themes;
  imported.importTokens(JSON.parse(themes.exportTokens()));
  assert.deepEqual(imported.getState().corners, themes.getState().corners);
  const css = imported.exportCSS();
  const rules = id => [...css.matchAll(new RegExp(`\\[data-ds-theme="${id}"\\]\\s*\\{([^}]+)\\}`, 'g'))].at(-1)[1];
  assert.match(rules('light'), /--ds-radius-small: 0px;/);
  assert.match(rules(copy), /--ds-radius-small: 7px;/);
  assert.match(rules(copy), /--ds-radius-buttons: var\(--ds-radius-pill\);/);
  assert.match(rules('dark'), /--ds-radius-small: 4px;/);
  assert.match(rules('dark'), /--ds-radius-buttons: var\(--ds-radius-large\);/);
  themes.remove(copy);
  assert(!Object.hasOwn(themes.getState().corners, copy));
});

test('corner resets affect one profile, one assignment or this section only', () => {
  const { themes } = create();
  themes.setAppearance('light', { iconSize: 28 });
  themes.setShadow('light', 'soft', { blur: 40 });
  themes.setCorners('light', { profiles: { large: 31, small: 2 }, assignments: { controls: 'small', buttons: 'none' } });
  themes.setCorners('dark', { profiles: { large: 1 } });
  themes.resetCorners('light', 'assignments', 'controls');
  assert.equal(themes.getState().corners.light.assignments.controls, 'large');
  assert.equal(themes.getState().corners.light.profiles.large, 31);
  themes.resetCorners('light', 'profiles', 'large');
  assert.equal(themes.getState().corners.light.profiles.large, 12);
  assert.equal(themes.getState().corners.light.assignments.buttons, 'none');
  assert.equal(themes.resetCorners('light', 'profiles', 'none'), false);
  assert.equal(themes.resetCorners('light', 'profiles', 'pill'), false);
  assert.equal(themes.resetCorners('missing'), false);
  assert.equal(themes.resetCorners('light', 'invalid', 'large'), false);
  themes.resetCorners('light');
  assert.deepEqual(themes.getState().corners.light, Corners.defaults);
  assert.equal(themes.getState().corners.dark.profiles.large, 1);
  assert.equal(themes.getState().appearance.light.iconSize, 28);
  assert.equal(themes.getState().shadows.light.soft.blur, 40);
  themes.reset('dark');
  assert.deepEqual(themes.getState().corners.dark, Corners.defaults);
});

test('invalid corner edits and imports are rejected atomically, including CSS injection and fixed profile changes', () => {
  const { themes } = create();
  const before = themes.exportTokens();
  const invalid = [
    null, [], 'x', { unknown: {} }, { profiles: null }, { assignments: [] },
    { profiles: { none: 4 } }, { profiles: { pill: 0 } }, { profiles: { missing: 2 } },
    ...[-1, 65, 1.5, NaN, Infinity, '8', '8px;color:red', null].map(large => ({ profiles: { large } })),
    { profiles: { toString: 2 } },
    { assignments: { buttons: 'unknown' } }, { assignments: { missing: 'large' } },
    { assignments: { buttons: ['large'] } }, { assignments: { buttons: 'large);color:red' } },
  ];
  for (const values of invalid) {
    assert.throws(() => themes.setCorners('light', values));
    assert.equal(themes.exportTokens(), before);
    const tokens = themes.getTokens();
    tokens.themes.light.$extensions ||= {};
    tokens.themes.light.$extensions[Corners.extension] = values;
    assert.throws(() => themes.importTokens(tokens));
    assert.equal(themes.exportTokens(), before);
  }
  assert.throws(() => themes.setCorners('unknown', { profiles: { large: 5 } }));
  assert.equal(themes.exportTokens(), before);
});

test('legacy tokens use corner defaults and static CSS agrees with the model for every theme', () => {
  const { themes } = create();
  const tokens = themes.getTokens();
  for (const group of Object.values(tokens.themes)) {
    if (group.$extensions) delete group.$extensions[Corners.extension];
  }
  themes.importTokens(tokens);
  for (const value of Object.values(themes.getState().corners)) assert.deepEqual(value, Corners.defaults);
  const css = fs.readFileSync(path.join(__dirname, '../defaults.css'), 'utf8');
  const block = /\/\* Shared corner scale[\s\S]*?\{([^}]+)\}/.exec(css)[1];
  for (const [name, value] of Corners.declarations(Corners.defaults)) {
    assert(block.includes(`${name}: ${value};`), name);
  }
  assert.match(css, /:root,\s*\[data-ds-theme\],\s*\[data-ds-theme-base\]/);
});

test('corner editor reuses shared controls, synchronises themes and cleans up listeners and owned DOM', () => {
  const { document, themes } = create();
  const host = document.createElement('div');
  const fields = [];
  let syncs = 0, destroyed = 0;
  const Field = {
    mount(holder, options) {
      const element = document.createElement('div');
      const control = document.createElement('input');
      const output = document.createElement('output');
      element.append(control, output);
      holder.append(element);
      const view = {
        element, control, options,
        sync() { syncs++; },
        destroy() { destroyed++; element.remove(); },
      };
      fields.push(view);
      return view;
    },
  };
  const view = Tool.mount(host, { themes, Field, Buttons, Corners });
  assert.equal(fields.length, 12); // Four scale controls, seven assignments, one live input.
  const large = fields.find(field => field.options.label === 'Large radius');
  const controls = fields.find(field => field.options.label === 'Form controls profile');
  large.options.onChange({ value: '20' });
  controls.options.onChange({ value: 'small' });
  assert.equal(themes.getState().corners.light.profiles.large, 20);
  assert.equal(controls.control.value, 'small');
  themes.select('dark');
  assert.equal(large.control.value, '12');
  assert.equal(controls.control.value, 'large');
  large.options.onChange({ value: '30' });
  const reset = host.querySelectorAll('button').find(button => button.textContent === 'Reset all corners');
  reset.emit('click');
  assert.equal(large.control.value, '12');
  assert.equal(themes.getState().corners.light.profiles.large, 20);
  view.destroy();
  assert.equal(destroyed, fields.length);
  assert.equal(host.children.length, 0);
  const before = syncs;
  themes.select('light');
  assert.equal(syncs, before);
  reset.emit('click');
  assert.equal(themes.getState().corners.light.profiles.large, 20);
});
