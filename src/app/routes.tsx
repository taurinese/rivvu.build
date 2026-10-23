import type { RouteObject } from 'react-router';
import { BuildPage } from '@/features/builds/BuildPage';
import { BuildsPage } from '@/features/builds/BuildsPage';
import { NewBuildPage } from '@/features/builds/NewBuildPage';
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
      { path: 'reglages', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
