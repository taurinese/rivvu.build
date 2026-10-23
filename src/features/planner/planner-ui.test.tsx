import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

async function setup() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Jiyan');
  await services.builds.getState().update(id, (b) => ({
    ...b,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  }));
  return { services, id, current: () => services.builds.getState().builds[0]! };
}

const qtyOf = (name: string) =>
  within(screen.getByRole('list', { name: 'Matériaux à réunir' }))
    .getByText(name)
    .closest('li')
    ?.querySelector('strong')?.textContent;

describe('planificateur de matériaux', () => {
  it('liste tout ce qu’il faut pour un Résonateur neuf, puis tient compte de la progression', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/materiaux`, services);

    expect(await screen.findByText('2 530 000', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(qtyOf('Horloge à piédestal')).toBe('×26');

    // Libération déjà au niveau 9 : il ne reste que 9 → 10 (1 Horloge, 100 000 Coquilles).
    const liberation = screen.getByRole('group', { name: 'Libération de résonance actuel' });
    for (let i = 0; i < 8; i++)
      await user.click(within(liberation).getByRole('button', { name: /^Augmenter/ }));
    expect(current().planner?.current.forte.liberation).toBe(9);
    expect(qtyOf('Horloge à piédestal')).toBe('×23');
  });

  it('« Tout est monté » vide la liste ; le niveau 2 des bonus suit le niveau 1', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/materiaux`, services);
    await user.click(
      await screen.findByRole('button', { name: 'Tout est monté' }, { timeout: 5000 }),
    );
    expect(screen.getByText('Tout est prêt : rien à réunir pour ce build.')).toBeInTheDocument();

    const tier1 = screen.getByRole('group', { name: 'Bonus de stats de niveau 1 débloqués' });
    await user.click(within(tier1).getByRole('button', { name: /^Diminuer/ }));
    expect(current().planner?.current.statBonus).toEqual({ tier1: 3, tier2: 3 });
  });

  it('règle les objectifs hors build et s’ouvre depuis la fiche', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    const { router } = renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('link', { name: 'Planifier' }));
    const inherent = await screen.findByRole(
      'group',
      { name: 'Compétences innées visées' },
      { timeout: 5000 },
    );
    expect(router.state.location.pathname).toBe(`/builds/${id}/materiaux`);
    await user.click(within(inherent).getByRole('button', { name: /^Diminuer/ }));
    expect(current().planner?.inherent).toBe(1);
    const t1 = screen.getByRole('group', { name: 'Bonus de stats de niveau 1 visés' });
    await user.click(within(t1).getByRole('button', { name: /^Diminuer/ }));
    expect(current().planner?.statBonus).toEqual({ tier1: 3, tier2: 3 });
    const t2 = screen.getByRole('group', { name: 'Bonus de stats de niveau 2 visés' });
    await user.click(within(t2).getByRole('button', { name: /^Diminuer/ }));
    expect(current().planner?.statBonus).toEqual({ tier1: 3, tier2: 2 });
  });

  it('règle les niveaux actuels du Résonateur et de l’arme', async () => {
    const user = userEvent.setup();
    const { services, id, current } = await setup();
    renderApp(`/builds/${id}/materiaux`, services);
    const level = await screen.findByRole(
      'group',
      { name: 'Niveau actuel du Résonateur' },
      { timeout: 5000 },
    );
    await user.click(within(level).getByRole('button', { name: /^Augmenter/ }));
    expect(current().planner?.current.level).toEqual({ level: 20, ascension: 0 });
    const weapon = screen.getByRole('group', { name: 'Niveau actuel de l’arme' });
    await user.click(within(weapon).getByRole('button', { name: /^Augmenter/ }));
    expect(current().planner?.current.weaponLevel).toEqual({ level: 20, ascension: 0 });
    await user.click(within(level).getByRole('button', { name: /^Diminuer/ }));
    expect(current().planner?.current.level).toEqual({ level: 1, ascension: 0 });
    const innate = screen.getByRole('group', { name: 'Compétences innées débloquées' });
    await user.click(within(innate).getByRole('button', { name: /^Augmenter/ }));
    expect(current().planner?.current.inherent).toBe(1);
  });
});
