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
const sources = [...files(path.join(root, 'ui')), ...files(path.join(root, 'app')),
  path.join(root, 'top-schrank-ui.html')];

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
  for (const file of sources.filter((file) => /\/components\/[^/]+\/manifest\.json$/.test(file))) {
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    const base = path.dirname(file);
    for (const entry of [...manifest.runtimeFiles, ...manifest.exportFiles]) {
      const target = path.resolve(base, entry);
      assert(fs.existsSync(target), file + ' → ' + entry);
      assert(!/\/(?:configurator|tools|app)\//.test(target), entry);
      if (entry.endsWith('.js')) {
        const source = fs.readFileSync(target, 'utf8');
        assert(!/require\(["'][^"']*(?:configurator|tools|app)\//.test(source), target);
      }
    }
    if (fs.existsSync(path.join(base, 'configurator'))) assert(manifest.tool, file);
    if (manifest.tool) {
      assert.equal(manifest.tool.export, false);
      assert(manifest.tool.entry.startsWith('configurator/'));
      assert(fs.existsSync(path.resolve(base, manifest.tool.entry)));
    }
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
  const source = fs.readFileSync(path.join(root, 'app/workspace/workspace.js'), 'utf8');
  const declaration = source.match(/const navigation = (\[[\s\S]*?\n  \]);/)[1];
  const navigation = vm.runInNewContext(declaration);
  const pages = (group) => Array.from(navigation.find((entry) => entry.group === group).pages,
    (entry) => entry[0]);
  assert.deepEqual(pages('theme'), ['palette', 'fonts', 'icons', 'shadows']);
  assert.deepEqual(pages('tools'), ['contrast-checker', 'palette-picker']);
  for (const anchor of ['topschrank.palette', 'topschrank.fonts', 'topschrank.iconsandglyphs',
    'topschrank.tools.shadows']) assert(source.includes(anchor));
});
