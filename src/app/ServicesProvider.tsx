import type { ReactNode } from 'react';
import { ServicesContext } from './services';
import type { AppServices } from './services';

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
