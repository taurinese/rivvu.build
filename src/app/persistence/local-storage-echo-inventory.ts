import { z } from 'zod';
import type { EchoInstance } from '@/domain/echoes';
import { echoInstanceSchema } from './build-schema';
import type { EchoInventory, InventoryEcho } from './echo-inventory';
import type { StorageLike } from './local-storage-build-repository';

export const ECHOES_KEY = 'rivvu:v1:echoes';

const inventoryEchoSchema = echoInstanceSchema.extend({
  ownerId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  revision: z.number().int().nonnegative(),
  deletedAt: z.iso.datetime().nullable(),
});

interface Options {
  now?: () => string;
  events?: EventTarget;
}

/** Inventaire d'Échos dans le localStorage (V1). */
export class LocalStorageEchoInventory implements EchoInventory {
  private readonly listeners = new Set<() => void>();
  private readonly now: () => string;

  constructor(
    private readonly storage: StorageLike,
    { now = () => new Date().toISOString(), events }: Options = {},
  ) {
    this.now = now;
    events?.addEventListener('storage', (event) => {
      if ((event as StorageEvent).key === ECHOES_KEY) this.notify();
    });
  }

  list(): Promise<InventoryEcho[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.deletedAt === null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  save(echo: EchoInstance): Promise<InventoryEcho> {
    const existing = this.readAll().find((e) => e.uid === echo.uid);
    const now = this.now();
    const saved: InventoryEcho = {
      uid: echo.uid,
      echoId: echo.echoId,
      cost: echo.cost,
      sonata: echo.sonata,
      mainStat: echo.mainStat,
      substats: echo.substats,
      ownerId: existing?.ownerId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: (existing?.revision ?? 0) + 1,
      deletedAt: null,
    };
    this.write(saved);
    return Promise.resolve(saved);
  }

  remove(uid: string): Promise<void> {
    const existing = this.readAll().find((e) => e.uid === uid);
    if (existing) {
      const now = this.now();
      this.write({ ...existing, deletedAt: now, updatedAt: now, revision: existing.revision + 1 });
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

  private readItems(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(this.storage.getItem(ECHOES_KEY) ?? '{}') as {
        items?: Record<string, unknown>;
      };
      return parsed.items ?? {};
    } catch {
      return {};
    }
  }

  private readAll(): InventoryEcho[] {
    return Object.values(this.readItems()).flatMap((doc) => {
      const parsed = inventoryEchoSchema.safeParse(doc);
      return parsed.success ? [parsed.data] : [];
    });
  }

  private write(echo: InventoryEcho) {
    const items = this.readItems();
    items[echo.uid] = echo;
    this.storage.setItem(ECHOES_KEY, JSON.stringify({ items }));
    this.notify();
  }
}
