import { readFileSync } from 'node:fs';
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

  test('partage : lien ouvert ailleurs, ajouté à ses builds, export PNG', async ({
    page,
    browser,
  }) => {
    await createJiyanBuild(page);
    await page.getByRole('button', { name: 'Partager' }).click();
    const sheet = page.getByRole('dialog', { name: 'Partager ce build' });
    const link = sheet.getByRole('textbox', { name: 'Lien du build' });
    await expect(link).toHaveValue(/\/partage#[\w-]+$/);
    await expectAccessible(page);

    const download = page.waitForEvent('download');
    await sheet.getByRole('button', { name: 'Exporter en image' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^rivvu-jiyan-.+\.png$/);
    const png = readFileSync(await file.path());
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    await expect(sheet.getByRole('status')).toHaveText('Image exportée.');

    // Un autre navigateur, sans données : comme un ami qui reçoit le lien.
    const url = await link.inputValue();
    const context = await browser.newContext(test.info().project.use);
    const friend = await context.newPage();
    await friend.goto(url);
    await expect(friend.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeVisible();
    await expectAccessible(friend);
    await expectNoHorizontalScroll(friend);
    await friend.getByRole('button', { name: 'Ajouter à mes builds' }).click();
    await expect(friend).toHaveURL(/\/builds\/[\w-]+$/);
    await context.close();
  });

  test('comparateur : duplique un build et compare les deux', async ({ page }) => {
    await createJiyanBuild(page);
    await page.getByRole('button', { name: 'Dupliquer' }).click();
    await expect(page.getByRole('button', { name: /\(copie\)/ })).toBeVisible();
    await page.getByRole('link', { name: 'Comparer' }).last().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Comparer' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Dégâts comparés' })).toContainText(
      'Coup le plus fort',
    );
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('optimiseur : calcule dans un Worker et équipe la meilleure option', async ({ page }) => {
    await createJiyanBuild(page);
    await page
      .getByRole('navigation', { name: 'Étapes du build' })
      .getByRole('link', { name: /Échos/ })
      .click();
    await page.getByRole('button', { name: 'Ajouter un Écho' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajouter un Écho' });
    await dialog.getByRole('searchbox', { name: 'Rechercher un Écho' }).fill('Feilian');
    await dialog
      .getByRole('list', { name: 'Échos disponibles' })
      .getByRole('button', { name: /^C4\s*Feilian Beringal/ })
      .click();
    await page.getByRole('link', { name: 'Jiyan' }).first().click();

    await page.getByRole('link', { name: 'Optimiser' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Optimiseur d’Échos' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Lancer l’optimisation' }).click();
    const first = page.locator('section', { has: page.getByRole('heading', { name: 'Option 1' }) });
    await expect(first).toContainText('Feilian');
    await first.getByRole('button', { name: 'Équiper' }).click();
    await expect(first).toContainText('Équipée');
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });

  test('import d’une capture : OCR local, auto-hébergé', async ({ page }) => {
    test.slow();
    await createJiyanBuild(page);
    await page
      .getByRole('navigation', { name: 'Étapes du build' })
      .getByRole('link', { name: /Échos/ })
      .click();
    // Capture synthétique au style du jeu : texte clair sur fond sombre.
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 520;
      canvas.height = 330;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#16191c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f2f2f2';
      ctx.font = '600 26px Arial';
      [
        'Feilian Beringal',
        'COST 4',
        'Crit. DMG 44.0%',
        'ATK 150',
        'Crit. Rate 8.1%',
        'Energy Regen 9.2%',
      ].forEach((line, i) => {
        ctx.fillText(line, 24, 44 + i * 50);
      });
      return canvas.toDataURL('image/png');
    });
    await page.getByLabel('Capture d’un Écho').setInputFiles({
      name: 'echo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64'),
    });
    const sheet = page.getByRole('dialog', { name: 'Importer une capture' });
    await expect(sheet.getByRole('button', { name: 'Ajouter cet Écho' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(sheet).toContainText('Feilian Beringal');
    await expect(sheet).toContainText('Taux crit.');
    await expectAccessible(page);
    await sheet.getByRole('button', { name: 'Ajouter cet Écho' }).click();
    await expect(
      page.getByRole('list', { name: 'Emplacements d’Échos' }).getByText('Feilian Beringal'),
    ).toBeVisible();
  });

  test('planificateur : matériaux à réunir selon la progression', async ({ page }) => {
    await createJiyanBuild(page);
    await page.getByRole('link', { name: 'Planifier' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Matériaux' })).toBeVisible();
    const items = page.getByRole('list', { name: 'Matériaux à réunir' });
    await expect(items.getByRole('listitem').first()).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Tout est monté' }).click();
    await expect(page.getByText('Tout est prêt : rien à réunir pour ce build.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Tout est prêt : rien à réunir pour ce build.')).toBeVisible();
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
