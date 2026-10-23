// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBuild } from '@/domain/build';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('worker de l’optimiseur', () => {
  it('répond avec le résultat, ou avec l’erreur', async () => {
    const post = vi.spyOn(self, 'postMessage').mockImplementation(() => undefined);
    await import('./optimizer.worker');
    const build = createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' });
    const send = (data: unknown) => {
      self.onmessage?.(new MessageEvent('message', { data }));
    };
    send({ build, inventory: [], skillId: 'jiyan-emerald-storm-prelude' });
    expect(post.mock.lastCall?.[0]).toMatchObject({ ok: true, outcome: { results: [] } });
    send({ build, inventory: [], skillId: 'inconnue' });
    expect(post.mock.lastCall?.[0]).toEqual({
      ok: false,
      message: 'Compétence inconnue pour ce Résonateur',
    });

    send({ build: { ...build, echoes: [{ stat: '__proto__' }] }, inventory: [], skillId: 'x' });
    expect(post.mock.lastCall?.[0]).toMatchObject({ ok: false });

    const calls = post.mock.calls.length;
    self.onmessage?.(
      new MessageEvent('message', { data: { build }, origin: 'https://ailleurs.example' }),
    );
    expect(post.mock.calls).toHaveLength(calls);
  });
});
