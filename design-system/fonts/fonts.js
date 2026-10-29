/* Example-only font selector. Components consume a token; they never import this tool. */
(function (global) {
  'use strict';
  const choices = [
  {
    "name": "Manrope",
    "description": "Geometric and calm. The starting point for this UI."
  },
  {
    "name": "Inter",
    "description": "Neutral and compact. Well suited to tables and dashboards."
  },
  {
    "name": "DM Sans",
    "description": "A softer rhythm and a clear, contemporary shape."
  },
  {
    "name": "Plus Jakarta Sans",
    "description": "Geometric and distinctive, with characterful headings."
  },
  {
    "name": "IBM Plex Sans",
    "description": "A technical character with clearly defined letterforms."
  },
  {
    "name": "Source Sans 3",
    "description": "Open, calm letterforms for longer descriptions and forms."
  },
  {
    "name": "Work Sans",
    "description": "A simple, functional and restrained typeface."
  },
  {
    "name": "Nunito Sans",
    "description": "Soft, friendly letterforms with a lighter touch."
  },
  {
    "name": "Montserrat",
    "description": "Strong geometry and more expressive headings."
  },
  {
    "name": "Poppins",
    "description": "The geometric typeface from your Top Schrank reference."
  },
  {
    "name": "JetBrains Mono",
    "description": "The Schranky reference monospace for codes, dates and counters."
  },
  {
    "name": "Roboto",
    "description": "A neutral, economical typeface for forms and lists."
  },
  {
    "name": "Open Sans",
    "description": "Open letterforms and a calm rhythm for longer text."
  },
  {
    "name": "Figtree",
    "description": "A friendly, lightly geometric interface typeface."
  },
  {
    "name": "Outfit",
    "description": "Distinctive geometry for headings and modern interfaces."
  },
  {
    "name": "Space Grotesk",
    "description": "More technical and distinctive letterforms."
  }
];
  function create({document, storage, storageKey = 'design-system-examples-font'} = {}) {
    const views = new Set();
    let selected = choices[0].name;
    try { const value = storage?.getItem(storageKey); if (choices.some(font => font.name === value)) selected = value; } catch {}
    // Font delivery belongs to the example application, never a component's runtime.
    if (!document.getElementById('example-font-families')) {
      const link = document.createElement('link'); link.id = 'example-font-families'; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?' + choices.map(font => 'family=' + encodeURIComponent(font.name).replace(/%20/g, '+') + ':wght@400;500;600;700').join('&') + '&display=swap';
      document.head.append(link);
    }
    function apply(name, remember = true) {
      if (!choices.some(font => font.name === name)) return;
      selected = name;
      document.documentElement.style.setProperty('--ds-font-family', '"' + selected + '", system-ui, sans-serif');
      views.forEach(update => update());
      if (remember) try { storage?.setItem(storageKey, selected); } catch {}
    }
    apply(selected, false);
    function mount(element) {
      element.innerHTML = '<p class="example-lead">Choose the typeface for the entire workspace. Your selection is saved automatically.</p><p class="example-status" data-font-status role="status" aria-live="polite"></p><div class="example-font-grid" role="group" aria-label="Workspace typeface"></div><section class="example-typography"><h2>Typography</h2><div class="example-type-grid"><div><span class="example-kicker">One typeface for the whole UI</span><h3 data-font-name></h3><p data-font-description></p><div class="example-font-weights"><span style="font-weight:400">400 · body</span><span style="font-weight:500">500 · labels</span><span style="font-weight:600">600 · headings</span><span style="font-weight:700">700 · buttons</span></div></div><div><p class="example-type-sentence">Space made for you.</p><p class="example-type-alphabet">The quick brown fox jumps over the lazy dog.</p><p class="example-status">ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789<br>Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż · Ää Öö Üü ß</p><a class="example-link" data-font-source target="_blank" rel="noopener"></a></div></div></section>';
      const grid = element.querySelector('.example-font-grid');
      choices.forEach(font => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'example-font-choice'; button.dataset.font = font.name;
        button.style.setProperty('--candidate-font', '"' + font.name + '", system-ui, sans-serif');
        button.setAttribute('aria-label', 'Use ' + font.name);
        const name = document.createElement('strong'); name.className = 'example-font-choice-name'; name.textContent = font.name;
        const check = document.createElement('span'); check.className = 'example-font-check'; check.setAttribute('aria-hidden', 'true');
        check.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>';
        const sample = document.createElement('span'); sample.className = 'example-font-sample'; sample.textContent = 'Space made for you.';
        const alphabet = document.createElement('span'); alphabet.className = 'example-font-alphabet'; alphabet.textContent = 'Aa Bb Cc · 0123456789';
        button.append(name, check, sample, alphabet); grid.append(button);
      });
      function update() {
        const font = choices.find(font => font.name === selected);
        grid.querySelectorAll('[data-font]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.font === selected)));
        element.querySelector('[data-font-status]').textContent = 'Selected: ' + selected;
        element.querySelector('[data-font-name]').textContent = selected;
        element.querySelector('[data-font-description]').textContent = font.description;
        const source = element.querySelector('[data-font-source]'); source.textContent = selected + ' on Google Fonts ↗'; source.href = 'https://fonts.google.com/specimen/' + encodeURIComponent(selected);
      }
      function onClick(event) { const button = event.target.closest('[data-font]'); if (button && grid.contains(button)) apply(button.dataset.font); }
      grid.addEventListener('click', onClick); views.add(update); update();
      return {destroy() { views.delete(update); grid.removeEventListener('click', onClick); element.replaceChildren(); }};
    }
    return { mount, apply, get value() { return selected; } };
  }
  global.ExampleFonts = {create};
})(typeof globalThis !== 'undefined' ? globalThis : this);
