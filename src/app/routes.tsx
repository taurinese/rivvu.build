import type { RouteObject } from 'react-router';
import { BuildPage } from '@/features/builds/BuildPage';
import { BuildsPage } from '@/features/builds/BuildsPage';
import { ChangeResonatorPage } from '@/features/builds/ChangeResonatorPage';
import { FortePage } from '@/features/builds/FortePage';
import { NewBuildPage } from '@/features/builds/NewBuildPage';
import { WeaponPage } from '@/features/builds/WeaponPage';
import { EchoesPage } from '@/features/echoes/EchoesPage';
import { InventoryPage } from '@/features/echoes/InventoryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <BuildsPage /> },
      { path: 'nouveau', element: <NewBuildPage /> },
      { path: 'builds/:buildId', element: <BuildPage /> },
      { path: 'builds/:buildId/resonateur', element: <ChangeResonatorPage /> },
      { path: 'builds/:buildId/arme', element: <WeaponPage /> },
      { path: 'builds/:buildId/forte', element: <FortePage /> },
      { path: 'builds/:buildId/echos', element: <EchoesPage /> },
      {
        path: 'builds/:buildId/degats',
        lazy: async () => ({
          Component: (await import('@/features/damage/DamagePage')).DamagePage,
        }),
      },
      { path: 'echos', element: <InventoryPage /> },
      { path: 'reglages', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
