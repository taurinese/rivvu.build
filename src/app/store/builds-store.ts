import { createStore } from 'zustand/vanilla';
import { createBuild } from '@/domain/build';
import type { Build } from '@/domain/build';
import type { BuildRepository } from '../persistence/build-repository';

export interface BuildsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  builds: Build[];
  load: () => Promise<void>;
  /** Crée un build et renvoie son identifiant. */
  create: (resonatorId: string, name?: string) => Promise<string>;
  update: (id: string, updater: (build: Build) => Build) => Promise<void>;
  /** Ajoute une copie d'un build venu d'ailleurs (lien de partage) : nouvel identifiant, sans propriétaire. */
  importBuild: (build: Build) => Promise<string>;
  /** Crée une variante d'un build existant ; undefined s'il n'existe pas. */
  duplicate: (id: string) => Promise<string | undefined>;
  remove: (id: string) => Promise<void>;
}

interface Options {
  newId?: () => string;
  now?: () => string;
}

export function createBuildsStore(
  repository: BuildRepository,
  { newId = () => crypto.randomUUID(), now = () => new Date().toISOString() }: Options = {},
) {
  const store = createStore<BuildsState>()((set, get) => ({
    status: 'idle',
    builds: [],

    load: async () => {
      if (get().status === 'idle') set({ status: 'loading' });
      try {
        set({ builds: await repository.list(), status: 'ready' });
      } catch {
        set({ status: 'error' });
      }
    },

    create: async (resonatorId, name) => {
      const id = newId();
      const saved = await repository.save(
        createBuild({ id, resonatorId, now: now(), ...(name ? { name } : {}) }),
      );
      set({ builds: [saved, ...get().builds.filter((b) => b.id !== id)] });
      return id;
    },

    update: async (id, updater) => {
      const current = get().builds.find((b) => b.id === id) ?? (await repository.get(id));
      if (!current) return;
      const saved = await repository.save(updater(current));
      set({ builds: [saved, ...get().builds.filter((b) => b.id !== id)] });
    },

    importBuild: async (build) => {
      const id = newId();
      const timestamp = now();
      const saved = await repository.save({
        ...build,
        id,
        ownerId: null,
        revision: 0,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      set({ builds: [saved, ...get().builds.filter((b) => b.id !== id)] });
      return id;
    },

    duplicate: async (id) => {
      const source = get().builds.find((b) => b.id === id) ?? (await repository.get(id));
      if (!source) return undefined;
      const name = `${source.name.slice(0, 72)} (copie)`;
      return get().importBuild({ ...source, name });
    },

    remove: async (id) => {
      await repository.remove(id);
      set({ builds: get().builds.filter((b) => b.id !== id) });
    },
  }));

  repository.subscribe(() => {
    void store.getState().load();
  });

  return store;
}

export type BuildsStore = ReturnType<typeof createBuildsStore>;
