import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '@/test/memory-storage';
import { ECHOES_KEY, LocalStorageEchoInventory } from './local-storage-echo-inventory';

const echo = {
  uid: 'u1',
  echoId: 'feilian-beringal',
  cost: 4 as const,
  sonata: 'sierra-gale',
  mainStat: 'critDmg' as const,
  substats: [{ stat: 'critRate' as const, value: 9.3 }],
};

describe('LocalStorageEchoInventory', () => {
  let storage: MemoryStorage;
  let inventory: LocalStorageEchoInventory;
  let clock = '2026-10-23T12:00:00.000Z';

  beforeEach(() => {
    storage = new MemoryStorage();
    clock = '2026-10-23T12:00:00.000Z';
    inventory = new LocalStorageEchoInventory(storage, { now: () => clock });
  });

  it('enregistre un Écho avec ses métadonnées de synchro', async () => {
    const saved = await inventory.save(echo);
    expect(saved).toEqual({
      ...echo,
      ownerId: null,
      createdAt: clock,
      updatedAt: clock,
      revision: 1,
      deletedAt: null,
    });
    expect(await inventory.list()).toEqual([saved]);
  });

  it('met à jour un Écho existant en conservant sa date de création', async () => {
    const first = await inventory.save(echo);
    clock = '2026-10-23T13:00:00.000Z';
    const second = await inventory.save({ ...echo, mainStat: 'critRate' });
    expect(second).toMatchObject({
      createdAt: first.createdAt,
      updatedAt: clock,
      revision: 2,
      mainStat: 'critRate',
    });
    expect(await inventory.list()).toHaveLength(1);
  });

  it('supprime logiquement et notifie', async () => {
    const listener = vi.fn();
    inventory.subscribe(listener);
    await inventory.save(echo);
    await inventory.remove('u1');
    expect(await inventory.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(storage.getItem(ECHOES_KEY)).toContain('"deletedAt":"2026-10-23T12:00:00.000Z"');
  });

  it('écarte les entrées illisibles', async () => {
    storage.setItem(ECHOES_KEY, JSON.stringify({ items: { bad: { uid: 'bad' } } }));
    expect(await inventory.list()).toEqual([]);
    storage.setItem(ECHOES_KEY, 'pas du json');
    expect(await inventory.list()).toEqual([]);
  });
});
