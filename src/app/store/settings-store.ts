import { z } from 'zod';
import { createStore } from 'zustand/vanilla';
import type { StorageLike } from '../persistence/local-storage-build-repository';

export const SETTINGS_KEY = 'rivvu:v1:settings';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const settingsSchema = z.object({ theme: z.enum(THEMES) });

export interface SettingsState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function read(storage: StorageLike): Theme {
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null'));
    return parsed.success ? parsed.data.theme : 'system';
  } catch {
    return 'system';
  }
}

/** Réglages locaux (préférences d'affichage), indépendants des builds. */
export function createSettingsStore(storage: StorageLike, applyTheme: (theme: Theme) => void) {
  const initial = read(storage);
  applyTheme(initial);
  return createStore<SettingsState>()((set) => ({
    theme: initial,
    setTheme: (theme) => {
      storage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
      applyTheme(theme);
      set({ theme });
    },
  }));
}

/** Applique le thème sur <html data-theme>, lu par les tokens CSS. */
export function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
