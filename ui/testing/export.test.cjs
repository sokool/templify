const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { available, resolveComponents, buildExport } = require('../scripts/export.cjs');
const Themes = require('../themes/themes.js');
const { themeConfiguration } = require('../export/project.cjs');
const { Document } = require('./dom-fixture.cjs');

test('component discovery and HTML composition replace manifests', () => {
  assert.equal(available().length, 23);
  assert.deepEqual(resolveComponents(['theme-switcher']), ['theme-switcher']);
  assert.deepEqual(resolveComponents(['kanban-board']), ['card', 'kanban-board']);
  assert.deepEqual(resolveComponents(['form']), ['buttons', 'form']);
  assert.deepEqual(resolveComponents(['navigation']), ['navigation']);
  for (const name of ['tooltip', 'window', 'shortcuts']) assert(resolveComponents([name]).includes('buttons'));
  assert.throws(() => resolveComponents(['../workspace']), /Unknown component/);
});

test('export bundles dependencies once and copies documented HTML verbatim', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-export-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = await buildExport({ outdir: directory, components: ['tabs', 'autocomplete', 'tabs'] });
  assert.deepEqual(result.components, ['autocomplete', 'tabs']);
  const files = fs.readdirSync(directory);
  assert(files.includes('index.html') && files.includes('ui.css') && files.includes('ui.js') && files.includes('htmx.min.js'));
  for (const name of result.components) assert.equal(
    fs.readFileSync(path.join(directory, 'components', name + '.html'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '../components', name, name + '.html'), 'utf8'));
  assert.equal(result.inputs.filter(file => file === 'ui/defaults.css').length, 1);
  assert.equal(result.inputs.filter(file => file === 'ui/primitives.css').length, 1);
  assert.equal(result.inputs.filter(file => file === 'ui/assets/icons/icons.css').length, 1);
  assert(result.inputs.includes('ui/components/form/form.css'));
  assert(!result.inputs.some(file => /configurator|workspace|storage|tools\//.test(file)));
  assert(!result.inputs.some(file => file.includes('kanban-board')));
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  for (const name of result.components) assert(html.includes('id="example-' + name + '"'));
  assert(!html.includes('id="example-card"'));
  await assert.rejects(buildExport({ outdir: directory }), /must be empty/);
});

test('export carries every configured theme and starts with the active complete profile', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-export-themes-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const document = new Document(), target = document.createElement('html');
  document.append(target);
  const themes = Themes.create({ target });
  const ocean = themes.add('Ocean UI', 'dark');
  themes.setColour(ocean, 'panel', '#102030');
  themes.setAppearance(ocean, { fontFamily: 'Inter', iconSize: 28, iconStroke: 2.5 });
  themes.setShadow(ocean, 'soft', { blur: 31 });
  themes.setCorners(ocean, { profiles: { large: 21 }, assignments: { buttons: 'none' } });
  themes.setComponentSettings(ocean, 'card', {
    css: { '--ds-card-background': 'var(--ds-colour-panel)' },
  });
  await buildExport({
    outdir: directory,
    components: ['theme-switcher', 'card'],
    theme: themeConfiguration(themes),
  });
  const css = fs.readFileSync(path.join(directory, 'ui.css'), 'utf8');
  assert.match(css, new RegExp(`data-ds-theme="${ocean}"`));
  assert.match(css, /#102030/i);
  assert.match(css, /--ds-font-family: "Inter", system-ui, sans-serif/);
  assert.match(css, /--ds-icon-size: 28px/);
  assert.match(css, /--ds-icon-stroke: 2.5/);
  assert.match(css, /--ds-shadow-soft:[^;]*31px/);
  assert.match(css, /--ds-radius-large: 21px;/);
  assert.match(css, /--ds-radius-buttons: var\(--ds-radius-none\);/);
  assert.match(css, /--ds-card-background: var\(--ds-colour-panel\)/);
  assert.match(css, /fonts\.googleapis\.com\/css2\?.*family=Inter/);
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`data-ds-theme="${ocean}"`));
  assert.match(html, /data-ds-theme-base="dark"/);
});

test('full export contains every component, local HTMX and licenses', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-export-all-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = await buildExport({ outdir: directory });
  assert.equal(result.components.length, 23);
  assert(!result.inputs.some(file => /configurator|workspace|storage|tools\//.test(file)));
  assert.equal(fs.readdirSync(path.join(directory, 'components')).length, 23);
  const index = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  for (const name of result.components) {
    const source = fs.readFileSync(path.join(__dirname, '../components', name, name + '.html'), 'utf8');
    assert.equal(fs.readFileSync(path.join(directory, 'components', name + '.html'), 'utf8'), source);
    assert(index.includes(source), name + ' documentation must also be copied into index.html');
  }
  assert(fs.statSync(path.join(directory, 'licenses/htmx.txt')).size > 0);
  assert(fs.statSync(path.join(directory, 'licenses/icons.txt')).size > 0);
  assert(fs.readFileSync(path.join(directory, 'htmx.min.js'), 'utf8').includes('2.0.8'));
});
