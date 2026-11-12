const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(path.resolve(__dirname, '../../workspace/kanban-header-designs.html')).href;

test('eight header proposals switch without rebuilding cards or changing counts', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const preview = page.locator('#board-preview');
  const choices = page.locator('.study-choice');
  await expect(choices).toHaveCount(8);
  expect(await choices.evaluateAll(nodes => nodes.map(node => node.dataset.design))).toEqual([
    'folder', 'big-counter', 'underline', 'label', 'steps', 'divider', 'tint', 'split',
  ]);
  expect(await page.locator('.study-choice[data-preserved="true"] .study-choice-number').allTextContents()).toEqual(['03', '05', '07']);
  await expect(preview.locator('.ds-card')).toHaveCount(19);
  await page.evaluate(() => { window.originalCard = document.querySelector('#board-preview .ds-card'); });
  const counts = await preview.locator('.ds-kanban__count').allTextContents();
  const cardStyles = await preview.locator('.ds-card').first().evaluate(node => {
    const style = getComputedStyle(node);
    return [style.backgroundColor, style.borderRadius, style.borderBottomWidth, style.color];
  });

  for (let index = 0; index < 8; index++) {
    const choice = choices.nth(index);
    await choice.click();
    await expect(preview).toHaveAttribute('data-header-design', await choice.getAttribute('data-design'));
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.study-choice[aria-pressed="true"]')).toHaveCount(1);
    await expect(preview.locator('.ds-kanban__count')).toHaveText(counts);
    expect(await page.evaluate(() => window.originalCard === document.querySelector('#board-preview .ds-card'))).toBe(true);
    expect(await preview.locator('.ds-card').first().evaluate(node => {
      const style = getComputedStyle(node);
      return [style.backgroundColor, style.borderRadius, style.borderBottomWidth, style.color];
    })).toEqual(cardStyles);
    await expect(page).toHaveURL(new RegExp('#0' + (index + 1) + '$'));
  }
  expect(errors).toEqual([]);
});

test('comparison restores the original header and returns to the keyboard-selected proposal', async ({ page }) => {
  await page.goto(url + '#03');
  const preview = page.locator('#board-preview');
  const choice = page.locator('[data-design="label"]');
  await choice.focus();
  await choice.press('Enter');
  await expect(preview).toHaveAttribute('data-header-design', 'label');
  await expect(choice).toBeFocused();

  const compare = page.locator('#compare-toggle');
  await compare.click();
  await expect(preview).toHaveAttribute('data-header-design', 'current');
  await expect(preview.locator('.ds-kanban__heading').first()).toHaveCSS('border-left-width', '0px');
  await expect(preview.locator('.ds-kanban__heading').first()).toHaveCSS('border-bottom-width', '2px');
  await expect(compare).toHaveAttribute('aria-pressed', 'true');
  await compare.click();
  await expect(preview).toHaveAttribute('data-header-design', 'label');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await expect(compare).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(preview).toHaveAttribute('data-header-design', 'label');
});

test('dark and mobile previews retain choices without overflowing the document', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + '#07');
  const preview = page.locator('#board-preview');
  await expect(preview).toHaveAttribute('data-header-design', 'tint');
  await expect(preview).toHaveAttribute('data-device', 'mobile');
  await expect(page.locator('.study-choice')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const heading = preview.locator('.ds-kanban__heading').first();
  const lightBackground = await heading.evaluate(node => getComputedStyle(node).backgroundColor);
  for (const theme of ['dark', 'light']) {
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-ds-theme', theme);
    await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', String(theme === 'dark'));
    if (theme === 'dark') {
      expect(await heading.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe(lightBackground);
    }
    for (const choice of await page.locator('.study-choice').all()) {
      await choice.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await heading.evaluate(node => {
        const box = node.getBoundingClientRect();
        const name = node.firstElementChild.getBoundingClientRect();
        const count = node.lastElementChild.getBoundingClientRect();
        return name.left >= box.left && name.right <= box.right &&
          count.left >= box.left && count.right <= box.right &&
          (name.right <= count.left || count.right <= name.left);
      })).toBe(true);
    }
  }
});

test('new header designs retain live counts when cards change columns', async ({ page }) => {
  await page.goto(url);
  const preview = page.locator('#board-preview');
  const card = preview.locator('[data-item-id="card-1"] .ds-card__main');
  const firstCount = preview.locator('.ds-kanban__count').nth(0);
  const secondCount = preview.locator('.ds-kanban__count').nth(1);
  for (const design of ['folder', 'big-counter', 'label', 'divider', 'split']) {
    await page.locator('[data-design="' + design + '"]').click();
    await card.focus();
    await card.press('Alt+ArrowRight');
    await expect(firstCount).toHaveText('3');
    await expect(secondCount).toHaveText('6');
    await expect(preview).toHaveAttribute('data-header-design', design);
    await card.press('Alt+ArrowLeft');
    await expect(firstCount).toHaveText('4');
    await expect(secondCount).toHaveText('5');
  }
});

test('standalone HTML uses Underline without JavaScript or host styles', async ({ page }) => {
  const component = path.resolve(__dirname, '../components/kanban-board');
  await page.setContent(fs.readFileSync(path.join(component, 'kanban-board.html'), 'utf8'));
  for (const file of ['../defaults.css', '../primitives.css', '../components/kanban-board/kanban-board.css']) {
    await page.addStyleTag({ path: path.resolve(__dirname, file) });
  }
  const heading = page.locator('.ds-kanban__heading').first();
  const count = heading.locator('.ds-kanban__count');
  await expect(heading).toHaveCSS('border-top-width', '0px');
  await expect(heading).toHaveCSS('border-left-width', '0px');
  await expect(heading).toHaveCSS('border-right-width', '0px');
  await expect(heading).toHaveCSS('border-bottom-width', '2px');
  await expect(heading).toHaveCSS('border-radius', '0px');
  await expect(heading).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(heading).toHaveCSS('margin', '0px 10px 4px');
  await expect(heading).toHaveCSS('padding', '10px 2px');
  await expect(count).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(count).toHaveCSS('font-size', '11px');
  await expect(count).toHaveCSS('font-weight', '500');

  for (const theme of ['light', 'dark', 'matrix']) {
    await page.evaluate(theme => { document.documentElement.dataset.dsTheme = theme; }, theme);
    const accent = await page.locator('html').evaluate(node => getComputedStyle(node).getPropertyValue('--ds-colour-accent').trim());
    const expected = await page.evaluate(accent => {
      const probe = document.createElement('span');
      probe.style.color = accent;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }, accent);
    await expect(heading).toHaveCSS('border-bottom-color', expected);
    await expect(count).toHaveCSS('color', expected);
  }
  await page.locator('.ds-kanban__column').first().evaluate(node => {
    node.style.setProperty('--ds-kanban-column-colour', '#4179b2');
  });
  await expect(heading).toHaveCSS('border-bottom-color', 'rgb(65, 121, 178)');
  await expect(count).toHaveCSS('color', 'rgb(65, 121, 178)');
});

test('the main Kanban page matches the selected Underline proposal', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 1100 });
  const main = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;
  await page.goto(main + '#topschrank.components.kanbanboard');
  const board = page.locator('.example-page[data-example="kanban"] .ds-kanban');
  await expect(board.locator('.ds-kanban__heading')).toHaveCount(7);
  await expect(board.locator('.ds-card')).toHaveCount(19);
  const appearances = nodes => nodes.map(node => {
    const heading = getComputedStyle(node);
    const count = getComputedStyle(node.querySelector('.ds-kanban__count'));
    return [heading.borderBottomColor, heading.borderBottomWidth, heading.borderLeftWidth,
      heading.backgroundColor, heading.borderRadius, heading.margin, heading.padding,
      heading.minHeight, count.color, count.backgroundColor, count.fontSize, count.fontWeight];
  });
  const mainAppearance = await board.locator('.ds-kanban__heading').evaluateAll(appearances);
  expect(new Set(mainAppearance.map(styles => styles[0])).size).toBe(7);
  await page.goto(url + '#03');
  const proposal = page.locator('#board-preview .ds-kanban__heading');
  expect(await proposal.evaluateAll(appearances)).toEqual(mainAppearance);
  await page.locator('#compare-toggle').click();
  expect(await proposal.evaluateAll(appearances)).toEqual(mainAppearance);
});
