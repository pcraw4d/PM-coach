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

/** 
 * PWA Service Worker Registration Disabled
 * Implementation Plan Phase 1: Reduce network noise and 404 errors in production logs.
 * Re-enable only when sw.js is properly versioned and deployed.
 */
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('./sw.js')...
  });
}
*/