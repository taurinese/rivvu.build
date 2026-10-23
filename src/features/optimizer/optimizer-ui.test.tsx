import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { EchoInstance } from '@/domain/echoes';
import { createTestServices, renderApp } from '@/test/render-app';

const echo = (
  uid: string,
  echoId: string,
  cost: EchoInstance['cost'],
  mainStat: EchoInstance['mainStat'],
): EchoInstance => ({ uid, echoId, cost, sonata: 'sierra-gale', mainStat, substats: [] });

async function setup({ withInventory = true } = {}) {
  const { services } = createTestServices();
  await services.builds.getState().load();
  await services.inventory.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Jiyan');
  await services.builds.getState().update(id, (b) => ({
    ...b,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  }));
  if (withInventory)
    for (const e of [
      echo('crit', 'feilian-beringal', 4, 'critDmg'),
      echo('aero1', 'carapace', 3, 'aeroDmg'),
      echo('aero2', 'cyan-feathered-heron', 3, 'aeroDmg'),
      echo('atk1', 'aero-predator', 1, 'atkPct'),
      echo('atk2', 'chirpuff', 1, 'atkPct'),
    ])
      await services.inventory.getState().save(e);
  return { services, id, current: () => services.builds.getState().builds[0]! };
}

describe('optimiseur', () => {
  it('trouve la meilleure combinaison et l’équipe', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/optimiser`, services);
    const select = await screen.findByRole(
      'combobox',
      { name: 'Compétence à maximiser' },
      { timeout: 5000 },
    );
    expect(select).toHaveDisplayValue('Le Rage du Dragon azur');
    expect(screen.getByText(/5 Échos pris en compte/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lancer l’optimisation' }));
    const first = (
      await screen.findByRole('heading', { name: 'Option 1' }, { timeout: 5000 })
    ).closest('section')!;
    expect(within(first).getByText('Feilian Beringal')).toBeInTheDocument();
    expect(within(first).getByText(/Hurle de Sierra ×5|×5/)).toBeInTheDocument();

    await user.click(within(first).getByRole('button', { name: 'Équiper' }));
    expect(within(first).getByText('Équipée')).toBeInTheDocument();
    expect(
      current()
        .echoes.map((e) => e.uid)
        .sort(),
    ).toEqual(['aero1', 'aero2', 'atk1', 'atk2', 'crit']);
  });

  it('compare au build actuel une fois des Échos équipés', async () => {
    const user = userEvent.setup();
    const { services, id } = await setup();
    await services.builds
      .getState()
      .update(id, (b) => ({ ...b, echoes: [echo('crit', 'feilian-beringal', 4, 'critDmg')] }));
    renderApp(`/builds/${id}/optimiser`, services);
    await user.click(
      await screen.findByRole('button', { name: 'Lancer l’optimisation' }, { timeout: 5000 }),
    );
    expect(
      await screen.findAllByText(/par rapport aux Échos actuels/, {}, { timeout: 5000 }),
    ).not.toHaveLength(0);
  });

  it('se désactive sans Écho disponible', async () => {
    const { services, id } = await setup({ withInventory: false });
    renderApp(`/builds/${id}/optimiser`, services);
    expect(
      await screen.findByRole('button', { name: 'Lancer l’optimisation' }, { timeout: 5000 }),
    ).toBeDisabled();
    expect(screen.getByText(/0 Écho pris en compte/)).toBeInTheDocument();
  });

  it('s’ouvre depuis la fiche', async () => {
    const user = userEvent.setup();
    const { services, id } = await setup();
    const { router } = renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('link', { name: 'Optimiser' }));
    await screen.findByRole('heading', { level: 1, name: 'Optimiseur d’Échos' }, { timeout: 5000 });
    expect(router.state.location.pathname).toBe(`/builds/${id}/optimiser`);
  });
});
