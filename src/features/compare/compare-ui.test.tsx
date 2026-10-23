import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

async function twoBuilds() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const a = await services.builds.getState().create('jiyan', 'Sans arme');
  const b = await services.builds.getState().create('jiyan', 'Avec arme');
  await services.builds.getState().update(b, (build) => ({
    ...build,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  }));
  return { services, a, b };
}

const rowOf = (table: HTMLElement, label: string) =>
  within(table).getByRole('rowheader', { name: label }).closest('tr')!;

describe('comparateur', () => {
  it('compare deux builds : stats, écart et dégâts', async () => {
    const { services, a, b } = await twoBuilds();
    renderApp(`/comparer?a=${a}&b=${b}`, services);
    const stats = await screen.findByRole(
      'region',
      { name: 'Statistiques comparées' },
      { timeout: 5000 },
    );
    const critDmg = rowOf(stats, 'DGT crit.');
    expect(critDmg).toHaveTextContent('150,0');
    expect(critDmg).toHaveTextContent('198,6');
    expect(within(critDmg).getAllByRole('cell').at(-1)).toHaveTextContent('+48,6');
    expect(within(critDmg).getAllByRole('cell').at(-1)).toHaveTextContent('en hausse');
    expect(within(rowOf(stats, 'DÉF')).getAllByRole('cell').at(-1)).toHaveTextContent('identique');

    const damage = await screen.findByRole(
      'region',
      { name: 'Dégâts comparés' },
      { timeout: 5000 },
    );
    expect(
      await within(damage).findByRole('rowheader', { name: 'Coup le plus fort' }),
    ).toBeInTheDocument();
    expect(within(damage).getByRole('rowheader', { name: 'Lance solitaire' })).toBeInTheDocument();
  });

  it('change de build et garde le choix dans l’URL', async () => {
    const user = userEvent.setup();
    const { services, a, b } = await twoBuilds();
    const { router } = renderApp('/comparer', services);
    const pickA = await screen.findByRole('combobox', { name: 'Build A' }, { timeout: 5000 });
    expect(pickA).toHaveValue(b);
    await user.selectOptions(pickA, a);
    expect(router.state.location.search).toContain(`a=${a}`);
    expect(screen.getByRole('combobox', { name: 'Build B' })).toHaveValue(a);
  });

  it('demande deux builds au minimum', async () => {
    const { services } = createTestServices();
    await services.builds.getState().load();
    await services.builds.getState().create('jiyan');
    renderApp('/comparer', services);
    expect(
      await screen.findByText(
        'Il faut au moins deux builds pour les comparer.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('se lance depuis la liste des builds', async () => {
    const user = userEvent.setup();
    const { services } = await twoBuilds();
    const { router } = renderApp('/', services);
    await user.click(
      within(await screen.findByRole('main')).getByRole('link', { name: 'Comparer' }),
    );
    await expect.poll(() => router.state.location.pathname).toBe('/comparer');
  });

  it('entre deux Résonateurs différents, ne compare que le coup le plus fort', async () => {
    const { services, a } = await twoBuilds();
    const other = await services.builds.getState().create('camellya', 'Camellya');
    renderApp(`/comparer?a=${a}&b=${other}`, services);
    const damage = await screen.findByRole(
      'region',
      { name: 'Dégâts comparés' },
      { timeout: 5000 },
    );
    expect(
      await within(damage).findByText(
        'Résonateurs différents : seul le coup le plus fort est comparé.',
      ),
    ).toBeInTheDocument();
    expect(within(damage).queryByRole('rowheader', { name: 'Lance solitaire' })).toBeNull();
  });
});
