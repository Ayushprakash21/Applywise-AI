import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { Home, ArrowLeft, Search } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateLogin?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateLogin,
}) => {
  return (
    <div className="min-h-screen bg-[#E9EDF3] neu-bg text-slate-800 flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-md p-6 sm:p-8 neu-panel rounded-3xl text-center space-y-6 animate-in fade-in duration-200">
        <div className="flex justify-center">
          <BrandLogo size="md" showWordmark={true} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase">
            404 Error
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            The page you are looking for doesn't exist, was moved, or has an invalid URL path.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl neu-button-primary text-xs font-semibold text-white flex items-center justify-center space-x-1.5"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go to Homepage</span>
          </button>
          {onNavigateLogin && (
            <button
              onClick={onNavigateLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl neu-button text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Sign In / Search</span>
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200/80 text-[11px] text-slate-400">
          ApplyVise AI — Truthful AI Career Intelligence
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
