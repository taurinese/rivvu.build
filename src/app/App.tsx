import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { routes } from './routes';
import { ServicesProvider } from './ServicesProvider';
import type { AppServices } from './services';

export function App({ services }: { services: AppServices }) {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <ServicesProvider services={services}>
      <RouterProvider router={router} />
    </ServicesProvider>
  );
}
