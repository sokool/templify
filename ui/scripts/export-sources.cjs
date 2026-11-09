/* Snapshot runtime sources by convention. No hand-maintained component registry. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function loadProject() {
  const files = Object.create(null);
  const add = (name, file = path.join(root, name)) => { files[name] = fs.readFileSync(file, 'utf8'); };
  for (const file of ['ui/defaults.css', 'ui/primitives.css']) add(file);
  for (const directory of ['ui/runtime', ...fs.readdirSync(path.join(root, 'ui/components'))
    .filter(name => fs.existsSync(path.join(root, 'ui/components', name, name + '.html')))
    .map(name => 'ui/components/' + name)]) {
    for (const file of fs.readdirSync(path.join(root, directory)).sort()) {
      if (file.endsWith('.html') && file !== path.basename(directory) + '.html') continue;
      if (/\.(js|css|html)$/.test(file) && fs.statSync(path.join(root, directory, file)).isFile()) add(directory + '/' + file);
    }
  }
  const htmx = path.dirname(require.resolve('htmx.org/package.json'));
  add('htmx.min.js', path.join(htmx, 'dist/htmx.min.js'));
  add('licenses/htmx.txt', path.join(htmx, 'LICENSE'));
  add('licenses/templify.txt', path.join(root, 'LICENSE'));
  return { files };
}

module.exports = { loadProject };
