const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadProject } = require('../../ui/scripts/export-sources.cjs');
const { compileProject } = require('../../ui/export/project.cjs');

test('Window playground is absent from source payloads and compiled exports', async () => {
  const project = loadProject();
  assert(!Object.keys(project.files).some(file => file.startsWith('workspace/') || file.includes('window-demo')));
  const result = await compileProject(project, ['window'], require('esbuild').build);
  assert.deepEqual(result.components, ['buttons', 'window']);
  assert(!result.inputs.some(file => /workspace|window-demo/.test(file)));
  assert.equal(result.files['components/window.html'], project.files['ui/components/window/window.html']);
  for (const name of ['index.html', 'ui.js', 'ui.css']) {
    const contents = typeof result.files[name] === 'string' ? result.files[name] : new TextDecoder().decode(result.files[name]);
    assert(!/window-demo|ExampleWindowDemo|Close demo|Event history/.test(contents), name);
  }
});
