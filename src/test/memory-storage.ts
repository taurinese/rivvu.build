import type { StorageLike } from '@/app/persistence/local-storage-build-repository';

/** Stockage en mémoire pour les tests (même interface que localStorage). */
export class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (key: string) => this.data.get(key) ?? null;
  setItem = (key: string, value: string) => {
    this.data.set(key, value);
  };
  removeItem = (key: string) => {
    this.data.delete(key);
  };
}
