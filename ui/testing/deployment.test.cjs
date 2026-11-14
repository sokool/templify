const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Docker includes the root entry and its asset directories in the build context', () => {
  const dockerfile = read('Dockerfile'), ignore = read('.dockerignore').split(/\r?\n/);
  assert(ignore.includes('!index.html'));
  assert.match(dockerfile, /COPY[^\n]* index\.html \/usr\/share\/nginx\/html\/index\.html/);
  for (const file of ['favicon.ico', 'favicon.svg']) assert(ignore.includes('!' + file));
  assert.match(dockerfile, /COPY[^\n]* favicon\.ico favicon\.svg \/usr\/share\/nginx\/html\//);
  for (const directory of ['workspace', 'storage', 'ui']) {
    assert(ignore.includes('!' + directory + '/'));
    assert(ignore.includes('!' + directory + '/**'));
    assert(dockerfile.includes(directory + '/ /usr/share/nginx/html/' + directory + '/'));
  }
  const html = read('index.html');
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.match(asset, /^\.\/(?:(?:workspace|storage|ui)\/|favicon\.(?:ico|svg)$)/);
    assert(fs.existsSync(path.resolve(root, asset)), asset);
  }
});

test('Nginx serves the root index directly without the former application redirect', () => {
  const config = read('nginx/default.conf');
  assert.match(config, /listen 8080;/);
  assert.match(config, /root \/usr\/share\/nginx\/html;/);
  assert.match(config, /index index\.html;/);
  assert.match(config, /try_files \$uri \$uri\/ =404;/);
  assert(!/return 30[1278]/.test(config));
});
