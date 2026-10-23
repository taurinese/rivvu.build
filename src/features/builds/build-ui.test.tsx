import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyThemeToDocument } from '@/app/store/settings-store';
import { createTestServices, renderApp } from '@/test/render-app';

const feilian = {
  uid: 'e1',
  echoId: 'feilian-beringal',
  cost: 4 as const,
  sonata: 'sierra-gale',
  mainStat: 'critDmg' as const,
  substats: [{ stat: 'critRate' as const, value: 9.3 }],
};

async function servicesWithBuild() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Mon build');
  await services.builds.getState().update(id, (b) => ({
    ...b,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 2 },
    echoes: [feilian],
  }));
  return { services, id };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('liste des builds', () => {
  it('affiche une carte par build avec son Résonateur', async () => {
    const { services } = await servicesWithBuild();
    await services.builds.getState().create('camellya', 'Camellya DPS');
    renderApp('/', services);
    const list = await screen.findByRole('list', { name: 'Builds' });
    expect(within(list).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('2 builds enregistrés sur cet appareil')).toBeInTheDocument();
  });
});

describe('fiche complète', () => {
  it('montre l’arme, les Échos, et les stats de base ou finales', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}`, services);
    expect(await screen.findByRole('link', { name: /Sommet verdoyant/ })).toHaveTextContent('R2');
    expect(screen.getByText('Feilian Beringal')).toBeInTheDocument();
    expect(screen.getByText('Coût 4 / 12')).toBeInTheDocument();
    const critRate = () =>
      screen.getByText('Taux crit.', { selector: 'dt' }).nextElementSibling?.textContent;
    expect(critRate()).toContain('14,3');
    await user.click(screen.getByRole('radio', { name: 'Base' }));
    expect(critRate()).toBe('5,0 %');
  });

  it('un nom vide redevient « Mon build »', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    await services.builds.getState().update(id, (b) => ({ ...b, name: 'Autre' }));
    renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('button', { name: 'Renommer « Autre »' }));
    await user.clear(screen.getByRole('textbox', { name: 'Nom du build' }));
    await user.tab();
    expect(services.builds.getState().builds[0]?.name).toBe('Mon build');
  });

  it('demande confirmation avant de supprimer', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const { router } = renderApp(`/builds/${id}`, services);
    const remove = await screen.findByRole('button', { name: 'Supprimer ce build' });
    await user.click(remove);
    expect(services.builds.getState().builds).toHaveLength(1);
    await user.click(remove);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(services.builds.getState().builds).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/');
  });

  it('signale un build dont le Résonateur a disparu des données', async () => {
    const { services, id } = await servicesWithBuild();
    await services.builds.getState().update(id, (b) => ({ ...b, resonatorId: 'disparu' }));
    renderApp(`/builds/${id}/forte`, services);
    expect(
      await screen.findByText('Le Résonateur de ce build n’est plus disponible.'),
    ).toBeInTheDocument();
  });

  it('« Tout au maximum » remet le Forte à 10', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    await services.builds.getState().update(id, (b) => ({ ...b, forte: { ...b.forte, intro: 3 } }));
    renderApp(`/builds/${id}/forte`, services);
    await user.click(await screen.findByRole('button', { name: 'Tout au maximum' }));
    expect(services.builds.getState().builds[0]?.forte.intro).toBe(10);
  });

  it('règle le niveau de l’arme', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}/arme`, services);
    await user.click(await screen.findByRole('button', { name: 'Diminuer Niveau de l’arme' }));
    expect(services.builds.getState().builds[0]?.weapon?.level).toEqual({
      level: 80,
      ascension: 6,
    });
    await user.click(screen.getByRole('button', { name: 'Augmenter Niveau de l’arme' }));
    expect(services.builds.getState().builds[0]?.weapon?.level).toEqual({
      level: 90,
      ascension: 6,
    });
  });
});

describe('thème', () => {
  it('pose ou retire data-theme sur <html>', () => {
    applyThemeToDocument('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyThemeToDocument('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
