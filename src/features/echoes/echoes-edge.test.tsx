import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { EchoInstance } from '@/domain/echoes';
import { createTestServices, renderApp } from '@/test/render-app';

const carapace: EchoInstance = {
  uid: 'c1',
  echoId: 'carapace',
  cost: 3,
  sonata: 'sierra-gale',
  mainStat: 'aeroDmg',
  substats: [],
};

async function setup(echoes: EchoInstance[]) {
  const { services } = createTestServices();
  await services.builds.getState().load();
  await services.inventory.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Mon build');
  await services.builds.getState().update(id, (b) => ({ ...b, echoes }));
  renderApp(`/builds/${id}/echos`, services);
  await screen.findByRole('heading', { level: 1, name: 'Échos' });
  const build = () => services.builds.getState().builds.find((b) => b.id === id)!;
  return { services, build, user: userEvent.setup() };
}

describe('éditeur d’Échos — cas particuliers', () => {
  it('change l’ensemble de sonate parmi ceux possibles pour l’espèce', async () => {
    const { user, build } = await setup([carapace]);
    await user.click(screen.getByRole('button', { name: 'Nuages lunaires' }));
    expect(build().echoes[0]?.sonata).toBe('moonlit-clouds');
  });

  it('remplace l’espèce d’un Écho en gardant son emplacement', async () => {
    const { user, build } = await setup([carapace]);
    await user.click(screen.getByRole('button', { name: 'Changer d’Écho' }));
    const dialog = screen.getByRole('dialog', { name: 'Changer d’Écho' });
    await user.click(within(dialog).getByRole('radio', { name: 'Coût 3' }));
    await user.type(
      within(dialog).getByRole('searchbox', { name: 'Rechercher un Écho' }),
      'Héron cyan',
    );
    await user.click(
      within(within(dialog).getByRole('list', { name: 'Échos disponibles' })).getByRole('button', {
        name: /Héron cyan/,
      }),
    );
    expect(build().echoes).toEqual([{ ...carapace, echoId: 'cyan-feathered-heron' }]);
  });

  it('signale un équipement invalide', async () => {
    const bad: EchoInstance = {
      ...carapace,
      uid: 'x',
      cost: 4,
      echoId: 'feilian-beringal',
      mainStat: 'critRate',
      substats: [{ stat: 'critRate', value: 9.4 }],
    };
    await setup([bad, { ...bad, uid: 'y' }, { ...bad, uid: 'z' }, { ...bad, uid: 'w' }]);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Le coût total dépasse 12.');
    expect(alert).toHaveTextContent('ne correspond à aucun palier');
  });

  it('désactive dans l’inventaire un Écho déjà équipé', async () => {
    const { user, services } = await setup([carapace]);
    await services.inventory.getState().save(carapace);
    await user.click(screen.getByRole('button', { name: 'Depuis l’inventaire' }));
    const item = within(screen.getByRole('list', { name: 'Échos de l’inventaire' })).getByRole(
      'button',
      { name: /Rasoir chasseur/ },
    );
    expect(item).toBeDisabled();
    expect(item).toHaveTextContent('déjà équipé ici');
  });
});
