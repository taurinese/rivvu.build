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

  test('équipe une arme et voit les stats évoluer', async ({ page }) => {
    await createJiyanBuild(page);
    await page.getByRole('link', { name: 'Choisir une arme' }).click();
    await page
      .getByRole('list', { name: 'Armes disponibles' })
      .getByRole('button', { name: /Sommet verdoyant/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Arme équipée' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('link', { name: 'Jiyan', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sommet verdoyant/ })).toBeVisible();
    await expect(page.getByText('198,6\u202f%')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('équipe des Échos et règle leurs sous-stats', async ({ page }) => {
    await createJiyanBuild(page);
    await page
      .getByRole('navigation', { name: 'Étapes du build' })
      .getByRole('link', { name: /Échos/ })
      .click();
    await page.getByRole('button', { name: 'Ajouter un Écho' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter un Écho' });
    await expect(dialog).toBeVisible();
    await expectAccessible(page);
    await dialog.getByRole('searchbox', { name: 'Rechercher un Écho' }).fill('Feilian');
    await dialog
      .getByRole('list', { name: 'Échos disponibles' })
      .getByRole('button', { name: /^C4\s*Feilian Beringal/ })
      .click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Ajouter une sous-stat' }).click();
    await page
      .getByRole('radiogroup', { name: 'Valeur de Taux crit.' })
      .getByRole('radio', { name: '10,5' })
      .click();
    await expect(page.getByText('Valeur crit. 21,0')).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('dégâts estimés : situation, buff et coéquipier', async ({ page }) => {
    await createJiyanBuild(page);
    await page.getByRole('link', { name: 'Détails' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dégâts estimés' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lance solitaire' })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await page.getByRole('radio', { name: '40 %' }).click();
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('textbox', { name: 'Nom du buff 1' })).toHaveValue('Nouveau buff');
    await page.getByRole('button', { name: 'Coéquipier 1' }).click();
    const sheet = page.getByRole('dialog', { name: 'Choisir un coéquipier' });
    await expectAccessible(page);
    await sheet.getByRole('button', { name: 'Verina' }).click();
    await expect(page.getByRole('button', { name: 'Retirer Verina de l’équipe' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('radio', { name: '40 %' })).toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Nom du buff 1' })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
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

test('chaque nouvelle page s’ouvre en haut', async ({ page }) => {
  await page.goto('/nouveau');
  await page.mouse.wheel(0, 4000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Créer un build Jiyan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
