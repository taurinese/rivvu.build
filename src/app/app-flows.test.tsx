import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestServices, renderApp } from '@/test/render-app';

describe('parcours principaux', () => {
  it('affiche un état vide invitant à créer un premier build', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mes builds' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Aucun build pour l’instant' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer mon premier build' })).toHaveAttribute(
      'href',
      '/nouveau',
    );
  });

  it('crée un build depuis le sélecteur puis ouvre sa fiche', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/nouveau');
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un Résonateur' }), 'jiyan');
    const grid = screen.getByRole('list', { name: 'Résonateurs' });
    await user.click(within(grid).getByRole('button', { name: /Jiyan/ }));
    await user.click(screen.getByRole('button', { name: 'Créer un build Jiyan' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/builds/build-1');
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Jiyan' })).toBeInTheDocument();
  });

  it('filtre par attribut', async () => {
    const user = userEvent.setup();
    renderApp('/nouveau');
    await user.click(screen.getByRole('button', { name: 'Havoc' }));
    const grid = screen.getByRole('list', { name: 'Résonateurs' });
    expect(within(grid).queryByRole('button', { name: /Jiyan/ })).not.toBeInTheDocument();
    expect(within(grid).getByRole('button', { name: /Camellya/ })).toBeInTheDocument();
  });

  it('renomme un build depuis sa fiche et le retrouve dans la liste', async () => {
    const user = userEvent.setup();
    const { services } = createTestServices();
    await services.builds.getState().load();
    const id = await services.builds.getState().create('jiyan', 'Jiyan');
    renderApp(`/builds/${id}`, services);
    await screen.findByRole('heading', { level: 1, name: 'Jiyan' });
    await user.click(screen.getByRole('button', { name: 'Renommer « Jiyan »' }));
    const input = screen.getByRole('textbox', { name: 'Nom du build' });
    await user.clear(input);
    await user.type(input, 'Jiyan — Hypercarry{Enter}');
    expect(services.builds.getState().builds[0]?.name).toBe('Jiyan — Hypercarry');
  });

  it('affiche une page introuvable pour un build inconnu', async () => {
    const { services } = createTestServices();
    await services.builds.getState().load();
    renderApp('/builds/inconnu', services);
    expect(await screen.findByText('Ce build n’existe pas ou a été supprimé.')).toBeInTheDocument();
  });

  it('change le thème depuis les réglages', async () => {
    const user = userEvent.setup();
    const { services, appliedThemes } = createTestServices();
    renderApp('/reglages', services);
    await user.click(screen.getByRole('radio', { name: 'Clair' }));
    expect(appliedThemes.at(-1)).toBe('light');
    expect(screen.getByRole('radio', { name: 'Clair' })).toBeChecked();
  });
});
