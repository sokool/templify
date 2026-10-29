/* Shared shadow profiles. No DOM, editor, storage or colour-library dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemShadows = api;
})(globalThis, function () {
  'use strict';

  const extension = 'org.topschrank.shadows';
  const categories = ['brand', 'accent', 'greys'];
  const ranges = {
    x: [-100, 100],
    y: [-100, 100],
    blur: [0, 200],
    spread: [-100, 100],
    opacity: [0, 100],
  };
  const defaults = {
    none: { label: 'None', x: 0, y: 0, blur: 0, spread: 0, opacity: 0 },
    soft: { label: 'Soft', x: 0, y: 3, blur: 12, spread: 0, opacity: 12 },
    medium: { label: 'Medium', x: 0, y: 8, blur: 24, spread: 0, opacity: 18 },
    strong: { label: 'Strong', x: 0, y: 16, blur: 40, spread: 0, opacity: 24 },
  };

  for (const profile of Object.values(defaults)) {
    profile.colour = Object.freeze({ kind: 'semantic', role: 'text' });
    Object.freeze(profile);
  }
  Object.freeze(defaults);
  Object.values(ranges).forEach(Object.freeze);
  Object.freeze(ranges);

  const copy = (value) => JSON.parse(JSON.stringify(value));

  function validColour(value, bindings) {
    if (!value || typeof value !== 'object') return false;
    if (value.kind === 'semantic') return Object.hasOwn(bindings, value.role);
    return (
      value.kind === 'palette' &&
      categories.includes(value.category) &&
      typeof value.id === 'string' &&
      /^[a-z][a-z0-9-]*$/.test(value.id) &&
      /^#[a-f0-9]{6}$/i.test(value.fallback)
    );
  }

  function validateProfile(value, bindings) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Invalid shadow profile.');
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'colour') {
        if (!validColour(entry, bindings)) {
          throw new TypeError('Choose a shadow colour from the active palette.');
        }
      } else {
        const range = Object.hasOwn(ranges, key) ? ranges[key] : null;
        if (!range || !Number.isInteger(entry) || entry < range[0] || entry > range[1]) {
          throw new TypeError('Invalid shadow ' + key + '.');
        }
      }
    }
  }

  function validate(document, bindings) {
    for (const group of Object.values(document.themes)) {
      const profiles = group.$extensions?.[extension];
      if (profiles === undefined) continue;
      if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) {
        throw new TypeError('Invalid theme shadow profiles.');
      }
      for (const [id, profile] of Object.entries(profiles)) {
        if (id === 'none' || !Object.hasOwn(defaults, id)) {
          throw new TypeError('Unknown shadow profile: ' + id);
        }
        validateProfile(profile, bindings);
      }
    }
  }

  function read(document, theme, bindings) {
    const group = document.themes[theme];
    const saved = group.$extensions?.[extension] || {};
    return Object.fromEntries(
      Object.entries(defaults).map(([id, fallback]) => {
        const profile = { ...copy(fallback), ...copy(saved[id] || {}) };
        const colour = profile.colour;
        // Deleted primitives never fall back to a HEX from a different theme.
        if (
          !validColour(colour, bindings) ||
          (colour.kind === 'palette' &&
            !Object.hasOwn(group.colors?.[colour.category] || {}, colour.id))
        ) {
          profile.colour = { ...fallback.colour };
        }
        return [id, profile];
      }),
    );
  }

  function write(document, theme, id, values, bindings) {
    if (!Object.hasOwn(document.themes, theme) || id === 'none' || !Object.hasOwn(defaults, id)) {
      throw new TypeError('Choose an editable shadow profile.');
    }
    validateProfile(values, bindings);
    if (
      values.colour?.kind === 'palette' &&
      !Object.hasOwn(
        document.themes[theme].colors?.[values.colour.category] || {},
        values.colour.id,
      )
    ) {
      throw new TypeError('Choose a colour from this theme.');
    }
    const group = document.themes[theme];
    group.$extensions ||= {};
    group.$extensions[extension] ||= {};
    const current = group.$extensions[extension][id] || {};
    group.$extensions[extension][id] = { ...current, ...copy(values) };
  }

  function reset(document, theme, id) {
    if (!Object.hasOwn(document.themes, theme) || id === 'none' || !Object.hasOwn(defaults, id))
      return false;
    const profiles = document.themes[theme].$extensions?.[extension];
    if (profiles) delete profiles[id];
    return true;
  }

  function css(profile, bindings) {
    if (profile.opacity === 0) return 'none';
    const colour = profile.colour;
    const variable =
      colour.kind === 'semantic'
        ? bindings[colour.role]
        : '--ds-palette-' + colour.category + '-' + colour.id;
    return `${profile.x}px ${profile.y}px ${profile.blur}px ${profile.spread}px color-mix(in srgb, var(${variable}) ${profile.opacity}%, transparent)`;
  }

  return Object.freeze({ extension, defaults, ranges, validate, read, write, reset, css });
});
