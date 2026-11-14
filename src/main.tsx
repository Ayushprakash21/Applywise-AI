import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { initTypographySystem } from './utils/typographySystem.ts';
import { initBlackEliteTheme } from './utils/blackEliteTheme.ts';
import './index.css';

// Initialize global typography and appearance tokens immediately to eliminate FOUT / theme flash
initTypographySystem();
initBlackEliteTheme();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
