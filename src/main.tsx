import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initTypographySystem } from './utils/typographySystem.ts';
import './index.css';

// Initialize global typography tokens immediately to eliminate FOUT
initTypographySystem();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
