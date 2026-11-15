import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { ShieldCheck, Linkedin, Twitter, Youtube, Github } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.ts';

export interface GlobalFooterProps {
  variant?: 'dashboard' | 'landing' | 'minimal';
  plan?: 'free' | 'pro' | 'black';
  onNavigateHome?: () => void;
  onNavigateAbout?: () => void;
  onNavigatePricing?: () => void;
  onOpenAbout?: () => void;
  onOpenPricing?: () => void;
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
  onOpenAbout,
  onOpenPricing,
  onOpenPrivacy,
  onOpenTerms,
  className = '',
}) => {
  const isBlack = plan === 'black';
  const currentYear = new Date().getFullYear();

  const handleAbout = onNavigateAbout || onOpenAbout;
  const handlePricing = onNavigatePricing || onOpenPricing;
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
              {BRAND_CONFIG.tagline}
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
                {BRAND_CONFIG.tagline}
              </span>
            </div>
            <p
              className="text-[11px] leading-relaxed text-slate-600 dark:text-[#92949A]"
              style={isBlack ? { color: 'var(--be-text-muted, #92949A)' } : undefined}
            >
              {BRAND_CONFIG.description}
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

  // Landing / Marketing / Public Page Footer (Matching Image 3)
  return (
    <footer
      className={`mt-auto pt-14 pb-12 text-xs border-t transition-colors bg-[#080F1C] border-[#101D30] text-slate-400 ${className}`}
      data-testid="global-landing-footer"
      data-theme-surface="dark"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-10 pb-12 border-b border-white/10">
          {/* Column 1 & 2: Brand Identity, Positioning & Supporting Description */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center">
              <BrandLogo
                variant="dark"
                size="sm"
                onClick={handleHome}
              />
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-sm">
              India's First AI-Powered Job Discovery &amp; Application Automation Platform.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
              {BRAND_CONFIG.description}
            </p>
          </div>

          {/* Column 3: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#jobs" className="hover:text-[#20B9F3] transition-colors">
                  Jobs
                </a>
              </li>
              <li>
                <a href="#cockpit" className="hover:text-[#20B9F3] transition-colors">
                  AI Tools
                </a>
              </li>
              <li>
                <a href="#journey" className="hover:text-[#20B9F3] transition-colors">
                  Resources
                </a>
              </li>
              {handlePricing && (
                <li>
                  <button
                    type="button"
                    onClick={handlePricing}
                    className="hover:text-[#20B9F3] transition-colors cursor-pointer text-left"
                  >
                    Pricing
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {handleAbout && (
                <li>
                  <button
                    type="button"
                    onClick={handleAbout}
                    className="hover:text-[#20B9F3] transition-colors cursor-pointer text-left"
                  >
                    About Us
                  </button>
                </li>
              )}
              <li>
                <a href="#founder" className="hover:text-[#20B9F3] transition-colors">
                  Founder Story
                </a>
              </li>
              <li>
                <span className="text-slate-500 cursor-default">Careers (Hiring Soon)</span>
              </li>
              <li>
                <a href="mailto:support@applywise.ai" className="hover:text-[#20B9F3] transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="mailto:support@applywise.ai" className="hover:text-[#20B9F3] transition-colors">
                  Help Center
                </a>
              </li>
              {onOpenPrivacy && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="hover:text-[#20B9F3] transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              )}
              {onOpenTerms && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="hover:text-[#20B9F3] transition-colors cursor-pointer text-left"
                  >
                    Terms of Service
                  </button>
                </li>
              )}
              <li>
                <a href="#integrity" className="hover:text-[#20B9F3] transition-colors">
                  Zero Hallucination
                </a>
              </li>
            </ul>
          </div>

          {/* Column 6: Connect / Social */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Connect
            </h4>
            <div className="flex items-center space-x-3 text-slate-400">
              <a
                href="https://www.linkedin.com/in/ayushprakash21/"
                target="_blank"
                rel="noreferrer noopener"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#20B9F3]/50 hover:text-[#20B9F3] flex items-center justify-center transition"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer noopener"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#20B9F3]/50 hover:text-[#20B9F3] flex items-center justify-center transition"
                aria-label="X (Twitter)"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer noopener"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#20B9F3]/50 hover:text-[#20B9F3] flex items-center justify-center transition"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#20B9F3]/50 hover:text-[#20B9F3] flex items-center justify-center transition"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>

            {/* Made in India Badge (Matching Image 3) */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300">
                <span>🇮🇳</span>
                <span>Made in India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Security Standard */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <p>
            &copy; {currentYear} ApplyWise AI. All rights reserved.
          </p>

          <div className="flex items-center space-x-2 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Hallucination Standard Grounded</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
