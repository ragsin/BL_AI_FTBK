import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { TourProvider } from './contexts/TourContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ChangelogProvider } from './contexts/ChangelogContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <ChangelogProvider>
              <TourProvider>
                <App />
              </TourProvider>
            </ChangelogProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);