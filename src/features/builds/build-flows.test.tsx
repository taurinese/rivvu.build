import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

async function setup(path: (id: string) => string) {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Mon build');
  const view = renderApp(path(id), services);
  const build = () => services.builds.getState().builds.find((b) => b.id === id)!;
  return { ...view, id, build, user: userEvent.setup() };
}

const statValue = (label: string) => {
  const term = screen.getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent ?? '';
};

describe('fiche du build', () => {
  it('baisse le niveau par paliers d’ascension et recalcule les stats', async () => {
    const { user, build } = await setup((id) => `/builds/${id}`);
    await screen.findByRole('heading', { level: 1, name: 'Jiyan' });
    expect(screen.getByText('90/90')).toBeInTheDocument();
    expect(statValue('ATQ')).toBe('438');
    await user.click(screen.getByRole('button', { name: 'Diminuer Niveau' }));
    expect(build().level).toEqual({ level: 80, ascension: 6 });
    expect(screen.getByText('80/90')).toBeInTheDocument();
    expect(statValue('ATQ')).toBe('408');
  });

  it('change la Chaîne de résonance', async () => {
    const { user, build } = await setup((id) => `/builds/${id}`);
    await user.click(await screen.findByRole('radio', { name: 'S2' }));
    expect(build().chain).toBe(2);
  });

  it('indique les étapes faites et à faire', async () => {
    await setup((id) => `/builds/${id}`);
    const steps = await screen.findByRole('navigation', { name: 'Étapes du build' });
    expect(within(steps).getByRole('link', { name: 'Arme, à faire' })).toBeInTheDocument();
    expect(within(steps).getByRole('link', { name: 'Forte, fait' })).toBeInTheDocument();
  });
});

describe('arme', () => {
  it('ne propose que des armes du type du Résonateur et équipe la sélection', async () => {
    const { user, build } = await setup((id) => `/builds/${id}/arme`);
    const list = await screen.findByRole('list', { name: 'Armes disponibles' });
    expect(within(list).queryByRole('button', { name: /Cadence/ })).not.toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: /Sommet verdoyant/ }));
    expect(build().weapon).toEqual({
      id: 'verdant-summit',
      level: { level: 90, ascension: 6 },
      rank: 1,
    });
    expect(screen.getByRole('heading', { name: 'Arme équipée' })).toBeInTheDocument();
    expect(screen.getByText(/Increases Attribute DMG Bonus by 12%/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'R5' }));
    expect(build().weapon?.rank).toBe(5);
    expect(screen.getByText(/Increases Attribute DMG Bonus by 24%/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer l’arme' }));
    expect(build().weapon).toBeNull();
  });
});

describe('Forte', () => {
  it('règle chaque compétence de 1 à 10', async () => {
    const { user, build } = await setup((id) => `/builds/${id}/forte`);
    const minus = await screen.findByRole('button', { name: 'Diminuer Libération de résonance' });
    await user.click(minus);
    expect(build().forte.liberation).toBe(9);
    expect(screen.getByRole('button', { name: 'Augmenter Attaque normale' })).toBeDisabled();
  });
});

describe('changement de Résonateur', () => {
  it('retire l’arme si le nouveau Résonateur n’utilise pas ce type', async () => {
    const { user, build, services, id } = await setup((buildId) => `/builds/${buildId}/resonateur`);
    await services.builds.getState().update(id, (b) => ({
      ...b,
      weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
    }));
    const grid = await screen.findByRole('list', { name: 'Résonateurs' });
    await user.click(within(grid).getByRole('button', { name: /Camellya/ }));
    await user.click(screen.getByRole('button', { name: 'Choisir Camellya' }));
    expect(build().resonatorId).toBe('camellya');
    expect(build().weapon).toBeNull();
  });
});
