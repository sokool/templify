const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('generic tools have one implementation under tools, with no obsolete Palette copies', () => {
  assert.equal(typeof require('../tools/palette-picker/palette-picker.js').mount, 'function');
  assert.equal(typeof require('../tools/shadows/shadows.js').mount, 'function');
  assert.equal(typeof require('../tools/contrast-checker/contrast-checker.js').mount, 'function');
  for (const file of [
    'palette/picker.js',
    'palette/picker.css',
    'palette/shadows-tool.js',
    'palette/shadows-tool.css',
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
  const html = fs.readFileSync(path.join(root, '../app/index.html'), 'utf8');
  for (const asset of [
    'tools/palette-picker/palette-picker.js',
    'tools/palette-picker/palette-picker.css',
    'tools/shadows/shadows.js',
    'tools/shadows/shadows.css',
    'tools/contrast-checker/contrast-checker.js',
    'tools/contrast-checker/contrast-checker.css',
    'tools/shared/tools.css',
  ]) {
    assert.equal(html.split('../ui/' + asset).length - 1, 1, asset);
  }
  for (const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)) {
    assert(fs.existsSync(path.resolve(root, '../app', match[1])), match[1]);
  }
});

test('Tools has separate submenu routes and generic tools use shared compact controls', () => {
  const workspace = fs.readFileSync(path.join(root, '../app/workspace/workspace.js'), 'utf8');
  assert.match(workspace, /group:\s*'tools'/);
  for (const anchor of [
    'topschrank.tools',
    'topschrank.tools.palettepicker',
    'topschrank.tools.shadows',
    'topschrank.tools.contrastchecker',
  ]) {
    assert(workspace.includes(anchor));
  }
  assert(workspace.includes('route.path[0]'));
  const compact = fs.readFileSync(path.join(root, 'tools/shared/tools.css'), 'utf8');
  assert.match(compact, /--ds-form-field-height:\s*34px/);
  assert.match(compact, /\.ds-tool\s+\.ds-field-control/);
  assert.match(
    compact,
    /\.ds-field-control:not\(\[type='checkbox'\], \[type='radio'\], \[type='range'\]\)/,
  );
  const card = fs.readFileSync(path.join(root, 'components/card/configurator/configurator.js'), 'utf8');
  const shadows = fs.readFileSync(path.join(root, 'tools/shadows/shadows.js'), 'utf8');
  assert(card.includes("classList.add('ds-tool')"));
  assert(shadows.includes("classList.add('ds-tool')"));
  const palette = fs.readFileSync(path.join(root, 'tools/palette/tool.js'), 'utf8');
  assert(!/DesignSystemShadowsTool|contrastInput|paintContrast|palette-contrast/.test(palette));
});
