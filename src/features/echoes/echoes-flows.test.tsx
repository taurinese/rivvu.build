import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

async function setup() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  await services.inventory.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Mon build');
  renderApp(`/builds/${id}/echos`, services);
  const build = () => services.builds.getState().builds.find((b) => b.id === id)!;
  return { services, id, build, user: userEvent.setup() };
}

async function addEcho(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name: 'Ajouter un Écho' }));
  const dialog = screen.getByRole('dialog', { name: 'Ajouter un Écho' });
  await user.click(within(dialog).getByRole('radio', { name: 'Tous' }));
  await user.selectOptions(
    within(dialog).getByRole('combobox', { name: 'Filtrer par ensemble' }),
    '',
  );
  await user.type(
    within(dialog).getByRole('searchbox', { name: 'Rechercher un Écho' }),
    name.source,
  );
  const buttons = within(
    within(dialog).getByRole('list', { name: 'Échos disponibles' }),
  ).getAllByRole('button', { name });
  await user.click(buttons.find((b) => !b.textContent.includes('Cauchemar'))!);
}

describe('éditeur d’Échos', () => {
  it('ajoute un Écho principal avec des valeurs par défaut cohérentes', async () => {
    const { user, build } = await setup();
    await screen.findByRole('heading', { level: 1, name: 'Échos' });
    await addEcho(user, /Feilian Beringal/);
    expect(build().echoes).toHaveLength(1);
    expect(build().echoes[0]).toMatchObject({
      echoId: 'feilian-beringal',
      cost: 4,
      sonata: 'sierra-gale',
      mainStat: 'critRate',
    });
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Coût total 4 sur 12' })).toBeInTheDocument();
  });

  it('règle la stat principale et les sous-stats par paliers', async () => {
    const { user, build } = await setup();
    await screen.findByRole('heading', { level: 1, name: 'Échos' });
    await addEcho(user, /Feilian Beringal/);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Stat principale' }), 'critDmg');
    expect(build().echoes[0]?.mainStat).toBe('critDmg');

    await user.click(screen.getByRole('button', { name: 'Ajouter une sous-stat' }));
    expect(build().echoes[0]?.substats).toEqual([{ stat: 'critRate', value: 6.3 }]);
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Valeur de Taux crit.' })).getByRole('radio', {
        name: '9,3',
      }),
    );
    expect(build().echoes[0]?.substats).toEqual([{ stat: 'critRate', value: 9.3 }]);

    await user.click(screen.getByRole('button', { name: 'Ajouter une sous-stat' }));
    expect(build().echoes[0]?.substats[1]).toEqual({ stat: 'critDmg', value: 12.6 });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sous-stat 2' }), 'atkPct');
    expect(build().echoes[0]?.substats[1]).toEqual({ stat: 'atkPct', value: 6.4 });
    await user.click(screen.getByRole('button', { name: 'Retirer ATQ %' }));
    expect(build().echoes[0]?.substats).toHaveLength(1);
  });

  it('respecte le coût maximal de 12 et affiche les bonus d’ensemble', async () => {
    const { user, build } = await setup();
    await screen.findByRole('heading', { level: 1, name: 'Échos' });
    await addEcho(user, /Feilian Beringal/);
    await addEcho(user, /Rasoir chasseur/);
    await addEcho(user, /Héron cyan/);
    await addEcho(user, /Houhouu/);
    expect(build().echoes.map((e) => e.cost)).toEqual([4, 3, 3, 1]);
    expect(build().echoes[1]?.mainStat).toBe('aeroDmg');
    await addEcho(user, /Casoar nain/);
    expect(build().echoes).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Ajouter un Écho' })).not.toBeInTheDocument();
    expect(screen.getByText(/Aero DMG \+30% for 15s/).closest('li')).toHaveTextContent('(actif)');
  });

  it('change l’Écho principal', async () => {
    const { user, build } = await setup();
    await screen.findByRole('heading', { level: 1, name: 'Échos' });
    await addEcho(user, /Feilian Beringal/);
    await addEcho(user, /Rasoir chasseur/);
    await user.click(screen.getByRole('button', { name: 'Définir comme principal' }));
    expect(build().echoes.map((e) => e.echoId)).toEqual(['carapace', 'feilian-beringal']);
  });

  it('enregistre un Écho dans l’inventaire et le réutilise', async () => {
    const { user, build, services } = await setup();
    await screen.findByRole('heading', { level: 1, name: 'Échos' });
    await addEcho(user, /Feilian Beringal/);
    await user.click(screen.getByRole('button', { name: 'Enregistrer dans l’inventaire' }));
    expect(services.inventory.getState().echoes).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Mettre à jour l’inventaire' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retirer$/ }));
    expect(build().echoes).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Depuis l’inventaire' }));
    await user.click(
      within(screen.getByRole('list', { name: 'Échos de l’inventaire' })).getByRole('button', {
        name: /Feilian Beringal/,
      }),
    );
    expect(build().echoes[0]?.uid).toBe(services.inventory.getState().echoes[0]?.uid);
  });
});
