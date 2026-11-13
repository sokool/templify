/* Themed date/time/colour surfaces. Native controls remain the value and validity source. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DesignSystemFormPickers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const day = 86400000;
  const pad = value => String(value).padStart(2, '0');
  function dateValue(date) { return String(date.getUTCFullYear()).padStart(4, '0') + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()); }
  function parseDate(value) {
    const match = /^(\d{4,})-(\d{2})(?:-(\d{2}))?/.exec(value || '');
    if (!match) return null;
    const date = new Date(0);
    date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1));
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
  function weekValue(date) {
    const thursday = new Date(date);
    thursday.setUTCDate(thursday.getUTCDate() + 3 - (thursday.getUTCDay() + 6) % 7);
    const year = thursday.getUTCFullYear(), first = parseDate(year + '-01-04');
    first.setUTCDate(first.getUTCDate() + 3 - (first.getUTCDay() + 6) % 7);
    return year + '-W' + pad(1 + Math.round((thursday - first) / (7 * day)));
  }
  function weekStart(value) {
    const match = /^(\d{4,})-W(\d{2})$/.exec(value || '');
    if (!match) return null;
    const date = parseDate(match[1] + '-01-04');
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7 + (Number(match[2]) - 1) * 7);
    return date;
  }
  function calendarDays(year, month) {
    const first = parseDate(String(year).padStart(4, '0') + '-' + pad(month + 1) + '-01');
    first.setUTCDate(first.getUTCDate() - (first.getUTCDay() + 6) % 7);
    return Array.from({ length: 42 }, (_, index) => new Date(first.getTime() + index * day));
  }
  function periodNumber(type, value) {
    if (type === 'month') {
      const match = /^(\d{4,})-(0[1-9]|1[0-2])$/.exec(value || '');
      return match && Number(match[1]) > 0 ? Number(match[1]) * 12 + Number(match[2]) - 1 : NaN;
    }
    const monday = weekStart(value);
    return monday && monday.getUTCFullYear() > 0 && weekValue(monday) === value ? monday.getTime() / (7 * day) : NaN;
  }
  // Safari may expose month/week as text inputs. Only that fallback needs a format/constraint adapter.
  function validPeriod(type, value, { min, max, step, base, required = false } = {}) {
    if (value === '') return !required;
    const number = periodNumber(type, value);
    if (!Number.isFinite(number)) return false;
    const lower = periodNumber(type, min), upper = periodNumber(type, max);
    if (Number.isFinite(lower) && number < lower || Number.isFinite(upper) && number > upper) return false;
    if (step === 'any') return true;
    const increment = Number(step) > 0 ? Number(step) : 1;
    const initial = Number.isFinite(lower) ? lower : Number.isFinite(periodNumber(type, base)) ? periodNumber(type, base)
      : periodNumber(type, type === 'month' ? '1970-01' : '1970-W01');
    const distance = (number - initial) / increment;
    return Math.abs(distance - Math.round(distance)) < 1e-7;
  }
  function enhance(control, root, listen, helpers) {
    const { node, button, events, labelTarget, hide, restore, popup } = helpers;
    const doc = control.ownerDocument, type = control.getAttribute('type'), colour = type === 'color';
    const trigger = button(doc, 'ds-field-control ds-picker-trigger');
    trigger.id = control.id + '-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    labelTarget(control, root, trigger);
    const value = node(doc, 'span', 'ds-picker-value'), icon = node(doc, 'span', colour ? 'ds-picker-swatch' : type === 'time' ? 'ds-picker-clock' : 'ds-picker-calendar');
    icon.setAttribute('aria-hidden', 'true');
    trigger.append(value, icon);
    const panel = node(doc, 'div', 'ds-field-popup ds-picker');
    panel.id = control.id + '-picker';
    panel.setAttribute('role', 'dialog');
    const label = root.querySelector('.ds-field-label')?.textContent || control.getAttribute('aria-label') || type;
    panel.setAttribute('aria-label', label + ' picker');
    control.parentNode.append(trigger, panel);
    hide(control);
    const surface = popup(root, trigger, panel, listen);
    const probe = control.cloneNode(false);
    probe.removeAttribute('id'); probe.removeAttribute('name'); probe.disabled = false; probe.readOnly = false;
    let draft = '', view, mode, activeDate, fallbackError = '';
    const periodFallback = ['month', 'week'].includes(type) && control.type !== type;
    const locale = doc.documentElement.lang || 'en';
    const monthName = date => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    function today() { const now = new Date(); return parseDate(now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())); }
    function accepts(candidate) {
      for (const attr of ['min', 'max', 'step', 'required']) {
        if (control.hasAttribute(attr)) probe.setAttribute(attr, control.getAttribute(attr)); else probe.removeAttribute(attr);
      }
      probe.value = candidate;
      return (periodFallback ? validPeriod(type, candidate, {
        min: control.min, max: control.max, step: control.step, base: control.getAttribute('value'), required: control.required,
      }) : colour ? /^#[a-f\d]{6}$/i.test(candidate) : candidate === '' || probe.value !== '') && probe.validity.valid;
    }
    function commit(candidate) {
      if (control.disabled || control.readOnly || !accepts(candidate)) return;
      control.value = candidate; sync(); events(control); surface.close(true);
    }
    function dateCandidate(date) {
      const dateText = dateValue(date);
      if (type === 'week') return weekValue(date);
      if (type === 'month') return dateText.slice(0, 7);
      if (type === 'datetime-local') {
        let result = dateText + 'T' + (draft.split('T')[1] || '00:00');
        if (control.min?.startsWith(dateText) && result < control.min) result = control.min;
        if (control.max?.startsWith(dateText) && result > control.max) result = control.max;
        return result;
      }
      return dateText;
    }
    function setDate(date) {
      const candidate = dateCandidate(date);
      if (!accepts(candidate)) return;
      activeDate = date;
      if (type === 'datetime-local') { draft = candidate; render(); }
      else commit(candidate);
    }
    function newButton(text, className, labelText) { return button(doc, className, text, labelText); }
    function renderCalendar() {
      const header = node(doc, 'div', 'ds-picker-header');
      const previous = newButton('‹', 'ds-picker-nav', 'Previous ' + (mode === 'days' ? 'month' : mode === 'months' ? 'year' : 'years'));
      const heading = newButton(mode === 'days' ? monthName(view) : mode === 'months' ? String(view.getUTCFullYear()) : view.getUTCFullYear() + ' – ' + (view.getUTCFullYear() + 11), 'ds-picker-heading');
      const next = newButton('›', 'ds-picker-nav', 'Next ' + (mode === 'days' ? 'month' : mode === 'months' ? 'year' : 'years'));
      header.append(previous, heading, next); panel.append(header);
      heading.dataset.pickerAction = 'mode';
      previous.dataset.pickerAction = 'previous'; next.dataset.pickerAction = 'next';
      if (mode !== 'days') {
        const grid = node(doc, 'div', 'ds-picker-months');
        for (let index = 0; index < 12; index++) {
          const date = parseDate(String(mode === 'years' ? view.getUTCFullYear() + index : view.getUTCFullYear()).padStart(4, '0') + '-' + pad(mode === 'years' ? 1 : index + 1) + '-01');
          const text = mode === 'years' ? String(date.getUTCFullYear()) : new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date);
          const cell = newButton(text, 'ds-picker-cell');
          cell.dataset.pickerAction = mode === 'years' ? 'year' : 'month';
          cell.dataset.date = dateValue(date);
          const selected = type === 'week' ? weekStart(draft) : parseDate(draft);
          cell.setAttribute('aria-pressed', String(Boolean(selected && selected.getUTCFullYear() === date.getUTCFullYear() && (mode === 'years' || selected.getUTCMonth() === date.getUTCMonth()))));
          if (mode === 'months' && type === 'month') cell.disabled = !accepts(dateValue(date).slice(0, 7));
          grid.append(cell);
        }
        panel.append(grid);
        return;
      }
      const grid = node(doc, 'div', 'ds-picker-days');
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-label', monthName(view));
      const headings = node(doc, 'div', 'ds-picker-weekdays');
      headings.setAttribute('role', 'row');
      for (let index = 0; index < 7; index++) {
        const date = new Date(Date.UTC(2026, 10, 2 + index));
        const heading = node(doc, 'span', '', new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date));
        heading.setAttribute('role', 'columnheader'); headings.append(heading);
      }
      grid.append(headings);
      const dates = calendarDays(view.getUTCFullYear(), view.getUTCMonth());
      let firstEnabled = null, preferred = null;
      for (let row = 0; row < 6; row++) {
        const week = node(doc, 'div', 'ds-picker-week'); week.setAttribute('role', 'row');
        for (const date of dates.slice(row * 7, row * 7 + 7)) {
          const candidate = dateCandidate(date), cell = newButton(String(date.getUTCDate()), 'ds-picker-cell');
          cell.dataset.pickerAction = 'day'; cell.dataset.date = dateValue(date);
          cell.dataset.outside = String(date.getUTCMonth() !== view.getUTCMonth());
          cell.setAttribute('role', 'gridcell');
          cell.setAttribute('aria-label', new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(date) + (type === 'week' ? ', ' + weekValue(date) : ''));
          cell.setAttribute('aria-selected', String(Boolean(draft && (type === 'week' ? draft === candidate : draft.slice(0, 10) === dateValue(date)))));
          if (dateValue(date) === dateValue(today())) cell.setAttribute('aria-current', 'date');
          cell.disabled = !accepts(candidate);
          cell.tabIndex = -1;
          if (!cell.disabled && !firstEnabled) firstEnabled = cell;
          if (!cell.disabled && dateValue(date) === dateValue(activeDate || today())) preferred = cell;
          week.append(cell);
        }
        grid.append(week);
      }
      (preferred || firstEnabled)?.setAttribute('tabindex', '0');
      panel.append(grid);
    }
    function renderTime() {
      const selected = (type === 'datetime-local' ? draft.split('T')[1] : draft) || '00:00';
      const [hour, minute] = selected.split(':').map(Number);
      const columns = node(doc, 'div', 'ds-picker-time');
      for (const [unit, length, current] of [['hour', 24, hour], ['minute', 60, minute]]) {
        const column = node(doc, 'div', 'ds-picker-time-column');
        column.setAttribute('role', 'group'); column.setAttribute('aria-label', unit === 'hour' ? 'Hours' : 'Minutes');
        for (let number = 0; number < length; number++) {
          const time = (unit === 'hour' ? pad(number) : pad(hour)) + ':' + (unit === 'minute' ? pad(number) : pad(minute));
          const candidate = type === 'datetime-local' ? (draft.split('T')[0] || dateValue(today())) + 'T' + time : time;
          const cell = newButton(pad(number), 'ds-picker-cell');
          cell.dataset.pickerAction = 'time'; cell.dataset.value = candidate;
          cell.setAttribute('aria-label', (unit === 'hour' ? 'Hour ' : 'Minute ') + pad(number));
          cell.setAttribute('aria-pressed', String(number === current));
          cell.disabled = !accepts(candidate);
          // Permit changing hours even when the current minute is not on the allowed step.
          if (unit === 'hour' && cell.disabled) {
            for (let minute = 0; minute < 60; minute++) {
              const alternative = candidate.slice(0, -2) + pad(minute);
              if (accepts(alternative)) { cell.disabled = false; cell.dataset.value = alternative; break; }
            }
          }
          column.append(cell);
        }
        columns.append(column);
      }
      panel.append(columns);
    }
    function renderColour() {
      const palette = node(doc, 'div', 'ds-picker-palette');
      const styles = doc.defaultView.getComputedStyle(root);
      const colours = [...new Set(['--ds-colour-accent', ...Array.from({ length: 6 }, (_, i) => '--ds-accent-' + (i + 1)), '--ds-colour-text', '--ds-colour-panel']
        .map(token => styles.getPropertyValue(token).trim()).filter(value => /^#[a-f\d]{6}$/i.test(value)))];
      for (const colour of colours) {
        const swatch = newButton('', 'ds-picker-colour', colour);
        swatch.style.backgroundColor = colour;
        swatch.dataset.pickerAction = 'colour'; swatch.dataset.value = colour;
        swatch.setAttribute('aria-pressed', String(colour.toLowerCase() === draft.toLowerCase()));
        palette.append(swatch);
      }
      panel.append(palette);
    }
    function render() {
      panel.replaceChildren();
      if (colour) renderColour();
      else {
        if (type !== 'time') renderCalendar();
        if (type === 'time' || type === 'datetime-local') renderTime();
      }
      const entryLabel = node(doc, 'label', 'ds-picker-entry-label', colour ? 'Hex colour' : type === 'time' ? 'Time · HH:MM[:SS]' : type === 'week' ? 'Week · YYYY-Www' : type === 'month' ? 'Month · YYYY-MM' : type === 'datetime-local' ? 'Date and time · YYYY-MM-DDTHH:MM' : 'Date · YYYY-MM-DD');
      const entry = node(doc, 'input', 'ds-field-control ds-picker-entry');
      entry.type = 'text'; entry.value = draft; entry.setAttribute('aria-label', entryLabel.textContent);
      entry.dataset.pickerEntry = '';
      entry.autocomplete = 'off';
      entryLabel.append(entry); panel.append(entryLabel);
      const footer = node(doc, 'div', 'ds-picker-footer');
      const clear = newButton('Clear', 'ds-picker-action'), current = newButton(type === 'month' ? 'This month' : type === 'week' ? 'This week' : type === 'time' ? 'Now' : 'Today', 'ds-picker-action');
      clear.dataset.pickerAction = 'clear'; clear.disabled = control.required;
      current.dataset.pickerAction = 'today';
      const apply = newButton('Apply', 'ds-picker-action ds-picker-apply');
      apply.dataset.pickerAction = 'apply'; apply.disabled = !accepts(draft);
      if (!colour) footer.append(clear);
      if (!colour) footer.append(current);
      footer.append(apply); panel.append(footer);
      // Keep an independently editable value for precise steps, seconds and distant years.
      entry.setAttribute('aria-invalid', String(Boolean(draft) && !accepts(draft)));
    }
    function open() {
      if (control.disabled || control.matches(':disabled') || control.readOnly) return;
      draft = control.value;
      view = (type === 'week' ? weekStart(draft) : parseDate(draft)) || parseDate(control.min) || today();
      activeDate = new Date(view); view.setUTCDate(1);
      mode = type === 'month' ? 'months' : 'days';
      render(); surface.open();
      (panel.querySelector('[tabindex="0"]') || panel.querySelector('[aria-pressed=true]:not(:disabled)') || panel.querySelector('input'))?.focus();
    }
    listen(trigger, 'click', () => surface.opened ? surface.close() : open());
    listen(trigger, 'keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); open(); }
    });
    listen(panel, 'input', event => {
      if (!event.target.hasAttribute('data-picker-entry')) return;
      draft = event.target.value;
      event.target.setAttribute('aria-invalid', String(!accepts(draft)));
      panel.querySelector('[data-picker-action=apply]').disabled = !accepts(draft);
    });
    listen(panel, 'click', event => {
      const action = event.target.closest('[data-picker-action]');
      if (!action || action.disabled) return;
      const date = parseDate(action.dataset.date);
      switch (action.dataset.pickerAction) {
        case 'previous': case 'next': {
          const direction = action.dataset.pickerAction === 'next' ? 1 : -1;
          if (mode === 'days') view.setUTCMonth(view.getUTCMonth() + direction);
          else view.setUTCFullYear(Math.max(1, Math.min(9988, view.getUTCFullYear() + direction * (mode === 'years' ? 12 : 1))));
          render(); panel.querySelector('[data-picker-action=' + action.dataset.pickerAction + ']')?.focus(); break;
        }
        case 'mode':
          mode = mode === 'days' ? 'months' : mode === 'months' ? 'years' : (type === 'month' ? 'months' : 'days');
          render(); panel.querySelector('[data-picker-action=mode]')?.focus(); break;
        case 'year': view.setUTCFullYear(date.getUTCFullYear()); mode = 'months'; render(); panel.querySelector('[data-picker-action=month]')?.focus(); break;
        case 'month':
          view = date;
          if (type === 'month') commit(dateValue(date).slice(0, 7));
          else { mode = 'days'; render(); panel.querySelector('[tabindex="0"]')?.focus(); }
          break;
        case 'day': setDate(date); if (surface.opened) panel.querySelector('[tabindex="0"]')?.focus(); break;
        case 'time': draft = action.dataset.value; render(); panel.querySelector('[data-value="' + draft + '"]')?.focus(); break;
        case 'colour': commit(action.dataset.value); break;
        case 'clear': commit(''); break;
        case 'today': {
          const now = new Date();
          const candidate = type === 'time' ? pad(now.getHours()) + ':' + pad(now.getMinutes()) : dateCandidate(today());
          draft = candidate; view = today(); view.setUTCDate(1); activeDate = today(); render();
          panel.querySelector('[data-picker-action=apply]')?.focus(); break;
        }
        case 'apply': commit(draft); break;
      }
    });
    listen(panel, 'keydown', event => {
      if (event.target.hasAttribute('data-picker-entry') && event.key === 'Enter') { event.preventDefault(); commit(draft); return; }
      const cell = event.target.closest('[role=gridcell]');
      if (!cell || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
      event.preventDefault();
      const date = parseDate(cell.dataset.date), weekday = (date.getUTCDay() + 6) % 7;
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        const originalDay = date.getUTCDate();
        date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + (event.key === 'PageDown' ? 1 : -1));
        const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
        date.setUTCDate(Math.min(originalDay, last.getUTCDate()));
      } else date.setUTCDate(date.getUTCDate() + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday })[event.key]);
      if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
      if (!accepts(dateCandidate(date))) {
        const direction = ['ArrowLeft', 'ArrowUp', 'Home', 'PageUp'].includes(event.key) ? -1 : 1;
        let attempts = 366;
        while (attempts-- > 0 && !accepts(dateCandidate(date))) date.setUTCDate(date.getUTCDate() + direction);
        if (!accepts(dateCandidate(date))) return;
      }
      activeDate = date; view = new Date(date); view.setUTCDate(1); render();
      const next = panel.querySelector('[data-date="' + dateValue(date) + '"]');
      if (next && !next.disabled) { panel.querySelectorAll('[role=gridcell]').forEach(cell => { cell.tabIndex = -1; }); next.tabIndex = 0; next.focus(); }
      else panel.querySelector('[tabindex="0"]')?.focus();
    });
    function sync() {
      if (periodFallback) {
        if (control.validationMessage === fallbackError || !control.willValidate) control.setCustomValidity('');
        fallbackError = accepts(control.value) ? '' : 'Choose a valid ' + (type === 'week' ? 'ISO week' : 'month') + ' within the allowed range and step.';
        if (fallbackError && !control.validity.customError) control.setCustomValidity(fallbackError);
      }
      trigger.disabled = control.disabled || control.matches(':disabled');
      trigger.setAttribute('aria-readonly', String(control.readOnly));
      let text = control.value;
      if (text && ['date', 'month'].includes(type)) {
        const date = parseDate(text);
        if (date) text = new Intl.DateTimeFormat(locale, { ...(type === 'month' ? { month: 'long', year: 'numeric' } : { dateStyle: 'medium' }), timeZone: 'UTC' }).format(date);
      } else if (type === 'datetime-local') text = text.replace('T', ' · ');
      value.textContent = text || (colour ? '#000000' : 'Choose ' + (type === 'datetime-local' ? 'date and time' : type) + '…');
      trigger.dataset.placeholder = String(!control.value);
      if (colour) icon.style.backgroundColor = control.value;
      if (trigger.disabled || control.readOnly) surface.close();
    }
    sync();
    return { target: trigger, sync, close: surface.close, destroy() { surface.destroy(); trigger.remove(); panel.remove(); restore(control); } };
  }
  return Object.freeze({ enhance, dateValue, parseDate, weekValue, weekStart, calendarDays, validPeriod });
});
