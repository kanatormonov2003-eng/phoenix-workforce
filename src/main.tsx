import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="bottom-right"
            closeButton
            duration={4200}
            toastOptions={{
              classNames: {
                toast:
                  'bg-surface-2 border border-line text-ink rounded-md shadow-[0_22px_50px_-22px_oklch(0.05_0_0/.9)]',
                description: 'text-ink-3',
                actionButton: 'bg-ember text-bg-deep',
              },
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
