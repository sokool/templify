/* Build local browser-only export assets. No CDN and no export backend. */
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { loadProject } = require('./export-sources.cjs');
const root = path.resolve(__dirname, '../..');

async function buildExportTool(outdir = path.join(root, 'ui/tools/export/dist')) {
  const target = path.resolve(outdir);
  fs.mkdirSync(target, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(root, 'ui/tools/export/browser.js')],
    outfile: path.join(target, 'export.js'), bundle: true, platform: 'browser',
    format: 'iife', globalName: 'DesignSystemExportTool', target: ['es2022'], legalComments: 'eof',
  });
  fs.writeFileSync(path.join(target, 'sources.json'), JSON.stringify(loadProject()));
  const wasm = path.dirname(require.resolve('esbuild-wasm/package.json'));
  fs.copyFileSync(path.join(wasm, 'esbuild.wasm'), path.join(target, 'esbuild.wasm'));
  const fflate = path.resolve(path.dirname(require.resolve('fflate')), '..');
  fs.writeFileSync(path.join(target, 'licenses.txt'), ['esbuild-wasm\n' + fs.readFileSync(path.join(wasm, 'LICENSE.md'), 'utf8'),
    'fflate\n' + fs.readFileSync(path.join(fflate, 'LICENSE'), 'utf8')].join('\n\n'));
  return target;
}

if (require.main === module) buildExportTool().then(directory => console.log('Built browser export tool: ' + directory))
  .catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildExportTool };
