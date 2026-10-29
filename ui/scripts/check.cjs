/* Run every UI and host test without shell-specific glob expansion. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
function tests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return tests(file);
    return entry.name.endsWith('.test.cjs') ? [file] : [];
  });
}
const result = spawnSync(process.execPath, ['--test', ...tests(path.join(root, 'ui')),
  ...tests(path.join(root, 'app'))], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
