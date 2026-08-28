import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DeviceModeProvider } from '../hooks/useDeviceMode.tsx';
import { AppStateProvider } from '../store/useAppStore.tsx';
import { ToastProvider } from '../components/ui/Toast.tsx';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.tsx';
import { AppRoutes } from './routes';

export const App = () => {
  return (
    <ErrorBoundary>
      <DeviceModeProvider>
        <AppStateProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </AppStateProvider>
      </DeviceModeProvider>
    </ErrorBoundary>
  );
};