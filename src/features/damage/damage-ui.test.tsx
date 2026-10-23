import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

async function servicesWithBuild() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Mon build');
  await services.builds.getState().update(id, (b) => ({
    ...b,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  }));
  const current = () => services.builds.getState().builds[0]!;
  return { services, id, current };
}

/** Moyenne de la première ligne du tableau d'une compétence. */
function firstAverage(skill: string) {
  const card = screen.getByRole('heading', { name: skill }).closest('section')!;
  const row = within(card).getAllByRole('row')[1]!;
  return within(row).getAllByRole('cell').at(-1)?.textContent;
}

describe('fiche → dégâts', () => {
  it('résume le coup le plus fort et mène à la page Dégâts', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    const { router } = renderApp(`/builds/${id}`, services);
    const card = (await screen.findByRole('heading', { name: 'Dégâts' })).closest('section')!;
    expect(
      await within(card).findByText(/Le Rage du Dragon azur/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.click(within(card).getByRole('link', { name: 'Détails' }));
    expect(
      await screen.findByRole('heading', { name: 'Dégâts estimés' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/builds/${id}/degats`);
  });
});

describe('page Dégâts', () => {
  it('liste les compétences du Résonateur avec leurs dégâts', async () => {
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}/degats`, services);
    expect(await screen.findByRole('heading', { name: 'Lance solitaire' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Tempête d'émeraude I" })).toBeInTheDocument();
    expect(firstAverage("Tempête d'émeraude I")).toMatch(/\d/);
  });

  it('règle la situation : bonus de combat, niveau et résistance de l’ennemi', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await servicesWithBuild();
    renderApp(`/builds/${id}/degats`, services);
    await screen.findByRole('heading', { name: "Tempête d'émeraude I" });
    const before = firstAverage("Tempête d'émeraude I");

    await user.click(screen.getByRole('switch', { name: 'Compter les bonus de combat' }));
    expect(current().combat).toBe(false);
    expect(firstAverage("Tempête d'émeraude I")).not.toBe(before);

    await user.click(screen.getByRole('button', { name: 'Augmenter Niveau de l’ennemi' }));
    expect(current().enemy.level).toBe(100);
    await user.click(screen.getByRole('button', { name: 'Diminuer Niveau de l’ennemi' }));
    await user.click(screen.getByRole('button', { name: 'Diminuer Niveau de l’ennemi' }));
    expect(current().enemy.level).toBe(80);

    await user.click(screen.getByRole('radio', { name: '40 %' }));
    expect(current().enemy.res).toBe(40);
  });

  it('ajoute, modifie, désactive et supprime un buff personnalisé', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await servicesWithBuild();
    renderApp(`/builds/${id}/degats`, services);
    const card = (await screen.findByRole('heading', { name: 'Buffs personnalisés' })).closest(
      'section',
    )!;
    const before = firstAverage("Tempête d'émeraude I");

    await user.click(within(card).getByRole('button', { name: 'Ajouter' }));
    expect(current().customBuffs).toHaveLength(1);
    expect(firstAverage("Tempête d'émeraude I")).not.toBe(before);
    expect(screen.getByText('Nouveau buff')).toBeInTheDocument();

    const name = within(card).getByRole('textbox', { name: 'Nom du buff 1' });
    await user.clear(name);
    await user.type(name, 'Outro Verina');
    await user.selectOptions(
      within(card).getByRole('combobox', { name: 'Stat du buff 1' }),
      'atkPct',
    );
    const value = within(card).getByRole('spinbutton', { name: 'Valeur du buff 1' });
    await user.clear(value);
    await user.type(value, '20');
    expect(current().customBuffs[0]).toMatchObject({
      label: 'Outro Verina',
      stat: 'atkPct',
      value: 20,
      enabled: true,
    });

    await user.click(within(card).getByRole('switch', { name: 'Activer Outro Verina' }));
    expect(current().customBuffs[0]?.enabled).toBe(false);
    expect(firstAverage("Tempête d'émeraude I")).toBe(before);

    await user.click(within(card).getByRole('button', { name: 'Supprimer Outro Verina' }));
    expect(current().customBuffs).toEqual([]);
  });

  it('choisit puis retire un coéquipier', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await servicesWithBuild();
    renderApp(`/builds/${id}/degats`, services);
    await user.click(await screen.findByRole('button', { name: 'Coéquipier 1' }));
    const sheet = screen.getByRole('dialog', { name: 'Choisir un coéquipier' });
    const options = within(sheet).getByRole('list', { name: 'Coéquipiers possibles' });
    expect(within(options).queryByRole('button', { name: 'Jiyan' })).toBeNull();
    await user.type(within(sheet).getByRole('searchbox'), 'Verina');
    await user.click(within(options).getByRole('button', { name: 'Verina' }));
    expect(current().team).toEqual(['verina', null]);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Retirer Verina de l’équipe' }));
    expect(current().team).toEqual([null, null]);
  });

  it('signale un Résonateur sans données de compétences, ici comme sur la fiche', async () => {
    const { services } = createTestServices();
    await services.builds.getState().load();
    const id = await services.builds.getState().create('cartethyia', 'Sans données');
    renderApp(`/builds/${id}`, services);
    expect(
      await screen.findByText(
        'Aucune donnée de compétence pour ce Résonateur.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Détails' }));
    expect(
      await screen.findByText(
        'Aucune donnée de compétence disponible pour ce Résonateur.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
