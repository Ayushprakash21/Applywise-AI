import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { GlobalThemeSwitch } from './ui/GlobalThemeSwitch.tsx';

export interface AuthHeaderProps {
  activePage: 'login' | 'signup';
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  activePage,
  onNavigateHome,
  onNavigateLogin,
  onNavigateSignup,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    if (path === '/' && onNavigateHome) {
      onNavigateHome();
      return;
    }
    if (path.startsWith('/#')) {
      if (window.location.pathname !== '/') {
        window.location.href = path;
      } else {
        const id = path.replace('/#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    window.location.href = path;
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 dark:bg-[var(--be-bg-header,#0C131E)]/90 border-b border-slate-200/80 dark:border-white/10 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* LEFT: Official ApplyVise AI Brand Logo */}
        <div className="flex items-center shrink-0">
          <BrandLogo
            variant="auto"
            size="md"
            onClick={onNavigateHome}
            className="cursor-pointer"
          />
        </div>

        {/* CENTRE: Desktop Navigation Links (Never wrap individually) */}
        <nav
          aria-label="Global Navigation"
          className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="/#cockpit"
            onClick={(e) => handleNav('/#cockpit', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 dark:hover:text-white focus:outline-hidden focus-visible:text-blue-600"
          >
            Features
          </a>
          <a
            href="/#journey"
            onClick={(e) => handleNav('/#journey', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 dark:hover:text-white focus:outline-hidden focus-visible:text-blue-600"
          >
            How it Works
          </a>
          <a
            href="/pricing"
            onClick={(e) => handleNav('/pricing', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 dark:hover:text-white focus:outline-hidden focus-visible:text-blue-600"
          >
            Pricing
          </a>
          <a
            href="/about"
            onClick={(e) => handleNav('/about', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 dark:hover:text-white focus:outline-hidden focus-visible:text-blue-600"
          >
            Support
          </a>
        </nav>

        {/* RIGHT: Global Theme Switch, Authentication Switchers & Mobile Hamburger */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <GlobalThemeSwitch size="sm" />
          <button
            type="button"
            onClick={onNavigateLogin}
            className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activePage === 'login'
                ? 'bg-white text-slate-900 border border-slate-300/80 shadow-xs ring-2 ring-violet-500/20 dark:bg-[#1E232B] dark:text-white dark:border-white/20 dark:ring-0'
                : 'bg-white/60 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs dark:bg-transparent dark:hover:bg-white/5 dark:text-slate-300 dark:hover:text-white dark:border-white/10'
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={onNavigateSignup}
            className={`px-3.5 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              activePage === 'signup'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-950'
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs dark:bg-white/90 dark:hover:bg-white dark:text-slate-950'
            }`}
          >
            Sign Up
          </button>

          {/* Mobile Menu Button (< 768px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (< 768px) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/60 dark:border-white/10 bg-white/95 dark:bg-[#10141C]/95 backdrop-blur-lg px-6 py-4 space-y-3 shadow-lg">
          <a
            href="/#cockpit"
            onClick={(e) => handleNav('/#cockpit', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-sky-400 transition"
          >
            Features
          </a>
          <a
            href="/#journey"
            onClick={(e) => handleNav('/#journey', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-sky-400 transition"
          >
            How it Works
          </a>
          <a
            href="/pricing"
            onClick={(e) => handleNav('/pricing', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
          >
            Pricing
          </a>
          <a
            href="/about"
            onClick={(e) => handleNav('/about', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
          >
            Support
          </a>
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Appearance</span>
            <GlobalThemeSwitch size="sm" />
          </div>
        </div>
      )}
    </header>
  );
};
