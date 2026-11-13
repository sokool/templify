/* Shared corner profiles and semantic assignments. No DOM, editor or storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemCorners = api;
})(globalThis, function () {
  'use strict';

  const extension = 'org.topschrank.corners';
  const range = Object.freeze([0, 64]);
  const profiles = {
    none: { label: 'None', value: 0, editable: false },
    small: { label: 'Small', value: 4, editable: true },
    medium: { label: 'Medium', value: 8, editable: true },
    large: { label: 'Large', value: 12, editable: true },
    xlarge: { label: 'Extra large', value: 16, editable: true },
    pill: { label: 'Pill', value: 9999, editable: false },
  };
  const groups = {
    buttons: { label: 'Buttons', profile: 'large', description: 'Buttons and compact actions.' },
    controls: { label: 'Form controls', profile: 'large', description: 'Inputs, selects and textareas.' },
    panels: { label: 'Cards & panels', profile: 'large', description: 'Cards, surfaces, lists and board columns.' },
    popups: { label: 'Popups', profile: 'medium', description: 'Menus, suggestions and tooltips.' },
    windows: { label: 'Windows', profile: 'xlarge', description: 'Dialogs and the exposed corners of side panels.' },
    navigation: { label: 'Navigation items', profile: 'medium', description: 'Rounded navigation items; flush rows stay square.' },
    badges: { label: 'Badges & chips', profile: 'medium', description: 'Badges, tags and selection chips.' },
  };
  Object.values(profiles).forEach(Object.freeze);
  Object.values(groups).forEach(Object.freeze);
  Object.freeze(profiles);
  Object.freeze(groups);
  const defaults = Object.freeze({
    profiles: Object.freeze(Object.fromEntries(Object.entries(profiles).map(([id, value]) => [id, value.value]))),
    assignments: Object.freeze(Object.fromEntries(Object.entries(groups).map(([id, value]) => [id, value.profile]))),
  });
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const object = (value) => value && typeof value === 'object' && !Array.isArray(value);

  function check(value) {
    if (!object(value) || Object.keys(value).some(key => !['profiles', 'assignments'].includes(key)))
      throw new TypeError('Invalid theme corner settings.');
    if (value.profiles !== undefined) {
      if (!object(value.profiles)) throw new TypeError('Invalid corner profiles.');
      for (const [id, radius] of Object.entries(value.profiles)) {
        if (!Object.hasOwn(profiles, id) || !profiles[id].editable)
          throw new TypeError('Choose an editable corner profile.');
        if (!Number.isInteger(radius) || radius < range[0] || radius > range[1])
          throw new TypeError('Corner radius must be a whole number between 0 and 64 px.');
      }
    }
    if (value.assignments !== undefined) {
      if (!object(value.assignments)) throw new TypeError('Invalid corner assignments.');
      for (const [group, profile] of Object.entries(value.assignments)) {
        if (!Object.hasOwn(groups, group) || typeof profile !== 'string' || !Object.hasOwn(profiles, profile))
          throw new TypeError('Choose a known corner group and profile.');
      }
    }
  }

  function validate(document) {
    for (const group of Object.values(document.themes)) {
      const saved = group.$extensions?.[extension];
      if (saved !== undefined) check(saved);
    }
  }

  function read(document, theme) {
    const saved = document.themes[theme].$extensions?.[extension] || {};
    return {
      profiles: { ...defaults.profiles, ...saved.profiles },
      assignments: { ...defaults.assignments, ...saved.assignments },
    };
  }

  function write(document, theme, values) {
    if (!Object.hasOwn(document.themes, theme)) throw new TypeError('Choose an existing theme.');
    check(values);
    const group = document.themes[theme];
    group.$extensions ||= {};
    const saved = group.$extensions[extension] || {};
    group.$extensions[extension] = {
      profiles: { ...saved.profiles, ...copy(values.profiles || {}) },
      assignments: { ...saved.assignments, ...copy(values.assignments || {}) },
    };
  }

  function reset(document, theme, section, id) {
    if (!Object.hasOwn(document.themes, theme)) return false;
    if (section !== undefined && (
      !['profiles', 'assignments'].includes(section) ||
      !Object.hasOwn(defaults[section], id) ||
      (section === 'profiles' && !profiles[id].editable)
    )) return false;
    const extensions = document.themes[theme].$extensions;
    if (section === undefined) {
      if (extensions) delete extensions[extension];
    } else if (extensions?.[extension]?.[section]) {
      delete extensions[extension][section][id];
    }
    return true;
  }

  function declarations(value) {
    return [
      ...Object.entries(value.profiles).map(([id, radius]) => ['--ds-radius-' + id, radius + 'px']),
      ...Object.entries(value.assignments).map(([id, profile]) => [
        '--ds-radius-' + id, 'var(--ds-radius-' + profile + ')',
      ]),
    ];
  }

  return Object.freeze({ extension, range, profiles, groups, defaults, validate, read, write, reset, declarations });
});
