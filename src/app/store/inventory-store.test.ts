import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/test/memory-storage';
import { LocalStorageEchoInventory } from '../persistence/local-storage-echo-inventory';
import { createInventoryStore } from './inventory-store';

const echo = {
  uid: 'u1',
  echoId: 'carapace',
  cost: 3 as const,
  sonata: 'sierra-gale',
  mainStat: 'aeroDmg' as const,
  substats: [],
};

describe('inventory store', () => {
  it('charge, enregistre et supprime des Échos', async () => {
    const store = createInventoryStore(new LocalStorageEchoInventory(new MemoryStorage()));
    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'ready', echoes: [] });
    await store.getState().save(echo);
    expect(store.getState().echoes.map((e) => e.uid)).toEqual(['u1']);
    await store.getState().save({ ...echo, mainStat: 'atkPct' });
    expect(store.getState().echoes).toHaveLength(1);
    expect(store.getState().echoes[0]?.mainStat).toBe('atkPct');
    await store.getState().remove('u1');
    expect(store.getState().echoes).toEqual([]);
  });
});
