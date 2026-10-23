import { createStore } from 'zustand/vanilla';
import type { EchoInstance } from '@/domain/echoes';
import type { EchoInventory, InventoryEcho } from '../persistence/echo-inventory';

export interface InventoryState {
  status: 'idle' | 'ready';
  echoes: InventoryEcho[];
  load: () => Promise<void>;
  save: (echo: EchoInstance) => Promise<void>;
  remove: (uid: string) => Promise<void>;
}

export function createInventoryStore(inventory: EchoInventory) {
  const store = createStore<InventoryState>()((set, get) => ({
    status: 'idle',
    echoes: [],
    load: async () => {
      set({ echoes: await inventory.list(), status: 'ready' });
    },
    save: async (echo) => {
      const saved = await inventory.save(echo);
      set({ echoes: [saved, ...get().echoes.filter((e) => e.uid !== echo.uid)] });
    },
    remove: async (uid) => {
      await inventory.remove(uid);
      set({ echoes: get().echoes.filter((e) => e.uid !== uid) });
    },
  }));
  inventory.subscribe(() => {
    void store.getState().load();
  });
  return store;
}

export type InventoryStore = ReturnType<typeof createInventoryStore>;
