import { describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY, createSettingsStore } from './settings-store';

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
};

describe('settings store', () => {
  it('utilise le thème système par défaut', () => {
    const store = createSettingsStore(memory(), vi.fn());
    expect(store.getState().theme).toBe('system');
  });

  it('applique et persiste le thème choisi', () => {
    const storage = memory();
    const apply = vi.fn();
    const store = createSettingsStore(storage, apply);
    store.getState().setTheme('light');
    expect(apply).toHaveBeenLastCalledWith('light');
    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}')).toEqual({ theme: 'light' });
    expect(createSettingsStore(storage, vi.fn()).getState().theme).toBe('light');
  });

  it('ignore des réglages corrompus', () => {
    const storage = memory();
    storage.setItem(SETTINGS_KEY, '{"theme":"violet"}');
    expect(createSettingsStore(storage, vi.fn()).getState().theme).toBe('system');
    storage.setItem(SETTINGS_KEY, 'pas du json');
    expect(createSettingsStore(storage, vi.fn()).getState().theme).toBe('system');
  });
});
