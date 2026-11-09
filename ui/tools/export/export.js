/* Selection/download UI only. Shared export rules live in ui/export/project.cjs. */
const { available, resolveComponents } = require('../../export/project.cjs');

function mount(host, {
  loadProject, createArchive, download,
  Field = globalThis.DesignSystemFormField, Buttons = globalThis.DesignSystemButtons,
} = {}) {
  const doc = host.ownerDocument, win = doc.defaultView, views = [], urls = new Map();
  let project, selected = new Set(), busy = false, alive = true;
  const abort = new AbortController(), rows = new Map();
  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = make('section', 'ds-tool export-tool');
  const intro = make('p', 'example-lead', 'Choose components and download a ready-to-use HTML / CSS / JS package. Required components are included automatically.');
  const toolbar = make('div', 'export-tool-actions');
  const selection = make('fieldset', 'export-tool-selection');
  selection.append(make('legend', '', 'Components'));
  const list = make('div', 'export-tool-grid');
  selection.append(list);
  const summary = make('p', 'export-tool-summary');
  summary.setAttribute('role', 'status');
  const contents = make('pre', 'export-tool-contents');
  contents.setAttribute('aria-label', 'Package contents');
  const actions = make('div', 'export-tool-actions');
  const progress = make('p', 'export-tool-progress', 'Loading component sources…');
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  const error = make('p', 'export-tool-error');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const note = make('p', 'example-status', 'The package contains documented HTML examples and shared default styles. Server endpoints are supplied by your application. Settings imports and backups remain in Settings.');
  root.append(intro, toolbar, selection, summary, contents, actions, progress, error, note);
  host.append(root);

  const button = (container, label, onClick, variant = 'secondary') => {
    const view = Buttons.mount(container, { label, onClick, variant });
    views.push(view);
    return view;
  };
  const all = button(toolbar, 'Select all', () => { selected = new Set(available(project)); update(); });
  const clear = button(toolbar, 'Clear selection', () => { selected.clear(); update(); });
  const submit = button(actions, 'Download ZIP', generate, 'primary');
  const retry = button(actions, 'Retry', () => { if (project) generate(); else load(); });
  retry.element.hidden = true;

  function update() {
    if (!alive) return;
    const requested = [...selected], resolved = project ? resolveComponents(project, requested) : [];
    const required = new Set(resolved.filter(name => !selected.has(name)));
    for (const [name, row] of rows) {
      row.control.checked = selected.has(name) || required.has(name);
      row.control.disabled = busy || required.has(name);
      const owners = required.has(name) ? requested.filter(owner => resolveComponents(project, [owner]).includes(name)) : [];
      row.note.textContent = owners.length ? 'Required by: ' + owners.join(', ') : '';
      row.note.hidden = !owners.length;
    }
    all.update({ disabled: busy || !project });
    clear.update({ disabled: busy || !project || !selected.size });
    submit.update({ disabled: busy || !resolved.length, label: busy ? 'Preparing ZIP…' : 'Download ZIP' });
    retry.update({ disabled: busy });
    root.setAttribute('aria-busy', String(busy));
    summary.textContent = project ? `${selected.size} selected · ${required.size} automatically required · ${resolved.length} components in package` : '';
    contents.textContent = resolved.length ? [
      'index.html', 'ui.css', 'ui.js', 'htmx.min.js',
      ...resolved.map(name => 'components/' + name + '.html'),
      'licenses/htmx.txt', 'licenses/templify.txt',
    ].join('\n') : 'Select at least one component.';
  }

  function fail(message) {
    error.textContent = message;
    error.hidden = false;
    retry.element.hidden = false;
    progress.textContent = '';
  }

  function save(data, filename) {
    if (download) return download(data, filename);
    const url = win.URL.createObjectURL(new win.Blob([data], { type: 'application/zip' }));
    const link = make('a');
    link.href = url;
    link.download = filename;
    doc.body.append(link);
    link.click();
    link.remove();
    urls.set(url, win.setTimeout(() => { win.URL.revokeObjectURL(url); urls.delete(url); }, 1000));
  }

  async function generate() {
    if (!alive || busy || !project || !selected.size) return;
    busy = true;
    error.hidden = true;
    retry.element.hidden = true;
    update();
    try {
      const archive = await createArchive(project, [...selected], {
        signal: abort.signal,
        onProgress(message) { if (alive) progress.textContent = message; },
      });
      if (!alive) return;
      await save(archive.data, 'templify-components.zip');
      if (alive) progress.textContent = `ZIP ready · ${archive.components.length} components. Extract the archive and open index.html.`;
    } catch (cause) {
      if (alive) fail('Export failed: ' + cause.message);
    } finally {
      busy = false;
      update();
    }
  }

  async function load() {
    if (!alive || busy) return;
    busy = true;
    error.hidden = true;
    retry.element.hidden = true;
    progress.textContent = 'Loading component sources…';
    update();
    try {
      const loaded = await loadProject({ signal: abort.signal });
      if (!alive) return;
      const names = available(loaded);
      if (!names.length) throw new Error('No exportable components found. Rebuild the export tool.');
      project = loaded;
      selected = new Set(names);
      for (const name of names) {
        const holder = make('div', 'export-tool-component');
        const label = (name[0].toUpperCase() + name.slice(1)).replaceAll('-', ' ');
        const field = Field.mount(holder, {
          type: 'checkbox', label, text: label, attrs: { checked: true },
          onChange({ value }) { if (value) selected.add(name); else selected.delete(name); update(); },
        });
        const detail = make('p', 'export-tool-required');
        detail.id = 'export-required-' + name;
        field.control.dataset.exportComponent = name;
        field.control.setAttribute('aria-describedby', detail.id);
        holder.append(detail);
        list.append(holder);
        rows.set(name, { control: field.control, note: detail });
        views.push(field);
      }
      progress.textContent = 'Ready. All components are selected.';
    } catch (cause) {
      if (alive) fail('Could not load export sources: ' + cause.message);
    } finally {
      busy = false;
      update();
    }
  }

  const ready = load();
  return {
    ready,
    destroy() {
      alive = false;
      abort.abort();
      urls.forEach((timer, url) => { win.clearTimeout(timer); win.URL.revokeObjectURL(url); });
      urls.clear();
      views.reverse().forEach(view => view.destroy());
      root.remove();
    },
  };
}

module.exports = { mount };
