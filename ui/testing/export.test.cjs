const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { available, resolveComponents, buildExport } = require('../scripts/export.cjs');

test('component discovery and HTML composition replace manifests', () => {
  assert.equal(available().length, 22);
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
  assert(result.inputs.includes('ui/components/form/form.css'));
  assert(!result.inputs.some(file => /configurator|workspace|storage|tools\//.test(file)));
  assert(!result.inputs.some(file => file.includes('kanban-board')));
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  for (const name of result.components) assert(html.includes('id="example-' + name + '"'));
  assert(!html.includes('id="example-card"'));
  await assert.rejects(buildExport({ outdir: directory }), /must be empty/);
});

test('full export contains every component, local HTMX and licenses', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'templify-export-all-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = await buildExport({ outdir: directory });
  assert.equal(result.components.length, 22);
  assert(!result.inputs.some(file => /configurator|workspace|storage|tools\//.test(file)));
  assert.equal(fs.readdirSync(path.join(directory, 'components')).length, 22);
  assert(fs.statSync(path.join(directory, 'licenses/htmx.txt')).size > 0);
  assert(fs.readFileSync(path.join(directory, 'htmx.min.js'), 'utf8').includes('2.0.8'));
});
