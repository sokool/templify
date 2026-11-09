export function init(element) {
  return { element, update({ current } = {}) {
    if (!Number.isInteger(current) || current < 0) return;
    [...element.querySelectorAll('li')].forEach((row, index) => {
      row.dataset.status = index < current ? 'done' : index === current ? 'current' : 'pending';
      if (index === current) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current');
      row.querySelector('.ds-step-marker').textContent = index < current ? '✓' : String(index + 1);
      row.querySelector('.ds-step-status').textContent = index < current ? 'Completed' : index === current ? 'Current step' : 'Upcoming';
    });
  } };
}
