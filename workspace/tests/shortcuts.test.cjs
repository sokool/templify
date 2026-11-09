const { test } = require('node:test');
const assert = require('node:assert/strict');
const { connect } = require('../shortcuts.js');
const Shortcuts = require('../../ui/components/shortcuts/shortcuts.js');
const Themes = require('../../ui/themes/themes.js');
const { Document } = require('../../ui/testing/dom-fixture.cjs');

test('Shortcuts editor bindings persist through the host adapter, not the component', () => {
  const themes = Themes.create({ target: new Document().createElement('html') });
  const shortcuts = Shortcuts.create();
  shortcuts.register({ id: 'save', defaultShortcut: 'Mod+S', handler: () => true });
  const connection = connect({ themes, shortcuts });
  shortcuts.set('save', 'Alt+S');
  assert.equal(themes.getComponentSettings('light', 'shortcuts').bindings.save, 'Alt+S');
  themes.select('dark');
  assert.equal(shortcuts.get('save').shortcut, 'Mod+S');
  shortcuts.set('save', null);
  themes.select('light');
  assert.equal(shortcuts.get('save').shortcut, 'Alt+S');
  connection.destroy();
  themes.select('dark');
  assert.equal(shortcuts.get('save').shortcut, 'Alt+S');
  shortcuts.destroy();
});
