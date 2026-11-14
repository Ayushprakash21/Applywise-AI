import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { ShieldCheck } from 'lucide-react';

export interface GlobalFooterProps {
  variant?: 'dashboard' | 'landing' | 'minimal';
  plan?: 'free' | 'pro' | 'black';
  onNavigateHome?: () => void;
  onNavigateAbout?: () => void;
  onNavigatePricing?: () => void;
  onNavigateAdmin?: () => void;
  onOpenAbout?: () => void;
  onOpenPricing?: () => void;
  onOpenAdmin?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  className?: string;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({
  variant = 'dashboard',
  plan = 'free',
  onNavigateHome,
  onNavigateAbout,
  onNavigatePricing,
  onNavigateAdmin,
  onOpenAbout,
  onOpenPricing,
  onOpenAdmin,
  onOpenPrivacy,
  onOpenTerms,
  className = '',
}) => {
  const isBlack = plan === 'black';
  const currentYear = new Date().getFullYear();

  const handleAbout = onNavigateAbout || onOpenAbout;
  const handlePricing = onNavigatePricing || onOpenPricing;
  const handleAdmin = onNavigateAdmin || onOpenAdmin;
  const handleHome = onNavigateHome || (() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Minimal variant (for modals / compact error pages)
  if (variant === 'minimal') {
    return (
      <footer
        className={`w-full border-t py-4 px-4 text-center text-xs transition-colors ${
          isBlack
            ? 'border-[rgba(255,255,255,0.08)] bg-transparent text-[#92949A]'
            : 'border-slate-200/80 bg-transparent text-slate-500'
        } ${className}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <BrandLogo size="xs" showWordmark={false} onClick={handleHome} />
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-[#F2F0EA]">
              ApplyVise AI
            </span>
            <span className="text-slate-400 dark:text-[#92949A]">·</span>
            <span className="font-medium text-slate-700 dark:text-[#C0BDB5]">
              Your Career. Intelligently Orchestrated.
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#92949A] font-mono">
            &copy; {currentYear} ApplyVise AI. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }

  // Dashboard / Authenticated Workspace Footer
  if (variant === 'dashboard') {
    return (
      <footer
        className={`mt-12 border-t pt-8 pb-10 text-xs transition-colors ${
          isBlack
            ? 'border-[rgba(255,255,255,0.08)] bg-transparent text-[#92949A]'
            : 'border-slate-200/80 bg-transparent text-slate-500'
        } ${className}`}
        style={
          isBlack
            ? {
                borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.08))',
              }
            : undefined
        }
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Brand Identity & Positioning */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center space-x-2.5">
              <BrandLogo size="xs" showWordmark={false} onClick={handleHome} />
              <span className="font-bold tracking-tight text-xs text-slate-900 dark:text-[#F2F0EA]">
                ApplyVise AI
              </span>
              <span className="text-slate-400 dark:text-[#92949A]">·</span>
              <span
                className="font-semibold text-xs tracking-tight text-slate-800 dark:text-[#F2F0EA]"
                style={isBlack ? { color: 'var(--be-text-primary, #F2F0EA)' } : undefined}
              >
                Your Career. Intelligently Orchestrated.
              </span>
            </div>
            <p
              className="text-[11px] leading-relaxed text-slate-600 dark:text-[#92949A]"
              style={isBlack ? { color: 'var(--be-text-muted, #92949A)' } : undefined}
            >
              Discover opportunities. Build your professional edge. Navigate every career move with AI-powered intelligence.
            </p>
          </div>

          {/* Right: Quick Links & Legal */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 self-stretch md:self-auto justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600 dark:text-[#92949A]">
              {handleAbout && (
                <button
                  type="button"
                  onClick={handleAbout}
                  className="hover:text-slate-900 dark:hover:text-[#C6A66A] hover:underline transition-colors cursor-pointer"
                >
                  About Us
                </button>
              )}
              {handlePricing && (
                <button
                  type="button"
                  onClick={handlePricing}
                  className="hover:text-slate-900 dark:hover:text-[#C6A66A] hover:underline transition-colors cursor-pointer"
                >
                  Features & Pricing
                </button>
              )}
              {handleAdmin && (
                <button
                  type="button"
                  onClick={handleAdmin}
                  className="hover:text-slate-900 dark:hover:text-[#C6A66A] hover:underline transition-colors cursor-pointer"
                >
                  Admin Portal
                </button>
              )}
              {onOpenPrivacy && (
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="hover:text-slate-900 dark:hover:text-[#C6A66A] hover:underline transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              )}
              {onOpenTerms && (
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="hover:text-slate-900 dark:hover:text-[#C6A66A] hover:underline transition-colors cursor-pointer"
                >
                  Terms of Use
                </button>
              )}
              <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-[#35B887] select-none">
                <ShieldCheck className="w-3 h-3 text-[#35B887]" />
                <span>Zero Hallucination Standard</span>
              </span>
            </div>

            <p className="text-[10px] font-mono text-slate-400 dark:text-[#92949A] whitespace-nowrap">
              &copy; {currentYear} ApplyVise AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Landing / Marketing / Public Page Footer
  return (
    <footer
      className={`mt-auto py-12 text-xs border-t transition-colors ${
        isBlack
          ? 'bg-[#090A0C] border-[rgba(255,255,255,0.08)] text-[#92949A]'
          : 'bg-slate-900 border-slate-800 text-slate-400'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Left: Brand Identity, Positioning & Supporting Description */}
        <div className="space-y-2 max-w-lg">
          <div className="flex items-center space-x-3">
            <BrandLogo
              variant="dark"
              size="sm"
              onClick={handleHome}
            />
            <span className="font-bold text-sm tracking-tight text-white">
              ApplyVise AI
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-sm tracking-tight text-[#F2F0EA]">
              Your Career. Intelligently Orchestrated.
            </h4>
            <p className="text-xs text-slate-400 dark:text-[#92949A] mt-1 leading-relaxed">
              Discover opportunities. Build your professional edge. Navigate every career move with AI-powered intelligence.
            </p>
          </div>
        </div>

        {/* Right: Navigation Links & Copyright */}
        <div className="flex flex-col items-start md:items-end gap-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400">
            {handleAbout && (
              <button
                type="button"
                onClick={handleAbout}
                className="hover:text-white transition-colors cursor-pointer"
              >
                About Us
              </button>
            )}
            {handlePricing && (
              <button
                type="button"
                onClick={handlePricing}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Features & Pricing
              </button>
            )}
            {handleAdmin && (
              <button
                type="button"
                onClick={handleAdmin}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Admin Portal
              </button>
            )}
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms of Use
              </button>
            )}
            <span className="text-slate-500 font-mono text-[10px]">
              Zero Hallucination Standard
            </span>
          </div>

          <p className="text-slate-500 font-mono text-[11px]">
            &copy; {currentYear} ApplyVise AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
