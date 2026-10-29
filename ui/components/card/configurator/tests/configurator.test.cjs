const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Tool = require('../configurator.js');
const Card = require('../../card.js');
const Picker = require('../../../../tools/palette-picker/palette-picker.js');
const Themes = require('../../../../themes/themes.js');
const Settings = require('../../../../../app/storage/settings.js');
const Field = require('../../../form/field.js');
const Button = require('../../../buttons/buttons.js');
const { createFixture } = require('../../../../testing/kanban-fixture.cjs');

function setup(t) {
  const fixture = createFixture();
  const { document } = fixture;
  const createElement = document.createElement.bind(document);
  document.createElement = (tag) => {
    const node = createElement(tag);
    Object.defineProperty(node, 'childNodes', { get: () => node.children });
    return node;
  };
  document.documentElement = document.createElement('html');
  document.append(document.documentElement);
  document.documentElement.append(document.body);
  const previous = globalThis.DesignSystemThemes;
  globalThis.DesignSystemThemes = Themes;
  t.after(() => {
    if (previous) globalThis.DesignSystemThemes = previous;
    else delete globalThis.DesignSystemThemes;
  });

  // Native select enhancement is exercised in browser checks, not this tiny DOM.
  const testField = {
    mount(host, options) {
      if (options.kind !== 'select') return Field.mount(host, options);
      const element = document.createElement('div');
      element.className = 'ds-field';
      const control = document.createElement('select');
      control.value = options.value;
      const change = () => options.onChange?.({ value: control.value });
      control.addEventListener('change', change);
      element.append(control);
      host.append(element);
      return {
        element,
        control,
        sync() {},
        destroy() {
          control.removeEventListener('change', change);
          element.remove();
        },
      };
    },
  };

  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
  };
  const settings = Settings.create({ storage });
  const themes = Themes.create({ target: document.documentElement, settings });
  const controller = Tool.create({
    themes,
    target: document.documentElement,
    Picker,
    Field: testField,
    Button,
    themeTokens: Themes.tokens,
  });
  t.after(() => controller.destroy());
  return { ...fixture, settings, themes, controller, storage };
}

test('Card only accepts colours from the selected palette; deleted references use its base roles', (t) => {
  const { controller, themes, document } = setup(t);
  const target = document.documentElement;
  const colour = themes.getState().colours.light.brand[0];
  const reference = { kind: 'palette', category: 'brand', id: colour.id, fallback: '#123456' };
  assert(!controller.setColour('background', { kind: 'custom', value: '#123456' }));
  assert(!controller.setColour('border', { ...reference, id: 'missing' }));
  assert(!controller.setColour('other', reference));
  assert(controller.setColour('border', reference));
  assert.equal(
    target.style.getPropertyValue('--ds-card-accent'),
    `var(--ds-palette-brand-${colour.id})`,
  );
  themes.updateColour('light', 'brand', colour.id, '#AABBCC');
  assert.equal(
    Picker.resolveTheme(
      controller.getState().colours.border,
      themes.getState(),
      Themes.tokens,
      Tool.defaults.border,
    ).colour,
    '#AABBCC',
  );
  themes.removeColour('light', 'brand', colour.id);
  assert.deepEqual(controller.getState().colours.border, Tool.defaults.border);
  assert.equal(target.style.getPropertyValue('--ds-card-accent'), 'var(--ds-colour-border)');
  assert(!target.style.getPropertyValue('--ds-card-background').includes('#'));
});

test('all Card settings belong to the active theme, survive reload/export and follow theme copies', (t) => {
  const { controller, themes, storage, settings } = setup(t);
  controller.setColour('background', { kind: 'semantic', role: 'hover' });
  controller.setSize(640);
  controller.setShadow('rest', 'medium');
  controller.setMenuEnabled(false);
  const light = controller.getState();
  themes.select('dark');
  assert.deepEqual(controller.getState(), {
    colours: Tool.defaults,
    size: Tool.defaultSize,
    shadows: Tool.defaultShadows,
    menuEnabled: true,
  });
  controller.setSize(480);
  controller.setShadow('interactive', 'strong');
  themes.select('light');
  assert.deepEqual(controller.getState(), light);

  const restored = Themes.create({
    target: documentTarget(),
    settings: Settings.create({ storage }),
  });
  assert.deepEqual(restored.getComponentSettings('light', 'card'), {
    ...light,
    css: themes.getComponentSettings('light', 'card').css,
  });
  assert.equal(restored.getComponentSettings('dark', 'card').size, 480);
  assert(!settings.has('preview.card'));
  const imported = Themes.create({ target: documentTarget() });
  imported.importTokens(JSON.parse(themes.exportTokens()));
  assert.deepEqual(
    imported.getComponentSettings('light', 'card'),
    themes.getComponentSettings('light', 'card'),
  );
  const copied = themes.add('Card copy', 'light');
  assert.deepEqual(
    themes.getComponentSettings(copied, 'card'),
    themes.getComponentSettings('light', 'card'),
  );
  assert.deepEqual(controller.getState(), light);

  function documentTarget() {
    return createFixture().document.createElement('html');
  }
});

test('Reset restores only this theme’s Card defaults, without resetting Palette or other themes', (t) => {
  const { controller, themes } = setup(t);
  controller.setSize(680);
  const light = controller.getState();
  themes.select('dark');
  themes.setColour('dark', 'panel', '#123456');
  themes.setShadow('dark', 'soft', { blur: 40 });
  controller.setColour('background', { kind: 'semantic', role: 'hover' });
  controller.setShadow('rest', 'strong');
  controller.setMenuEnabled(false);
  controller.setSize(320);
  controller.reset();
  assert.deepEqual(controller.getState(), {
    colours: Tool.defaults,
    size: Tool.defaultSize,
    shadows: Tool.defaultShadows,
    menuEnabled: true,
  });
  assert.equal(themes.getState().palettes.dark.panel, '#123456');
  assert.equal(themes.getState().shadows.dark.soft.blur, 40);
  themes.select('light');
  assert.deepEqual(controller.getState(), light);
});

test('Card rejects invalid dimensions/shadow profiles and ignores legacy per-card colour props', (t) => {
  const { controller, document } = setup(t);
  for (const value of [0, 160.5, 316, Infinity, 1201, 159, '240', null, NaN]) {
    assert.equal(controller.setSize(value), false);
  }
  assert(!controller.setShadow('rest', 'unknown'));
  assert(!controller.setShadow('unknown', 'soft'));
  assert(!controller.setMenuEnabled('false'));
  const host = document.createElement('article');
  document.body.append(host);
  const card = Card.mount(host, { title: 'Shared colours', accent: '#FF0000' });
  card.update({ title: 'Still shared' });
  assert.equal(host.style.getPropertyValue('--ds-card-accent'), '');
  card.destroy();
});

test('legacy global colours and width migrate once into the active theme, not every theme', () => {
  const fixture = createFixture();
  const target = fixture.document.createElement('html');
  const settings = Settings.create();
  settings.set('components.card.colours', { background: { kind: 'semantic', role: 'hover' } });
  settings.set('preview.card', { width: 316, height: 300 });
  const themes = Themes.create({ target, settings });
  const options = {
    themes,
    target,
    settings: settings.scope('components.card'),
    previewSettings: settings.scope('preview.card'),
    Picker,
    themeTokens: Themes.tokens,
  };
  const controller = Tool.create(options);
  assert.equal(controller.getState().size, 320);
  assert.equal(controller.getState().colours.background.role, 'hover');
  assert.equal(settings.get('components.card.migratedToTheme'), true);
  themes.select('dark');
  assert.equal(controller.getState().size, Tool.defaultSize);
  controller.destroy();
  const next = Tool.create(options);
  assert.equal(next.getState().size, Tool.defaultSize);
  assert.equal(themes.getComponentSettings('dark', 'card'), null);
  next.destroy();
});

test('tool delegates sliders/selects to Form, exposes Reset, updates live and removes listeners', (t) => {
  const { controller, element, document, window, themes } = setup(t);
  const preview = document.createElement('div');
  document.body.append(preview);
  const listenerCount = (target) =>
    [...target.listeners.values()].reduce((total, entries) => total + entries.size, 0);
  const baselineDocument = listenerCount(document);
  const baselineWindow = listenerCount(window);
  const view = controller.mount(element, { preview });
  const inputs = element.querySelectorAll('input');
  const sliders = inputs.filter((input) => input.type === 'range');
  const size = sliders[0];
  assert.equal(size.getAttribute('step'), '10');
  assert.equal(sliders.length, 1);
  assert.equal(inputs.filter((input) => input.type === 'checkbox').length, 1);
  assert.equal(element.querySelectorAll('.ds-field').length, 4);
  const menu = inputs.find((input) => input.type === 'checkbox');
  assert(menu.checked);
  menu.checked = false;
  menu.emit('change');
  assert.equal(controller.getState().menuEnabled, false);
  assert.equal(preview.style.getPropertyValue('--card-preview-size'), '360px');
  const popups = document.querySelectorAll('.palette-picker-popup');
  assert.equal(popups.length, 2);
  for (const popup of popups) assert.equal(popup.querySelectorAll('input').length, 0);
  size.value = '520';
  size.emit('input');
  assert.equal(preview.style.getPropertyValue('--card-preview-size'), '520px');
  assert.equal(element.querySelector('output').textContent, '520 × 520 px');
  const swatch = popups[0].querySelector('.palette-picker-swatches').querySelector('button');
  swatch.emit('click');
  assert.equal(controller.getState().colours.background.kind, 'palette');
  const state = themes.getState();
  const selected = controller.getState().colours.background;
  themes.removeColour(state.theme, selected.category, selected.id);
  assert.deepEqual(controller.getState().colours.background, Tool.defaults.background);
  element
    .querySelectorAll('button')
    .find((button) => button.textContent === 'Reset to defaults')
    .emit('click');
  assert.equal(size.value, '360');
  assert(menu.checked);
  view.destroy();
  assert.equal(document.querySelectorAll('.palette-picker-popup').length, 0);
  assert.equal(element.children.length, 0);
  assert.equal(preview.style.getPropertyValue('--card-preview-size'), '');
  assert.equal(listenerCount(document), baselineDocument);
  assert.equal(listenerCount(window), baselineWindow);
});

test('standalone page puts labelled Configuration above one clearly separated Preview', (t) => {
  const { document, element, controller } = setup(t);
  const context = { DesignSystemCard: Card };
  for (const file of ['kanban-data.js', 'kanban.js']) {
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, '../../../../../app/workspace', file), 'utf8'),
      context,
    );
  }
  let listener;
  const view = context.ExampleKanban.mount(element, {
    document,
    standalone: true,
    cardTool: controller,
    getDevice: () => 'desktop',
    subscribeDevice(callback) {
      listener = callback;
      return () => {
        listener = null;
      };
    },
  });
  assert.equal(element.children[0].className, 'card-tool-section');
  assert.equal(element.children[1].className, 'card-preview-section');
  assert.equal(element.children[0].querySelector('h2').textContent, 'Configuration');
  assert.equal(element.children[1].querySelector('h2').textContent, 'Preview');
  assert(element.children[0].querySelector('header').querySelector('p').textContent.length > 20);
  assert.equal(element.querySelectorAll('.ds-card').length, 1);
  controller.setMenuEnabled(false);
  assert(element.querySelector('.ds-card__menu-trigger').hidden);
  controller.setMenuEnabled(true);
  assert(!element.querySelector('.ds-card__menu-trigger').hidden);
  assert.equal(context.ExampleKanbanData.items.length, 19);
  listener('mobile');
  assert.equal(element.querySelector('.ds-card').dataset.device, 'mobile');
  view.destroy();
  assert.equal(listener, null);
  assert.equal(document.querySelectorAll('.ds-card-menu').length, 0);
  assert.equal(document.querySelectorAll('.palette-picker-popup').length, 0);
});

test('Card export stays tool-independent and uses shared font, border, background and shadow tokens', () => {
  const directory = path.join(__dirname, '../..');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  const css = fs.readFileSync(path.join(directory, 'card.css'), 'utf8');
  assert.equal(manifest.tool.export, false);
  assert(!manifest.exportFiles.includes(manifest.tool.entry));
  assert.deepEqual(manifest.dependencies.components, []);
  assert.match(css, /border:\s*1px\s+var\(--ds-border-style,\s*solid\)/);
  assert.match(css, /border-bottom-width:\s*4px/);
  assert.match(css, /background:\s*var\(--ds-card-background,\s*var\(--ds-colour-panel\)\)/);
  for (const token of [
    '--ds-colour-border',
    '--ds-font-family',
    '--ds-font-size-body',
    '--ds-shadow-none',
    '--ds-shadow-soft',
  ])
    assert(css.includes(token));
  assert(!/ui-monospace|#[a-f\d]{6}/i.test(css));
  const runtime = fs.readFileSync(path.join(directory, 'card.js'), 'utf8');
  assert(!/PalettePicker|localStorage|DesignSystemThemes|state\.accent/.test(runtime));
});
