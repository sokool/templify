export function init(element) {
  return {
    element,
    update({ label, disabled, icon, variant } = {}) {
      if (label !== undefined) element.querySelector('[data-button-label]').textContent = label;
      if (disabled !== undefined) element.disabled = Boolean(disabled);
      if (variant !== undefined) element.dataset.variant = variant;
      if (icon !== undefined) {
        let slot = element.querySelector('[data-button-icon]');
        if (!slot) { slot = element.ownerDocument.createElement('span'); slot.dataset.buttonIcon = ''; slot.setAttribute('aria-hidden', 'true'); element.prepend(slot); }
        slot.replaceChildren();
        if (icon?.nodeType) slot.append(icon);
        slot.hidden = !icon;
      }
    },
  };
}
