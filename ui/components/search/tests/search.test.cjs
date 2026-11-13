const { test } = require('node:test');
const assert = require('node:assert/strict');
const Search = require('../search.js');
const Shortcuts = require('../../shortcuts/shortcuts.js');

test('search defaults to at most five results', () => {
  assert.equal(Search.defaults.maxResults, 5);
});

test('search matches URLs, decoded anchors, titles, descriptions, keywords, groups and graphic labels', () => {
  const item = { title: 'Zażółć Łódź', href: '/docs/setup#instalacja', anchor: 'instalacja',
    description: 'Uruchomienie projektu', keywords: 'configuration', group: 'Documentation',
    graphic: { alt: 'Rocket illustration' } };
  for (const query of ['zazolc lodz', 'DOCS/SETUP', '#instalacja', 'uruchomienie', 'configuration', 'documentation', 'rocket']) {
    assert.deepEqual(Search.find([item], query), [item], query);
  }
  assert.deepEqual(Search.find([item], 'lodz rocket projektu'), [item]);
  assert.deepEqual(Search.find([item], 'lodz missing'), []);
  assert.equal(Search.normalise('#za%C5%BC%C3%B3%C5%82%C4%87'), '#zazolc');
  assert.doesNotThrow(() => Search.normalise('%broken'));
});

test('title matches rank ahead of incidental description matches and empty queries retain source order', () => {
  const entries = [
    { id: 'description', title: 'Settings', description: 'Configure the search palette' },
    { id: 'contains', title: 'Document search' },
    { id: 'prefix', title: 'Search documents' },
    { id: 'exact', title: 'Search' },
  ];
  assert.deepEqual(Search.find(entries, 'search').map(entry => entry.id), ['exact', 'prefix', 'contains', 'description']);
  assert.deepEqual(Search.find(entries, ''), entries);
});

test('source URLs reject script protocols and malformed URLs, without rejecting relative links or anchors', () => {
  const base = 'https://example.com/docs/';
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'java\nscript:x', 'https://[invalid']) {
    assert.equal(Search.safeURL(url, base), null);
  }
  assert.equal(Search.safeURL('../guide#setup', base), 'https://example.com/guide#setup');
  assert.equal(Search.safeURL('#local', base), 'https://example.com/docs/#local');
  assert.equal(Search.safeURL('mailto:hello@example.com', base), 'mailto:hello@example.com');
  assert.equal(Search.safeURL('javascript:x', base, true), null);
  assert.equal(Search.safeURL('/icon.svg', base, true), 'https://example.com/icon.svg');
});

test('searchable commands share handlers and availability with Shortcuts, independently of key bindings', () => {
  const shortcuts = Shortcuts.create();
  let enabled = true, calls = 0;
  const off = shortcuts.register({
    id: 'editor.create', label: 'Create item', group: 'Editor',
    description: 'Start a new document', keywords: ['new', 'document'], icon: 'file-plus', searchable: true,
    enabled: () => enabled, handler(event) { calls++; assert.equal(event.source, 'test'); return true; },
  });
  const action = shortcuts.get('editor.create');
  assert.equal(action.shortcut, null);
  assert.equal(action.searchable, true);
  assert.equal(action.description, 'Start a new document');
  assert.equal(action.keywords, 'new document');
  assert.equal(action.enabled, true);
  assert.equal(shortcuts.execute(action.id, { source: 'test' }), true);
  shortcuts.set(action.id, 'Mod+Shift');
  shortcuts.set(action.id, null);
  assert.equal(shortcuts.execute(action.id, { source: 'test' }), true);
  enabled = false;
  assert.equal(shortcuts.get(action.id).enabled, false);
  assert.equal(shortcuts.execute(action.id), false);
  assert.equal(calls, 2);
  off();
  assert.equal(shortcuts.execute(action.id), false);
  shortcuts.destroy();
});
