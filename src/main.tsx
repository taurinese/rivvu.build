import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createBrowserServices } from '@/app/services';
import '@/ui/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <App services={createBrowserServices()} />
  </StrictMode>,
);
