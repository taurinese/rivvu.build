import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { LocalStorageBuildRepository } from '@/app/persistence/local-storage-build-repository';
import { LocalStorageEchoInventory } from '@/app/persistence/local-storage-echo-inventory';
import { routes } from '@/app/routes';
import { ServicesProvider } from '@/app/ServicesProvider';
import type { AppServices } from '@/app/services';
import { createBuildsStore } from '@/app/store/builds-store';
import { createInventoryStore } from '@/app/store/inventory-store';
import { createSettingsStore } from '@/app/store/settings-store';
import { MemoryStorage } from './memory-storage';

export { MemoryStorage };

export function createTestServices(storage = new MemoryStorage()) {
  let n = 0;
  const appliedThemes: string[] = [];
  const services: AppServices = {
    builds: createBuildsStore(new LocalStorageBuildRepository(storage), {
      newId: () => `build-${String(++n)}`,
    }),
    inventory: createInventoryStore(new LocalStorageEchoInventory(storage)),
    settings: createSettingsStore(storage, (theme) => appliedThemes.push(theme)),
  };
  return { services, storage, appliedThemes };
}

export function renderApp(path = '/', services = createTestServices().services) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <ServicesProvider services={services}>
      <RouterProvider router={router} />
    </ServicesProvider>,
  );
  return { ...utils, router, services };
}
