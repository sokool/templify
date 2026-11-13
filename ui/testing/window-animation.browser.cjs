const { test, expect } = require('@playwright/test');
const path = require('node:path');

async function mount(page, options) {
  await page.setContent('<button id="opener">Open window</button><div id="host"></div>');
  for (const file of ['defaults.css', 'primitives.css', 'components/window/window.css']) {
    await page.addStyleTag({ path: path.resolve(__dirname, '..', file) });
  }
  await page.addScriptTag({ path: path.resolve(__dirname, '../components/window/window.js') });
  await page.evaluate(options => {
    window.testWindow = DesignSystemWindow.mount(document.getElementById('host'), {
      width: 360, duration: 220, title: 'Animation preview', ...options,
    });
  }, options);
}

async function captureMotion(page) {
  return page.evaluate(async () => {
    const view = window.testWindow, element = view.element;
    function sample() {
      const style = getComputedStyle(element), matrix = new DOMMatrixReadOnly(style.transform);
      return { x: matrix.e, y: matrix.f, scaleX: matrix.a, scaleY: matrix.d, opacity: Number(style.opacity) };
    }
    async function frames() {
      const animation = element.getAnimations().find(animation => animation.effect.target === element
        && !animation.effect.pseudoElement);
      animation.pause();
      await animation.ready;
      const duration = animation.effect.getTiming().duration;
      return { name: animation.animationName, samples: [0, 0.25, 0.5, 0.75, 1].map(progress => {
        animation.currentTime = duration * progress;
        return sample();
      }) };
    }
    view.open();
    const width = element.offsetWidth, height = element.offsetHeight, opening = await frames();
    // Release manually controlled entry effects so they cannot override the exit.
    element.getAnimations().forEach(animation => animation.cancel());
    view.close('test');
    return { width, height, opening, closing: await frames(), openWhileClosing: element.open };
  });
}

for (const side of ['left', 'right', 'top', 'bottom']) {
  for (const lockScroll of [true, false]) {
    test(`${side} ${lockScroll ? 'blocking' : 'nonblocking'} panel slides from its edge without fading or scaling`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const vertical = ['top', 'bottom'].includes(side), axis = vertical ? 'y' : 'x', otherAxis = vertical ? 'x' : 'y';
      await mount(page, { mode: 'side', side, lockScroll, ...(vertical ? { height: 300 } : {}) });
      const motion = await captureMotion(page), extent = vertical ? motion.height : motion.width;
      const offset = (['left', 'top'].includes(side) ? -1 : 1) * extent;
      expect(motion.opening.name).toBe('ds-window-slide-in');
      expect(motion.closing.name).toBe('ds-window-slide-out');
      expect(motion.opening.samples[0][axis]).toBeCloseTo(offset);
      expect(motion.opening.samples.at(-1)[axis]).toBeCloseTo(0);
      expect(motion.closing.samples[0][axis]).toBeCloseTo(0);
      expect(motion.closing.samples.at(-1)[axis]).toBeCloseTo(offset);
      for (const frame of [...motion.opening.samples, ...motion.closing.samples]) {
        expect(frame.opacity).toBe(1);
        expect(frame.scaleX).toBe(1);
        expect(frame.scaleY).toBe(1);
        expect(frame[otherAxis]).toBe(0);
      }
      for (const frame of [motion.opening.samples[2], motion.closing.samples[2]]) {
        expect(Math.abs(frame[axis])).toBeGreaterThan(0);
        expect(Math.abs(frame[axis])).toBeLessThan(extent);
        expect(Math.sign(frame[axis])).toBe(Math.sign(offset));
      }
      expect(motion.openWhileClosing).toBe(true);
      await expect(page.locator('.ds-window')).toBeHidden();
      await expect(page.locator('.ds-window')).toHaveJSProperty('returnValue', 'test');
    });
  }
}

test('centred popup keeps its fade and scale animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { mode: 'modal' });
  const motion = await captureMotion(page);
  expect(motion.opening.name).toBe('ds-window-enter');
  expect(motion.closing.name).toBe('ds-window-exit');
  expect(motion.opening.samples[0]).toMatchObject({ x: 0, y: 0, opacity: 0 });
  expect(motion.opening.samples[0].scaleX).toBeCloseTo(0.985);
  expect(motion.opening.samples.at(-1)).toMatchObject({ scaleX: 1, scaleY: 1, opacity: 1 });
  expect(motion.closing.samples.at(-1).opacity).toBe(0);
  expect(motion.closing.samples.at(-1).scaleX).toBeCloseTo(0.985);
  await expect(page.locator('.ds-window')).toBeHidden();
});

test('nested centred popup does not inherit side-panel motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { mode: 'modal' });
  await page.evaluate(() => {
    const parent = document.getElementById('host');
    parent.className = 'ds-window';
    parent.dataset.mode = 'side';
    parent.dataset.side = 'left';
    parent.append(window.testWindow.element);
  });
  const motion = await captureMotion(page);
  expect(motion.opening.name).toBe('ds-window-enter');
  expect(motion.closing.name).toBe('ds-window-exit');
  expect(motion.opening.samples[0]).toMatchObject({ x: 0, y: 0, opacity: 0 });
  await expect(page.locator('dialog.ds-window')).toBeHidden();
});

test('side-panel animation remains disabled while resizing but slides out afterwards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { mode: 'side', side: 'left', resizable: true });
  const names = await page.evaluate(() => {
    const view = window.testWindow, element = view.element;
    view.open();
    element.getAnimations().forEach(animation => animation.finish());
    const grip = element.querySelector('.ds-window-resize');
    grip.setPointerCapture = () => {};
    grip.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 360, clientY: 100 }));
    const duringResize = getComputedStyle(element).animationName;
    grip.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    const afterResize = getComputedStyle(element).animationName;
    view.close();
    return [duringResize, afterResize, getComputedStyle(element).animationName];
  });
  expect(names).toEqual(['none', 'none', 'ds-window-slide-out']);
  await expect(page.locator('.ds-window')).toBeHidden();
});

test('reduced motion disables both side-panel animations and closes immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const side of ['left', 'right', 'top', 'bottom']) {
    await mount(page, { mode: 'side', side });
    const state = await page.evaluate(() => {
      const view = window.testWindow;
      view.open();
      const style = getComputedStyle(view.element);
      const result = { animation: style.animationName, transform: style.transform, opacity: style.opacity };
      view.close();
      return { ...result, openAfterClose: view.element.open };
    });
    expect(state).toEqual({ animation: 'none', transform: 'none', opacity: '1', openAfterClose: false });
    await page.evaluate(() => window.testWindow.destroy());
  }
});
