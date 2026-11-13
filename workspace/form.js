/* Each catalogue entry hydrates the exact HTML shipped by the exporter. No duplicate playground. */
(function (root) {
  'use strict';
  function mount(host, { document: doc = host.ownerDocument } = {}) {
    const views = [], abort = new AbortController();
    let alive = true;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    };
    const wrapper = node('div', 'example-form');
    wrapper.append(node('p', 'example-lead', 'One example per field type. Every field can be exported independently; the preview uses the exported HTML and shared behaviour.'));
    const jump = node('nav', 'form-example-jump');
    jump.setAttribute('aria-label', 'Field categories');
    wrapper.append(jump);
    const status = node('p', 'form-example-description', 'Loading field templates…');
    status.setAttribute('role', 'status'); wrapper.append(status); host.append(wrapper);
    const entries = [];
    for (const group of ExampleFormData.groups) {
      const id = 'form-example-' + group.id;
      const link = node('a', '', group.label); link.href = '#' + id; jump.append(link);
      const section = node('section', 'form-example-section'); section.id = id;
      section.append(node('h2', '', group.label));
      const grid = node('div', 'form-example-grid'); section.append(grid); wrapper.append(section);
      for (const type of group.types) {
        const name = 'field-' + type, example = node('article', 'form-example-field');
        example.dataset.fieldExample = name;
        example.append(node('h3', '', type === 'range' ? 'Slider · range' : type === 'quantity' ? 'Number · − / +' : type));
        const preview = node('div', 'form-example-preview'); example.append(preview);
        const exportName = node('code', 'form-example-export', name); example.append(exportName); grid.append(example);
        entries.push({ name, preview, example });
      }
    }
    const ready = Promise.all(entries.map(async ({ name, preview, example }) => {
      const response = await fetch(new URL('ui/components/' + name + '/' + name + '.html', doc.baseURI), { signal: abort.signal });
      if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
      const html = await response.text();
      if (!alive) return;
      const template = doc.createElement('template'); template.innerHTML = html;
      preview.append(template.content.cloneNode(true));
      const field = preview.querySelector('.ds-field'), view = DesignSystemFormField.enhance(field);
      if (view) views.push(view);
      if (name === 'field-hidden') example.append(node('p', 'form-example-description', 'No visible control. Included in FormData as source=templify.'));
    })).then(() => { if (alive) status.remove(); }).catch(error => {
      if (alive && error.name !== 'AbortError') status.textContent = 'Unable to load fields: ' + error.message;
    });
    const onJump = event => {
      const link = event.target.closest('a');
      if (!link) return;
      event.preventDefault();
      doc.getElementById(link.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    jump.addEventListener('click', onJump);
    return {
      ready,
      destroy() {
        alive = false; abort.abort(); jump.removeEventListener('click', onJump);
        views.reverse().forEach(view => view.destroy()); wrapper.remove();
      },
    };
  }
  root.ExampleForm = { mount };
})(globalThis);
