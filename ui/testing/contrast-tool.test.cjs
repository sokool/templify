const { test } = require('node:test');
const assert = require('node:assert/strict');
const Tool = require('../tools/contrast-checker/contrast-checker.js');
const PalettePicker = require('../tools/palette-picker/palette-picker.js');
const Generator = require('../tools/palette/generator.js');
const Themes = require('../themes/themes.js');
const Buttons = require('../components/buttons/buttons.js');
const { Document } = require('./dom-fixture.cjs');

test('contrast tool reuses pickers/calculator, saves per theme, resets only its pair and cleans up', () => {
  const document = new Document();
  const host = document.createElement('div');
  const themes = Themes.create({ target: document.createElement('html') });
  const choices = [];
  const Picker = {
    ...PalettePicker,
    mount(holder, options) {
      choices.push(options);
      return { update() {}, destroy() {} };
    },
  };
  const view = Tool.mount(host, {
    themes,
    Picker,
    Buttons,
    tokens: Themes.tokens,
    contrast: Generator.contrast,
  });
  assert.equal(choices.length, 2);
  choices[0].onChange({ kind: 'custom', value: '#000000' });
  choices[1].onChange({ kind: 'custom', value: '#FFFFFF' });
  assert.match(host.querySelector('.contrast-tool-result').textContent, /^21\.00:1/);
  const light = themes.getComponentSettings('light', 'contrast-checker-tool');
  themes.select('dark');
  assert.equal(themes.getComponentSettings('dark', 'contrast-checker-tool'), null);
  choices[0].onChange({ kind: 'custom', value: '#FFFFFF' });
  choices[1].onChange({ kind: 'custom', value: '#FFFFFF' });
  assert.match(host.querySelector('.contrast-tool-result').textContent, /^1\.00:1/);
  themes.setShadow('dark', 'soft', { blur: 30 });
  host.querySelector('button').emit('click');
  assert.equal(
    themes.getComponentSettings('dark', 'contrast-checker-tool').foreground.role,
    'text',
  );
  assert.equal(themes.getState().shadows.dark.soft.blur, 30);
  assert.deepEqual(themes.getComponentSettings('light', 'contrast-checker-tool'), light);
  view.destroy();
  themes.select('light');
  assert.equal(host.children.length, 0);
});
