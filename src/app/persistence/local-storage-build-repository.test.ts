import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBuild } from '@/domain/build';
import {
  BUILDS_KEY,
  QUARANTINE_KEY,
  LocalStorageBuildRepository,
} from './local-storage-build-repository';
import type { StorageLike } from './local-storage-build-repository';

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

const T0 = '2026-10-23T12:00:00.000Z';
const T1 = '2026-10-23T12:05:00.000Z';

describe('LocalStorageBuildRepository', () => {
  let storage: MemoryStorage;
  let clock: string;
  let repo: LocalStorageBuildRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    clock = T0;
    repo = new LocalStorageBuildRepository(storage, { now: () => clock });
  });

  it('enregistre puis relit un build', async () => {
    const saved = await repo.save(createBuild({ id: 'a', resonatorId: 'jiyan', now: T0 }));
    expect(await repo.get('a')).toEqual(saved);
    expect(await repo.list()).toEqual([saved]);
  });

  it('incrémente la révision et met à jour la date à chaque enregistrement', async () => {
    const first = await repo.save(createBuild({ id: 'a', resonatorId: 'jiyan', now: T0 }));
    clock = T1;
    const second = await repo.save({ ...first, name: 'Renommé' });
    expect(first.revision).toBe(1);
    expect(second).toMatchObject({ revision: 2, updatedAt: T1, createdAt: T0, name: 'Renommé' });
  });

  it('trie la liste du plus récemment modifié au plus ancien', async () => {
    await repo.save(createBuild({ id: 'old', resonatorId: 'jiyan', now: T0 }));
    clock = T1;
    await repo.save(createBuild({ id: 'new', resonatorId: 'jinhsi', now: T1 }));
    expect((await repo.list()).map((b) => b.id)).toEqual(['new', 'old']);
  });

  it('supprime logiquement (deletedAt) pour pouvoir synchroniser la suppression plus tard', async () => {
    await repo.save(createBuild({ id: 'a', resonatorId: 'jiyan', now: T0 }));
    clock = T1;
    await repo.remove('a');
    expect(await repo.list()).toEqual([]);
    expect(await repo.get('a')).toBeNull();
    const raw = JSON.parse(storage.getItem(BUILDS_KEY) ?? '{}') as {
      items: Record<string, { deletedAt: string }>;
    };
    expect(raw.items.a?.deletedAt).toBe(T1);
  });

  it('met de côté les données illisibles au lieu de les perdre', async () => {
    storage.setItem(
      BUILDS_KEY,
      JSON.stringify({ items: { bad: { id: 'bad', schemaVersion: 1, nope: true } } }),
    );
    expect(await repo.list()).toEqual([]);
    const quarantine = JSON.parse(storage.getItem(QUARANTINE_KEY) ?? '[]') as { id: string }[];
    expect(quarantine.map((q) => q.id)).toEqual(['bad']);
  });

  it('survit à un stockage corrompu', async () => {
    storage.setItem(BUILDS_KEY, '{pas du json');
    expect(await repo.list()).toEqual([]);
    expect(storage.getItem(QUARANTINE_KEY)).toContain('{pas du json');
  });

  it('migre un document d’une version antérieure (v0 sans révision)', async () => {
    const legacy: Record<string, unknown> = {
      ...createBuild({ id: 'v0', resonatorId: 'jiyan', now: T0 }),
    };
    delete legacy.revision;
    delete legacy.deletedAt;
    delete legacy.ownerId;
    storage.setItem(BUILDS_KEY, JSON.stringify({ items: { v0: { ...legacy, schemaVersion: 0 } } }));
    expect(await repo.get('v0')).toMatchObject({
      id: 'v0',
      revision: 0,
      deletedAt: null,
      ownerId: null,
      schemaVersion: 2,
    });
  });

  it('prévient les abonnés après chaque modification', async () => {
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);
    await repo.save(createBuild({ id: 'a', resonatorId: 'jiyan', now: T0 }));
    await repo.remove('a');
    unsubscribe();
    await repo.save(createBuild({ id: 'b', resonatorId: 'jiyan', now: T0 }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('relaie les modifications faites dans un autre onglet', () => {
    const events = new EventTarget();
    const listener = vi.fn();
    const crossTab = new LocalStorageBuildRepository(storage, { now: () => clock, events });
    crossTab.subscribe(listener);
    events.dispatchEvent(Object.assign(new Event('storage'), { key: BUILDS_KEY }));
    events.dispatchEvent(Object.assign(new Event('storage'), { key: 'autre-cle' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
