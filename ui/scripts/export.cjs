/* Portable HTML/CSS/JS export. Discovery is by convention, not manifests. */
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { loadProject } = require('./export-sources.cjs');
const project = require('../export/project.cjs');
const Themes = require('../themes/themes.js');

const root = path.resolve(__dirname, '../..');
const available = () => project.available(loadProject());
const resolveComponents = requested => project.resolveComponents(loadProject(), requested);

function defaultThemeConfiguration() {
  const target = {
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
  };
  return project.themeConfiguration(Themes.create({ target }));
}

async function buildExport({ outdir = path.join(root, 'export'), components, theme = defaultThemeConfiguration() } = {}) {
  const target = path.resolve(outdir);
  if (fs.existsSync(target) && fs.readdirSync(target).length) {
    throw new Error('Output directory must be empty (existing files are never deleted): ' + target);
  }
  // Compile in memory first: a failed build never leaves a partial export.
  const result = await project.compileProject(loadProject(), components, esbuild.build, { theme });
  for (const [relative, content] of Object.entries(result.files)) {
    const file = path.join(target, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return { directory: target, components: result.components, inputs: result.inputs };
}

if (require.main === module) {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--components') options.components = (args[++i] || '').split(',').filter(Boolean);
    else if (args[i] === '--out') options.outdir = args[++i];
    else throw new Error('Usage: npm run export -- [--components card,tabs] [--out directory]');
  }
  buildExport(options).then(result => console.log('Exported ' + result.components.length + ' components to ' + result.directory))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { available, resolveComponents, defaultThemeConfiguration, buildExport };
