// Accessibility and banner checks on every route: axe-core with no serious or
// critical violations; banner, noindex and no images on every page; no sideways scroll at 390px.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const BANNER = 'Concept prototype · invented data';
const ROUTES = ['/', '/check-in/hearthline', '/check-in/ferrocycle', '/check-in/fairpath', '/impact', '/platform', '/end'];

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const route of ROUTES) {
  test(`route ${route}: axe, banner, noindex, no images`, async ({ page }) => {
    await page.goto(`/#${route}`);
    await page.waitForLoadState('networkidle');
    expect(await axe(page)).toEqual([]);
    await expect(page.getByText(BANNER)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    // No logo or photo anywhere: Pulse ships no images.
    await expect(page.locator('img')).toHaveCount(0);
  });
}

test('drawers and the queried-value form pass axe', async ({ page }) => {
  await page.goto('/#/impact');
  await page.getByRole('button', { name: 'Open Hearthline' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('queue-tangfarm_harvest').getByRole('button', { name: /^History/ }).click();
  expect(await axe(page)).toEqual([]);
  await page.goto('/#/platform');
  await page.getByRole('button', { name: 'Open request from Fairpath Credit' }).click();
  await page.getByTestId('helper-0').getByRole('button', { name: 'Draft intro' }).click();
  expect(await axe(page)).toEqual([]);
  await page.goto('/#/check-in/fairpath');
  await page.getByRole('button', { name: 'Answer in the check-in' }).click();
  await expect(page.getByText('The impact team asked:')).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('the drawer is a proper dialog: focus moves in, Escape closes, focus returns', async ({ page }) => {
  await page.goto('/#/impact');
  const opener = page.getByRole('button', { name: 'Open Hearthline' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of ROUTES) {
    test(`route ${route}: no horizontal scroll at 390px`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    });
  }
});
