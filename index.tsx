import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration - Enhanced origin check
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      // Skip if in a known sandboxed environment or if origin looks like a different cloud provider
      const isSandbox = window.location.hostname.includes('scf.usercontent.goog') || 
                        window.location.hostname.includes('webcontainer.io') ||
                        window.location.hostname.includes('stackblitz.io');
      
      // If the origin of the script doesn't match window location, registration will throw a SecurityError
      if (!isSandbox) {
        navigator.serviceWorker.register('./sw.js')
          .then(registration => console.log('PWA ServiceWorker registered'))
          .catch(error => {
            // Silently swallow origin mismatch and security errors in development
            if (error.name !== 'SecurityError') {
              console.warn('PWA ServiceWorker registration failed:', error);
            }
          });
      }
    } catch (e) {
      // Just ignore SW errors to keep logs clean
    }
  });
}