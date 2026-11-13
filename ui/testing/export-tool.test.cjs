const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mount } = require('../tools/export/export.js');
const { loadProject } = require('../scripts/export-sources.cjs');
const { available, resolveImport } = require('../export/project.cjs');
const { Document } = require('./dom-fixture.cjs');
const Field = require('../components/form/field.js');
const Buttons = require('../components/buttons/buttons.js');
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(options = {}) {
  const document = new Document();
  document.defaultView = {};
  const host = document.createElement('div');
  document.append(host);
  const downloads = [], project = loadProject();
  const view = mount(host, { Field, Buttons, loadProject: async () => project,
    createArchive: async () => ({ data: new Uint8Array([1]), components: ['buttons', 'window'] }),
    download: (data, name) => downloads.push({ data, name }), ...options });
  const button = label => host.querySelectorAll('button').find(node => node.textContent === label);
  const control = name => host.querySelectorAll('input').find(node => node.dataset.exportComponent === name);
  return { host, view, downloads, button, control };
}

test('browser source payload is generated from current sources without tooling or manifests', () => {
  const project = loadProject();
  assert.equal(available(project).length, 23);
  assert(!Object.keys(project.files).some(file => /configurator|tools\/|tests\/|manifest|workspace|storage|example\.html/.test(file)));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/export/dist/sources.json'), 'utf8')), JSON.parse(JSON.stringify(project)));
  assert.equal(resolveImport('/ui/components/card/client.js', '../../runtime/dom.js'), 'ui/runtime/dom.js');
  assert.throws(() => resolveImport('/ui/runtime/dom.js', '../../../../secret'), /escapes project/);
  assert.throws(() => resolveImport('/ui/runtime/dom.js', 'https://example.com/code.js'), /External/);
});

test('selection includes required dependencies and disables empty downloads', async () => {
  const { host, view, button, control, downloads } = setup();
  await view.ready;
  assert.equal(host.querySelectorAll('input').length, 23);
  assert.match(host.querySelector('.export-tool-summary').textContent, /23 selected/);
  button('Clear selection').emit('click');
  assert.equal(button('Download ZIP').disabled, true);
  control('window').checked = true;
  control('window').emit('change');
  assert.equal(control('buttons').checked, true);
  assert.equal(control('buttons').disabled, true);
  assert.match(host.querySelector('.export-tool-contents').textContent, /components\/window.html/);
  assert.match(host.querySelector('.export-tool-contents').textContent, /components\/buttons.html/);
  assert(!host.querySelector('.export-tool-contents').textContent.includes('card.html'));
  button('Download ZIP').emit('click');
  await tick();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, 'templify-components.zip');
  button('Select all').emit('click');
  assert.equal(host.querySelectorAll('input').filter(input => input.checked).length, 23);
  view.destroy();
  assert.equal(host.children.length, 0);
});

test('loading failures can be retried and successful retry restores controls', async () => {
  let calls = 0;
  const { host, view, button } = setup({ loadProject: async () => {
    if (!calls++) throw new Error('HTTP 503');
    return loadProject();
  } });
  await view.ready;
  assert.match(host.querySelector('.export-tool-error').textContent, /HTTP 503/);
  assert.equal(button('Download ZIP').disabled, true);
  button('Retry').emit('click');
  await tick();
  assert.equal(host.querySelector('.export-tool-error').hidden, true);
  assert.equal(host.querySelectorAll('input').length, 23);
  assert.equal(button('Download ZIP').disabled, false);
  view.destroy();
});

test('archive failures restore selection and retry; duplicate clicks do not duplicate builds', async () => {
  let finish, calls = 0;
  const { host, view, button, downloads } = setup({ createArchive: () => {
    calls++;
    return new Promise((resolve, reject) => { finish = { resolve, reject }; });
  } });
  await view.ready;
  const submit = button('Download ZIP');
  submit.emit('click'); submit.emit('click');
  assert.equal(calls, 1);
  assert.equal(submit.disabled, true);
  finish.reject(new Error('Compiler unavailable'));
  await tick();
  assert.match(host.querySelector('.export-tool-error').textContent, /Compiler unavailable/);
  assert.equal(submit.disabled, false);
  button('Retry').emit('click');
  finish.resolve({ data: new Uint8Array([1]), components: ['tabs'] });
  await tick();
  assert.equal(downloads.length, 1);
  view.destroy();
});

test('leaving the tool aborts loading and suppresses late rendering or downloads', async () => {
  let loaded, signal;
  const loading = setup({ loadProject: options => { signal = options.signal; return new Promise(resolve => { loaded = resolve; }); } });
  loading.view.destroy();
  assert.equal(signal.aborted, true);
  loaded(loadProject());
  await loading.view.ready;
  assert.equal(loading.host.children.length, 0);
  let finish;
  const exporting = setup({ createArchive: () => new Promise(resolve => { finish = resolve; }) });
  await exporting.view.ready;
  exporting.button('Download ZIP').emit('click');
  exporting.view.destroy();
  finish({ data: new Uint8Array([1]), components: ['tabs'] });
  await tick();
  assert.equal(exporting.downloads.length, 0);
  assert.equal(exporting.host.children.length, 0);
});
