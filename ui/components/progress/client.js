export function init(element) {
  const bar = element.querySelector('progress'), output = element.querySelector('[data-progress-value]');
  function update({ value, max, indeterminate } = {}) {
    if (max !== undefined) bar.max = Math.max(1, Number(max) || 100);
    if (value !== undefined) bar.value = Math.max(0, Math.min(bar.max, Number(value) || 0));
    if (indeterminate === true) bar.removeAttribute('value');
    else if (indeterminate === false && !bar.hasAttribute('value')) bar.value = 0;
    if (output) output.textContent = bar.hasAttribute('value') ? Math.round(bar.value / bar.max * 100) + '%' : '';
  }
  return { element, update };
}
