import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { encodeShare } from '@/app/share/share-codec';
import { createBuild } from '@/domain/build';
import { createTestServices, renderApp } from '@/test/render-app';

async function servicesWithBuild() {
  const { services } = createTestServices();
  await services.builds.getState().load();
  const id = await services.builds.getState().create('jiyan', 'Jiyan crit');
  await services.builds.getState().update(id, (b) => ({
    ...b,
    chain: 2,
    weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  }));
  return { services, id };
}

const sharedBuild = {
  ...createBuild({ id: 'x', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' }),
  name: 'Build d’un ami',
  chain: 4,
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 5 },
};

describe('partager depuis la fiche', () => {
  it('ouvre la feuille de partage avec un lien copiable', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('button', { name: 'Partager' }));
    const sheet = screen.getByRole('dialog', { name: 'Partager ce build' });
    const link = within(sheet).getByRole('textbox', { name: 'Lien du build' });
    await expect.poll(() => (link as HTMLInputElement).value).toMatch(/\/partage#[\w-]+$/);

    await user.click(within(sheet).getByRole('button', { name: 'Copier le lien' }));
    expect(within(sheet).getByRole('status')).toHaveTextContent('Lien copié');
    expect(await navigator.clipboard.readText()).toBe((link as HTMLInputElement).value);
  });

  it('guide l’utilisateur si la copie échoue, et propose le partage natif', async () => {
    const user = userEvent.setup();
    const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
      Promise.reject(new Error('annulé')),
    );
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('button', { name: 'Partager' }));
    const sheet = screen.getByRole('dialog', { name: 'Partager ce build' });
    await vi.waitFor(() => {
      expect(within(sheet).getByRole('button', { name: 'Copier le lien' })).toBeEnabled();
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('refusé'));
    await user.click(within(sheet).getByRole('button', { name: 'Copier le lien' }));
    expect(within(sheet).getByRole('status')).toHaveTextContent('Copie impossible');

    await user.click(within(sheet).getByRole('button', { name: 'Partager…' }));
    const [data] = share.mock.calls[0] ?? [];
    expect(data?.title).toBe('Jiyan — Jiyan crit');
    expect(data?.url).toContain('/partage#');
    Reflect.deleteProperty(navigator, 'share');
  });

  it('signale l’échec de l’export en image quand le navigateur ne sait pas dessiner', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('button', { name: 'Partager' }));
    await user.click(screen.getByRole('button', { name: 'Exporter en image' }));
    expect(
      await screen.findByText('L’export en image a échoué.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('duplique le build et ouvre la copie', async () => {
    const user = userEvent.setup();
    const { services, id } = await servicesWithBuild();
    const { router } = renderApp(`/builds/${id}`, services);
    await user.click(await screen.findByRole('button', { name: 'Dupliquer' }));
    const builds = services.builds.getState().builds;
    expect(builds).toHaveLength(2);
    const copy = builds.find((b) => b.id !== id)!;
    expect(copy).toMatchObject({ name: 'Jiyan crit (copie)', chain: 2 });
    await expect.poll(() => router.state.location.pathname).toBe(`/builds/${copy.id}`);
  });
});

describe('ouvrir un lien de partage', () => {
  it('affiche le build reçu puis l’ajoute à mes builds', async () => {
    const user = userEvent.setup();
    const { services } = createTestServices();
    await services.builds.getState().load();
    const { router } = renderApp(`/partage#${await encodeShare(sharedBuild)}`, services);

    expect(await screen.findByText('Build d’un ami', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Jiyan' })).toBeInTheDocument();
    expect(screen.getByText('Sommet verdoyant')).toBeInTheDocument();
    expect(screen.getByText('Niv. 90/90 · S4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter à mes builds' }));
    const [saved] = services.builds.getState().builds;
    expect(saved).toMatchObject({ name: 'Build d’un ami', chain: 4, ownerId: null });
    await expect.poll(() => router.state.location.pathname).toBe(`/builds/${saved!.id}`);
  });

  it('explique un lien abîmé', async () => {
    renderApp('/partage#abime');
    expect(
      await screen.findByText('Lien de partage invalide ou abîmé.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à mes builds' })).toBeInTheDocument();
  });
});
