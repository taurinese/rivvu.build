import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Démarrage', () => {
  test('la page d’accueil affiche Rivvu', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rivvu/);
    await expect(page.getByRole('heading', { level: 1, name: 'Rivvu' })).toBeVisible();
  });

  test('aucune violation d’accessibilité WCAG A/AA', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('aucun défilement horizontal', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
