import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';

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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/60 border-b border-white/60 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* LEFT: Official ApplyVise AI Brand Logo */}
        <div className="flex items-center shrink-0">
          <BrandLogo
            variant="light"
            size="md"
            onClick={onNavigateHome}
            className="cursor-pointer"
          />
        </div>

        {/* CENTRE: Desktop Navigation Links (Never wrap individually) */}
        <nav
          aria-label="Global Navigation"
          className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-medium text-slate-600"
        >
          <a
            href="/#cockpit"
            onClick={(e) => handleNav('/#cockpit', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:text-blue-600"
          >
            Features
          </a>
          <a
            href="/#journey"
            onClick={(e) => handleNav('/#journey', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:text-blue-600"
          >
            How it Works
          </a>
          <a
            href="/pricing"
            onClick={(e) => handleNav('/pricing', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:text-blue-600"
          >
            Pricing
          </a>
          <a
            href="/about"
            onClick={(e) => handleNav('/about', e)}
            className="whitespace-nowrap transition-colors hover:text-slate-900 focus:outline-hidden focus-visible:text-blue-600"
          >
            Support
          </a>
        </nav>

        {/* RIGHT: Authentication Switchers & Mobile Hamburger */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateLogin}
            className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activePage === 'login'
                ? 'bg-white/90 text-slate-900 border border-slate-300/80 shadow-xs ring-2 ring-violet-500/20'
                : 'bg-white/50 hover:bg-white/80 text-slate-700 border border-slate-200/80 shadow-2xs hover:text-slate-900'
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={onNavigateSignup}
            className={`px-3.5 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activePage === 'signup'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-400/40 hover:opacity-95'
                : 'bg-gradient-to-r from-blue-600 to-[#8065F5] text-white shadow-sm hover:shadow-md hover:shadow-violet-500/25 hover:opacity-95'
            }`}
          >
            Sign Up
          </button>

          {/* Mobile Menu Button (< 768px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (< 768px) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-lg px-6 py-4 space-y-3 shadow-lg">
          <a
            href="/#cockpit"
            onClick={(e) => handleNav('/#cockpit', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
          >
            Features
          </a>
          <a
            href="/#journey"
            onClick={(e) => handleNav('/#journey', e)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
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
        </div>
      )}
    </header>
  );
};
