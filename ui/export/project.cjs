/* Shared export rules for the Node CLI and the in-browser tool. No filesystem/DOM. */
function available(project) {
  return Object.keys(project.files).flatMap(file => {
    const match = /^ui\/components\/([a-z][a-z0-9-]*)\/([^/]+)\.html$/.exec(file);
    return match && match[1] === match[2] ? [match[1]] : [];
  }).sort();
}

function read(project, file) {
  if (!Object.hasOwn(project.files, file)) throw new Error('Missing export source: ' + file);
  return project.files[file];
}

function resolveComponents(project, requested = available(project)) {
  const known = new Set(available(project)), selected = new Set();
  function visit(name) {
    if (!known.has(name)) throw new Error('Unknown component: ' + name);
    if (selected.has(name)) return;
    selected.add(name);
    const html = read(project, `ui/components/${name}/${name}.html`);
    for (const [, dependency] of html.matchAll(/\bdata-ui="([a-z-]+)"/g)) visit(dependency);
  }
  requested.forEach(visit);
  return [...selected].sort();
}

function indexHTML(project, names) {
  const sections = names.map(name => `<section class="export-example" id="example-${name}"><h2>${name}</h2>\n` +
    read(project, `ui/components/${name}/${name}.html`) + '\n</section>').join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Templify — exported components</title><link rel="stylesheet" href="./ui.css">
<style>body{margin:0;padding:32px;background:var(--ds-colour-soft);color:var(--ds-colour-text);font:14px/1.5 var(--ds-font-family,system-ui)}main{max-width:1100px;margin:auto}.export-example{margin-block:32px;padding:24px;border:1px solid var(--ds-colour-border);border-radius:12px}.export-example>h2{margin-top:0}a{color:inherit}nav.export-index{display:flex;gap:12px;flex-wrap:wrap}</style>
<script src="./htmx.min.js" defer></script><script src="./ui.js" defer></script></head>
<body><main><h1>Templify components</h1><p>Server-rendered HTML enhanced by JavaScript. HTMX endpoints are supplied by your application.</p>
<nav class="export-index" aria-label="Components">${names.map(name => `<a href="#example-${name}">${name}</a>`).join(' ')}</nav>
${sections}</main></body></html>\n`;
}

function entrySource(project, names) {
  const source = [
    'import "/ui/defaults.css";', 'import "/ui/primitives.css";',
    'import * as UI from "/ui/runtime/runtime.js";',
  ];
  names.forEach((name, index) => {
    const base = `ui/components/${name}`;
    source.push(`import "/${base}/${name}.css";`);
    if (Object.hasOwn(project.files, base + '/client.js')) {
      source.push(`import { init as component${index} } from "/${base}/client.js";`);
      source.push(`UI.register(${JSON.stringify(name)}, component${index});`);
    }
  });
  source.push('globalThis.Templify = Object.freeze({init:UI.init, destroy:UI.destroy, get:UI.get}); UI.start();');
  return source.join('\n');
}

function resolveImport(importer, reference) {
  if (!reference.startsWith('/') && !reference.startsWith('.')) throw new Error('External export dependency: ' + reference);
  const parts = (reference.startsWith('/') ? reference : importer.slice(0, importer.lastIndexOf('/') + 1) + reference).split('/');
  const result = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!result.length) throw new Error('Export import escapes project: ' + reference);
      result.pop();
    } else result.push(part);
  }
  return result.join('/');
}

async function compileProject(project, requested, build) {
  const names = resolveComponents(project, requested);
  if (!names.length) throw new Error('Select at least one component.');
  const bundle = await build({
    stdin: { contents: entrySource(project, names), sourcefile: 'export-entry.js', resolveDir: '/' },
    absWorkingDir: '/',
    bundle: true, outfile: '/ui.js', write: false,
    platform: 'browser', format: 'iife', target: ['es2022'], legalComments: 'eof', metafile: true,
    plugins: [{ name: 'export-sources', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'url-token' && /^(?:data:|#)/.test(args.path)) return { path: args.path, external: true };
        const file = resolveImport(args.importer, args.path);
        read(project, file);
        return { path: '/' + file, namespace: 'sources' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'sources' }, args => ({
        contents: read(project, args.path.slice(1)), loader: args.path.endsWith('.css') ? 'css' : 'js',
      }));
    } }],
  });
  const files = Object.fromEntries(bundle.outputFiles.map(file => [file.path.slice(file.path.lastIndexOf('/') + 1), file.contents]));
  files['index.html'] = indexHTML(project, names);
  for (const file of ['htmx.min.js', 'licenses/htmx.txt', 'licenses/templify.txt']) files[file] = read(project, file);
  names.forEach(name => { files[`components/${name}.html`] = read(project, `ui/components/${name}/${name}.html`); });
  return { files, components: names, inputs: Object.keys(bundle.metafile.inputs).map(file => file.replace(/^sources:\//, '')) };
}

module.exports = { available, resolveComponents, resolveImport, compileProject };
