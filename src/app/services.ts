import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { LocalStorageBuildRepository } from './persistence/local-storage-build-repository';
import type { StorageLike } from './persistence/local-storage-build-repository';
import { createBuildsStore } from './store/builds-store';
import type { BuildsState, BuildsStore } from './store/builds-store';
import { applyThemeToDocument, createSettingsStore } from './store/settings-store';
import type { SettingsState } from './store/settings-store';

export interface AppServices {
  builds: BuildsStore;
  settings: ReturnType<typeof createSettingsStore>;
}

export const ServicesContext = createContext<AppServices | null>(null);

function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesProvider manquant');
  return services;
}

export const useBuilds = <T>(selector: (state: BuildsState) => T): T =>
  useStore(useServices().builds, selector);
export const useSettings = <T>(selector: (state: SettingsState) => T): T =>
  useStore(useServices().settings, selector);

/** Services branchés sur le navigateur (localStorage + synchro entre onglets). */
export function createBrowserServices(storage: StorageLike = window.localStorage): AppServices {
  return {
    builds: createBuildsStore(new LocalStorageBuildRepository(storage, { events: window })),
    settings: createSettingsStore(storage, applyThemeToDocument),
  };
}
