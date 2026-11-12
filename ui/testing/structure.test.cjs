const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../..');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const sources = [...files(path.join(root, 'ui')), ...files(path.join(root, 'workspace')),
  ...files(path.join(root, 'storage')),
  path.join(root, 'index.html')];

test('HTML assets, CSS URLs and static relative requires resolve after relocation', () => {
  for (const file of sources) {
    if (!/\.(html|css|js|cjs)$/.test(file) || file.includes('/vendor/')) continue;
    const source = fs.readFileSync(file, 'utf8');
    const pattern = file.endsWith('.html') ? /(?:src|href)=["']([^"']+)["']/g :
      file.endsWith('.css') ? /url\(["']?([^\s"')]+)["']?\)/g :
      /require\(["'](\.[^"']+)["']\)/g;
    for (const [, reference] of source.matchAll(pattern)) {
      if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
      const relative = reference.split(/[?#]/)[0];
      if (!relative) continue;
      assert(fs.existsSync(path.resolve(path.dirname(file), relative)),
        path.relative(root, file) + ' → ' + reference);
    }
  }
});

test('component exports contain only existing runtime files, never configurators or host tools', () => {
  const { available } = require('../scripts/export.cjs');
  for (const name of available()) {
    const base = path.join(root, 'ui/components', name);
    assert(!fs.existsSync(path.join(base, 'manifest.json')));
    for (const extension of ['html','css','js']) assert(fs.existsSync(path.join(base, name + '.' + extension)));
    const runtime = fs.readFileSync(path.join(base, name + '.js'), 'utf8');
    assert(!/require\(["'][^"']*(?:configurator|tools|workspace|storage)\//.test(runtime));
  }
});

test('component HTML starts with English documentation sections in the standard order', () => {
  const { available } = require('../scripts/export.cjs');
  for (const name of available()) {
    const html = fs.readFileSync(path.join(root, 'ui/components', name, name + '.html'), 'utf8');
    const comment = html.match(/^<!--([\s\S]*?)-->/);
    assert(comment, name + ' must start with a documentation comment');
    assert.match(comment[1], /^\s*Component: [^\n]+\nPurpose: [\s\S]+?\nElements: [\s\S]+?\nJavaScript behavior: [\s\S]+$/, name);
  }
});

test('generators resolve their inputs and reproduce checked-in bundles exactly', () => {
  for (const name of ['build-colour-roles.cjs', 'build-defaults.cjs']) {
    const file = path.join(root, 'ui/scripts', name);
    const localRequire = createRequire(file);
    let writes = 0;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      __dirname: path.dirname(file),
      require(id) {
        if (id !== 'node:fs') return localRequire(id);
        return { ...fs, writeFileSync(target, data) {
          writes++;
          assert.equal(fs.readFileSync(target, 'utf8'), data, name);
        } };
      },
    }, { filename: file });
    assert.equal(writes, 1);
  }
});

test('Theme and Tools navigation reflect user tasks rather than implementation directories', () => {
  const source = fs.readFileSync(path.join(root, 'workspace/workspace.js'), 'utf8');
  const declaration = source.match(/const navigation = (\[[\s\S]*?\n  \]);/)[1];
  const navigation = vm.runInNewContext(declaration);
  const pages = (group) => Array.from(navigation.find((entry) => entry.id === group).children,
    (entry) => entry.id);
  assert.deepEqual(pages('theme'), ['palette', 'fonts', 'icons', 'shadows']);
  assert.deepEqual(pages('tools'), ['contrast-checker', 'palette-picker', 'export']);
  for (const anchor of ['topschrank.palette', 'topschrank.fonts', 'topschrank.iconsandglyphs',
    'topschrank.tools.shadows']) assert(source.includes(anchor));
});
