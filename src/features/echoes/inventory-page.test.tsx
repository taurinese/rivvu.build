import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

describe('inventaire d’Échos', () => {
  it('invite à enregistrer des Échos quand il est vide', async () => {
    renderApp('/echos');
    expect(await screen.findByRole('heading', { name: 'Inventaire vide' })).toBeInTheDocument();
  });

  it('liste les Échos, indique où ils sont équipés et permet de les supprimer', async () => {
    const user = userEvent.setup();
    const { services } = createTestServices();
    const echo = {
      uid: 'u1',
      echoId: 'feilian-beringal',
      cost: 4 as const,
      sonata: 'sierra-gale',
      mainStat: 'critDmg' as const,
      substats: [{ stat: 'critRate' as const, value: 9.3 }],
    };
    await services.builds.getState().load();
    const id = await services.builds.getState().create('jiyan', 'Jiyan hypercarry');
    await services.builds.getState().update(id, (b) => ({ ...b, echoes: [echo] }));
    await services.inventory.getState().save(echo);
    renderApp('/echos', services);
    const list = await screen.findByRole('list', { name: 'Échos de l’inventaire' });
    expect(within(list).getByRole('heading', { name: 'Feilian Beringal' })).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Jiyan hypercarry' })).toHaveAttribute(
      'href',
      `/builds/${id}/echos`,
    );
    await user.click(within(list).getByRole('button', { name: 'Supprimer de l’inventaire' }));
    expect(await screen.findByRole('heading', { name: 'Inventaire vide' })).toBeInTheDocument();
  });
});
