import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';
import { GlobalFooter } from './GlobalFooter.tsx';
import { Home, Compass, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateRadar?: () => void;
  onNavigateLogin?: () => void;
  planId?: string | null;
  destination?: string | null;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateRadar,
  onNavigateLogin,
  planId,
  destination,
}) => {
  React.useEffect(() => {
    document.title = '404 - Opportunity Not Found | ApplyVise AI';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', "Looks like this opportunity took a wrong turn. Return to ApplyVise AI or explore career opportunities.");
    }
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onNavigateHome();
    }
  };

  return (
    <div
      role="main"
      aria-label="404 Page Not Found"
      className="min-h-screen bg-[#08090B] text-[#F0EEE9] flex flex-col items-center justify-between font-sans selection:bg-[#C6A66A]/20 selection:text-[#E2C58A] relative overflow-x-hidden"
    >
      {/* Top minimal header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between z-20">
        <BrandLogo size="md" variant="dark" onClick={onNavigateHome} />
        <button
          onClick={handleBack}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#B7B4AD] hover:text-[#F0EEE9] hover:bg-[#13161B] border border-transparent hover:border-[#292D34] transition cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </header>

      {/* Main 404 Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center text-center z-10">
        {/* Original Animation Container */}
        <div
          className="w-full max-w-[680px] h-[340px] sm:h-[400px] flex items-start justify-center relative overflow-hidden rounded-2xl bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/404_dribbble_1.gif'), url('https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
          role="img"
          aria-label="Illustrated animated figure in 404 landscape"
        >
          {/* Subtle vignette blend matching #08090B border */}
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-[#292D34]/40 rounded-2xl bg-gradient-to-t from-[#08090B] via-transparent to-transparent opacity-90 sm:opacity-80" />

          {/* 404 Heading matching original layout */}
          <h1 className="relative z-10 text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-[#08090B] pt-4 select-none drop-shadow-sm font-sans">
            404
          </h1>
        </div>

        {/* Content Box */}
        <div className="w-full max-w-xl mx-auto -mt-6 sm:-mt-10 relative z-20 px-4 space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#13161B] border border-[#292D34] text-[11px] font-semibold text-[#C6A66A] tracking-wider uppercase">
            Opportunity Not Found
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F0EEE9] tracking-tight leading-snug">
            Looks like this opportunity took a wrong turn.
          </h2>

          <div className="space-y-1 text-xs sm:text-sm text-[#B7B4AD] leading-relaxed max-w-md mx-auto">
            <p>The page you&apos;re looking for isn&apos;t available right now.</p>
            <p className="text-[#8E8B83]">Your career journey doesn&apos;t have to stop here.</p>
          </div>

          {/* Context details if triggered via plan/destination */}
          {(planId || destination) && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13161B]/90 border border-[#292D34] text-[11px] text-[#B7B4AD]">
              {planId && (
                <span>Plan: <strong className="text-[#E2C58A] uppercase">{planId}</strong></span>
              )}
              {planId && destination && <span className="text-[#555]">•</span>}
              {destination && (
                <span className="font-mono text-[10px] text-[#8E8B83] truncate max-w-[200px]" title={destination}>
                  {destination}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {/* Primary Champagne Gold Button */}
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#C6A66A] to-[#E2C58A] hover:from-[#D4B579] hover:to-[#EED69F] text-[#08090B] text-xs sm:text-sm font-bold shadow-lg shadow-[#C6A66A]/10 hover:shadow-[#C6A66A]/20 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <Home className="h-4 w-4" />
              <span>Return to ApplyVise AI</span>
            </button>

            {/* Secondary Explore Opportunities Link */}
            {onNavigateRadar && (
              <button
                onClick={onNavigateRadar}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#13161B] hover:bg-[#191D23] border border-[#292D34] hover:border-[#C6A66A]/40 text-[#F0EEE9] hover:text-[#E2C58A] text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Compass className="h-4 w-4 text-[#C6A66A]" />
                <span>Explore Career Opportunities</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <GlobalFooter variant="minimal" onNavigateHome={onNavigateHome} className="z-10" />
    </div>
  );
};

export default NotFoundPage;
