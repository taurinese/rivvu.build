import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageBuildRepository } from '../persistence/local-storage-build-repository';
import type { StorageLike } from '../persistence/local-storage-build-repository';
import { createBuildsStore } from './builds-store';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (key: string) => this.data.get(key) ?? null;
  setItem = (key: string, value: string) => {
    this.data.set(key, value);
  };
  removeItem = (key: string) => {
    this.data.delete(key);
  };
}

describe('builds store', () => {
  let storage: MemoryStorage;
  let ids: number;
  const make = () =>
    createBuildsStore(new LocalStorageBuildRepository(storage), {
      newId: () => `id-${String(++ids)}`,
    });

  beforeEach(() => {
    storage = new MemoryStorage();
    ids = 0;
  });

  it('charge les builds existants', async () => {
    const store = make();
    expect(store.getState().status).toBe('idle');
    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'ready', builds: [] });
  });

  it('crée un build, le persiste et le place en tête', async () => {
    const store = make();
    await store.getState().load();
    const id = await store.getState().create('jiyan', 'Jiyan — Hypercarry');
    expect(id).toBe('id-1');
    expect(store.getState().builds[0]).toMatchObject({
      id: 'id-1',
      resonatorId: 'jiyan',
      name: 'Jiyan — Hypercarry',
    });
    const reloaded = make();
    await reloaded.getState().load();
    expect(reloaded.getState().builds.map((b) => b.id)).toEqual(['id-1']);
  });

  it('met à jour un build via une fonction pure', async () => {
    const store = make();
    await store.getState().load();
    const id = await store.getState().create('jiyan');
    await store.getState().update(id, (b) => ({ ...b, chain: 2 }));
    expect(store.getState().builds.find((b) => b.id === id)?.chain).toBe(2);
  });

  it('supprime un build', async () => {
    const store = make();
    await store.getState().load();
    const id = await store.getState().create('jiyan');
    await store.getState().remove(id);
    expect(store.getState().builds).toEqual([]);
  });

  it('se resynchronise quand le dépôt change (autre onglet)', async () => {
    const repo = new LocalStorageBuildRepository(storage);
    const store = createBuildsStore(repo, { newId: () => 'x' });
    await store.getState().load();
    const other = createBuildsStore(new LocalStorageBuildRepository(storage), { newId: () => 'y' });
    await other.getState().create('jinhsi');
    // L'autre instance écrit dans le même stockage ; on simule la notification inter-onglets.
    await store.getState().load();
    expect(store.getState().builds.map((b) => b.id)).toEqual(['y']);
  });

  it('importe un build partagé sous un nouvel identifiant, à mon nom', async () => {
    const store = make();
    await store.getState().load();
    const sourceId = await store.getState().create('jiyan', 'Partagé');
    const source = store.getState().builds[0]!;
    const id = await store.getState().importBuild({
      ...source,
      id: 'externe',
      ownerId: 'quelqu-un',
      revision: 9,
      chain: 3,
    });
    expect(id).not.toBe('externe');
    expect(id).not.toBe(sourceId);
    expect(store.getState().builds[0]).toMatchObject({
      id,
      ownerId: null,
      revision: 1,
      chain: 3,
      name: 'Partagé',
    });
    expect(store.getState().builds).toHaveLength(2);
  });

  it('duplique un build en variante (« copie »), sans toucher l’original', async () => {
    const store = make();
    await store.getState().load();
    const id = await store.getState().create('jiyan', 'Jiyan');
    const copyId = await store.getState().duplicate(id);
    expect(copyId).toBeDefined();
    const copy = store.getState().builds.find((b) => b.id === copyId)!;
    expect(copy.name).toBe('Jiyan (copie)');
    expect(store.getState().builds.find((b) => b.id === id)?.name).toBe('Jiyan');
    expect(await store.getState().duplicate('inconnu')).toBeUndefined();
  });
});

describe('builds store — erreurs', () => {
  it('passe en erreur si le dépôt échoue', async () => {
    const failing = {
      list: () => Promise.reject(new Error('panne')),
      get: () => Promise.resolve(null),
      save: (b: never) => Promise.resolve(b),
      remove: () => Promise.resolve(),
      subscribe: () => () => undefined,
    };
    const store = createBuildsStore(failing);
    await store.getState().load();
    expect(store.getState().status).toBe('error');
  });

  it('ignore la mise à jour d’un build introuvable', async () => {
    const store = createBuildsStore(new LocalStorageBuildRepository(new MemoryStorage()));
    await store.getState().load();
    await store.getState().update('absent', (b) => b);
    expect(store.getState().builds).toEqual([]);
  });
});
