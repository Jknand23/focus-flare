/**
 * Renderer Main - React application entry point
 * 
 * Main entry point for the FocusFlare React application in the renderer process.
 * Sets up the React DOM rendering, CSS imports, and mounts the main dashboard
 * application component.
 * 
 * @module RendererMain
 * @author FocusFlare Team
 * @since 0.1.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';
import { DashboardPage } from '@/renderer/pages/DashboardPage';
import { ThemeProvider } from '@/renderer/components/theme/ThemeProvider';

// === APPLICATION SETUP ===

/**
 * Main application component wrapper with global theme management
 */
function App() {
  return (
    <ThemeProvider>
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardPage />
      </div>
    </ThemeProvider>
  );
}

// === REACT DOM RENDERING ===

/**
 * Initialize and render the React application
 */
function initializeApp() {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Start the application
initializeApp();

// === DEVELOPMENT HELPERS ===

// Hot module replacement for development
if (typeof (import.meta as any).hot !== 'undefined') {
  (import.meta as any).hot.accept();
} 