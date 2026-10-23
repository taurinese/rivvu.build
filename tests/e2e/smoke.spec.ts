import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

async function createJiyanBuild(page: Page) {
  await page.goto('/nouveau');
  await page.getByRole('searchbox', { name: 'Rechercher un Résonateur' }).fill('Jiyan');
  await page
    .getByRole('list', { name: 'Résonateurs' })
    .getByRole('button', { name: /Jiyan/ })
    .click();
  await page.getByRole('button', { name: 'Créer un build Jiyan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeVisible();
}

test.describe('Rivvu', () => {
  test('accueil : titre, état vide, accessibilité', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rivvu/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mes builds' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aucun build pour l’instant' })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('sélecteur de Résonateur accessible et sans défilement horizontal', async ({ page }) => {
    await page.goto('/nouveau');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Choisir un Résonateur' }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Résonateurs' }).getByRole('button').first(),
    ).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('crée un build, le retrouve après rechargement, puis le supprime', async ({ page }) => {
    await createJiyanBuild(page);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeVisible();

    await page.goto('/');
    await expect(
      page.getByRole('list', { name: 'Builds' }).getByRole('link', { name: /Jiyan/ }),
    ).toBeVisible();

    await page.getByRole('list', { name: 'Builds' }).getByRole('link', { name: /Jiyan/ }).click();
    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    await page.getByRole('button', { name: 'Supprimer ce build' }).click();
    await expect(page.getByRole('heading', { name: 'Aucun build pour l’instant' })).toBeVisible();
  });

  test('réglages : le thème clair s’applique et persiste', async ({ page }) => {
    await page.goto('/reglages');
    await page.getByRole('radio', { name: 'Clair' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectAccessible(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('navigation adaptée à la largeur d’écran', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      await expect(page.getByRole('navigation', { name: 'Onglets' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden();
    } else {
      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Onglets' })).toBeHidden();
    }
  });
});
