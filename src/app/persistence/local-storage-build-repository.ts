import type { Build } from '@/domain/build';
import type { BuildRepository } from './build-repository';
import { migrateBuild } from './build-schema';

export const BUILDS_KEY = 'rivvu:v1:builds';
export const QUARANTINE_KEY = 'rivvu:v1:quarantine';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface Options {
  now?: () => string;
  /** Cible des évènements `storage` (window) pour la synchro entre onglets. */
  events?: EventTarget;
}

interface StoredCollection {
  items: Record<string, unknown>;
}

/** Adaptateur V1 : builds dans le localStorage du navigateur. */
export class LocalStorageBuildRepository implements BuildRepository {
  private readonly listeners = new Set<() => void>();
  private readonly now: () => string;

  constructor(
    private readonly storage: StorageLike,
    { now = () => new Date().toISOString(), events }: Options = {},
  ) {
    this.now = now;
    events?.addEventListener('storage', (event) => {
      if ((event as StorageEvent).key === BUILDS_KEY) this.notify();
    });
  }

  list(): Promise<Build[]> {
    const builds = this.readAll()
      .filter((b) => b.deletedAt === null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return Promise.resolve(builds);
  }

  get(id: string): Promise<Build | null> {
    const build = this.readAll().find((b) => b.id === id);
    return Promise.resolve(build && build.deletedAt === null ? build : null);
  }

  save(build: Build): Promise<Build> {
    const saved: Build = { ...build, revision: build.revision + 1, updatedAt: this.now() };
    this.write(saved);
    return Promise.resolve(saved);
  }

  remove(id: string): Promise<void> {
    const build = this.readAll().find((b) => b.id === id);
    if (build) {
      const now = this.now();
      this.write({ ...build, deletedAt: now, updatedAt: now, revision: build.revision + 1 });
    }
    return Promise.resolve();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  private readCollection(): StoredCollection {
    const raw = this.storage.getItem(BUILDS_KEY);
    if (!raw) return { items: {} };
    try {
      const parsed = JSON.parse(raw) as Partial<StoredCollection>;
      return { items: parsed.items ?? {} };
    } catch {
      this.quarantine('*', raw, 'JSON illisible');
      this.storage.removeItem(BUILDS_KEY);
      return { items: {} };
    }
  }

  private readAll(): Build[] {
    const { items } = this.readCollection();
    const builds: Build[] = [];
    const kept: Record<string, unknown> = {};
    let changed = false;
    for (const [id, doc] of Object.entries(items)) {
      try {
        builds.push(migrateBuild(doc));
        kept[id] = doc;
      } catch (error) {
        this.quarantine(id, doc, error instanceof Error ? error.message : String(error));
        changed = true;
      }
    }
    if (changed) this.storage.setItem(BUILDS_KEY, JSON.stringify({ items: kept }));
    return builds;
  }

  private write(build: Build) {
    const collection = this.readCollection();
    collection.items[build.id] = build;
    this.storage.setItem(BUILDS_KEY, JSON.stringify(collection));
    this.notify();
  }

  private quarantine(id: string, doc: unknown, reason: string) {
    let existing: unknown[] = [];
    try {
      existing = JSON.parse(this.storage.getItem(QUARANTINE_KEY) ?? '[]') as unknown[];
    } catch {
      existing = [];
    }
    existing.push({ id, doc, reason, at: this.now() });
    this.storage.setItem(QUARANTINE_KEY, JSON.stringify(existing));
  }
}
