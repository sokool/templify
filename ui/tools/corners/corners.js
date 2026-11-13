/* Corner authoring UI. Components consume foundation variables, never this tool. */
(function (root) {
  'use strict';

  function mount(host, {
    themes,
    Field = root.DesignSystemFormField,
    Buttons = root.DesignSystemButtons,
    Corners = root.DesignSystemCorners,
  } = {}) {
    const document = host.ownerDocument;
    const views = [];
    const profileFields = {};
    const profileValues = {};
    const assignments = {};
    const assignmentValues = {};
    const initial = themes.getState();
    const make = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const element = make('section', 'corners-tool');
    const status = make('p', 'example-status');
    status.setAttribute('role', 'status');
    const button = (host, label, onClick) => {
      const view = Buttons.mount(host, { label, variant: 'secondary', onClick });
      views.push(view);
      return view;
    };
    function edit(values) {
      try {
        themes.setCorners(themes.getState().theme, values);
      } catch (error) {
        status.textContent = error.message;
      }
    }
    const radiusLabel = (id, value) => id === 'pill' ? 'Fully rounded' : value + ' px';

    element.append(
      make('p', 'example-lead', 'Define a shared corner scale and assign profiles to component groups. Changes apply live and are saved to this theme.'),
      make('h2', '', 'Corner scale'),
      make('p', 'corners-note', 'Edit reusable radii from 0 to 64 px. None stays square; Pill stays fully rounded.'),
    );
    const scale = make('div', 'corners-scale');
    for (const [id, definition] of Object.entries(Corners.profiles)) {
      const tile = make('section', 'corners-profile');
      tile.dataset.cornerProfile = id;
      const sample = make('div', 'corners-profile-sample', 'Aa');
      sample.setAttribute('aria-hidden', 'true');
      sample.style.borderRadius = `var(--ds-radius-${id})`;
      tile.append(sample, make('h3', '', definition.label));
      const controls = make('div', 'corners-profile-controls ds-tool');
      if (definition.editable) {
        const field = Field.mount(controls, {
          type: 'range',
          label: definition.label + ' radius',
          attrs: { value: initial.corners[initial.theme].profiles[id], min: Corners.range[0], max: Corners.range[1], step: 1 },
          onChange({ value }) { edit({ profiles: { [id]: Number(value) } }); },
        });
        profileFields[id] = field;
        views.push(field);
        button(controls, 'Reset ' + definition.label.toLowerCase() + ' radius', () => {
          themes.resetCorners(themes.getState().theme, 'profiles', id);
        });
      } else {
        profileValues[id] = make('p', 'corners-note', radiusLabel(id, definition.value));
        controls.append(profileValues[id]);
      }
      tile.append(controls);
      scale.append(tile);
    }
    element.append(scale, make('h2', '', 'Component groups'));
    const groupList = make('div', 'corners-groups');
    for (const [id, definition] of Object.entries(Corners.groups)) {
      const row = make('section', 'corners-group');
      row.dataset.cornerGroup = id;
      const sample = make('div', 'corners-group-sample', 'Aa');
      sample.setAttribute('aria-hidden', 'true');
      sample.style.borderRadius = `var(--ds-radius-${id})`;
      const info = make('div', 'corners-group-info');
      info.append(make('h3', '', definition.label), make('p', 'corners-note', definition.description));
      assignmentValues[id] = make('p', 'corners-group-value');
      info.append(assignmentValues[id]);
      const controls = make('div', 'corners-group-controls ds-tool');
      const select = Field.mount(controls, {
        kind: 'select',
        label: definition.label + ' profile',
        value: initial.corners[initial.theme].assignments[id],
        options: Object.entries(Corners.profiles).map(([value, profile]) => ({ value, label: profile.label })),
        onChange({ value }) { edit({ assignments: { [id]: value } }); },
      });
      assignments[id] = select;
      views.push(select);
      button(controls, 'Reset ' + definition.label.toLowerCase(), () => {
        themes.resetCorners(themes.getState().theme, 'assignments', id);
      });
      row.append(sample, info, controls);
      groupList.append(row);
    }
    element.append(groupList, make('h2', '', 'Live preview'));
    const preview = make('div', 'corners-preview');
    preview.setAttribute('aria-label', 'Corner component preview');
    const buttonSample = make('div', 'corners-preview-item');
    buttonSample.append(make('h3', '', 'Buttons'));
    views.push(Buttons.mount(buttonSample, { label: 'Continue', variant: 'primary' }));
    const fieldSample = make('div', 'corners-preview-item');
    views.push(Field.mount(fieldSample, {
      label: 'Form control',
      attrs: { value: 'Example input', readonly: true },
    }));
    const cardSample = make('div', 'corners-preview-item');
    cardSample.append(make('h3', '', 'Card'));
    const card = make('article', 'ds-card');
    card.append(
      make('strong', 'ds-card__title', 'Project overview'),
      make('span', 'ds-card__description', 'One profile, shared by every card.'),
    );
    cardSample.append(card);
    const popupSample = make('div', 'corners-preview-item');
    popupSample.append(make('h3', '', 'Popup'));
    const popup = make('div', 'ds-card-menu corners-preview-popup');
    const action = make('button', '', 'View details');
    action.type = 'button';
    popup.append(action);
    popupSample.append(popup);
    preview.append(buttonSample, fieldSample, cardSample, popupSample);
    const actions = make('div', 'corners-actions ds-tool');
    button(actions, 'Reset all corners', () => themes.resetCorners(themes.getState().theme));
    element.append(
      preview,
      make('p', 'corners-note', 'Avatars, status dots, radio buttons and decorative circles keep their shape. Flush edges stay square. Explicit component radius overrides take precedence.'),
      actions,
      status,
    );
    host.append(element);

    function update(state) {
      const value = state.corners[state.theme];
      for (const [id, field] of Object.entries(profileFields)) {
        field.control.value = String(value.profiles[id]);
        field.control.setAttribute('aria-valuetext', value.profiles[id] + ' px');
        field.sync();
        field.element.querySelector('output').textContent = value.profiles[id] + ' px';
      }
      for (const [id, select] of Object.entries(assignments)) {
        const profile = value.assignments[id];
        select.control.value = profile;
        select.sync();
        assignmentValues[id].textContent = Corners.profiles[profile].label + ' · ' + radiusLabel(profile, value.profiles[profile]);
      }
      const name = state.themes.find(theme => theme.id === state.theme).label;
      status.textContent = name + ' · corners saved automatically.';
    }
    update(initial);
    const unsubscribe = themes.subscribe(update);
    return {
      element,
      destroy() {
        unsubscribe();
        views.reverse().forEach(view => view.destroy());
        element.remove();
      },
    };
  }

  const api = { mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemCornersTool = api;
})(globalThis);
