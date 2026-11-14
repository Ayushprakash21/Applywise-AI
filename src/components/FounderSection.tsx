import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Linkedin, Quote } from 'lucide-react';
import { FounderProfile } from '../types/index.ts';
import { DEFAULT_FOUNDER_PROFILE } from '../data/defaultFounderProfile.ts';
import { api } from '../services/api.ts';
import { useTheme } from '../context/ThemeContext.tsx';

interface FounderSectionProps {
  onReadStory?: () => void;
  showExtendedBio?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  initialProfile?: FounderProfile;
}

export const FounderSection: React.FC<FounderSectionProps> = ({
  onReadStory,
  showExtendedBio = false,
  className = '',
  theme,
  initialProfile,
}) => {
  const [profile, setProfile] = useState<FounderProfile>(initialProfile || DEFAULT_FOUNDER_PROFILE);
  const themeContext = useTheme();
  const effectiveTheme = theme || themeContext.appearance;
  const isDark = effectiveTheme === 'dark';

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      return;
    }
    let isMounted = true;
    api.getFounderProfile()
      .then((res) => {
        if (isMounted && res.profile) {
          setProfile(res.profile);
        }
      })
      .catch((err) => {
        // Fallback gracefully to default verified founder profile
        console.warn('Failed to load published founder profile, using default:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [initialProfile]);

  // Verified LinkedIn URL with fallback to official profile
  const founderConnectUrl = profile.linkedinUrl || 'https://www.linkedin.com/in/ayushprakash21/';

  return (
    <section className={`relative overflow-hidden py-20 md:py-32 ${className}`} id="founder">
      {/* Background ambient lighting */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px]" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wider uppercase ${
            isDark
              ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-blue-50 border border-blue-200/80 text-blue-700'
          }`}>
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Meet the Founder</span>
          </div>
          <h2 className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Built with ambition. Powered by AI.
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Designed to make every career opportunity count with 100% factual fidelity.
          </p>
        </div>

        {/* Cinematic Founder Capsule */}
        <div className={`rounded-3xl border overflow-hidden p-6 sm:p-10 md:p-14 relative ${
          isDark
            ? 'bg-[var(--be-bg-card,#14171C)] border-[var(--be-border-subtle,rgba(255,255,255,0.08))] shadow-md'
            : 'bg-white border-slate-200 shadow-md'
        }`}>
          {/* Subtle top edge highlight */}
          {isDark && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
            {/* Left: Avatar / Photo & Badges */}
            <div className="lg:col-span-4 flex flex-col items-center text-center space-y-5">
              {/* Premium Photo or Monogram Mark with Orbital Lighting */}
              <div className="relative group">
                <div className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl border p-[2px] shadow-sm transition-transform duration-300 group-hover:scale-[1.01] ${
                  isDark
                    ? 'bg-slate-800 border-[var(--be-border-focus,#C6A66A)]'
                    : 'bg-slate-100 border-slate-200'
                }`}>
                  {profile.photoUrl ? (
                    <div className="w-full h-full rounded-[14px] bg-slate-950 overflow-hidden relative group/img">
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover rounded-[14px] transition-transform duration-700 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 border border-white/15 rounded-[14px] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#C6A66A]">
                        AP
                      </span>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#C6A66A] mt-2 font-semibold">
                        Founder & Architect
                      </span>
                      <div className="absolute inset-0 border border-white/10 rounded-[14px] pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {profile.name || 'Ayush Prakash'}
                </h3>
                <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  {profile.designation || 'Founder & Product Architect, ApplyVise AI'}
                </p>
                {profile.subtitle && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {profile.subtitle}
                  </p>
                )}
              </div>

              {/* Verified Expertise Tags */}
              {profile.expertiseTags && profile.expertiseTags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1 text-[11px]">
                  {profile.expertiseTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg border font-medium ${
                        isDark
                          ? 'bg-[var(--be-bg-surface,#181C22)] border-[var(--be-border-subtle,rgba(255,255,255,0.08))] text-slate-300'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Bio & Founder Vision */}
            <div className="lg:col-span-8 space-y-6">
              <div className={`space-y-4 text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {profile.bioParagraphs && profile.bioParagraphs.length > 0 ? (
                  profile.bioParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))
                ) : (
                  <p>{profile.shortBio}</p>
                )}
              </div>

              {/* Founder Personal Quote Box — High-Contrast Accessible Surface */}
              {profile.quote && (
                <div className={`p-5 sm:p-6 rounded-2xl border relative transition-colors ${
                  isDark
                    ? 'bg-[var(--be-bg-surface,#181C22)] border-[var(--be-border-subtle,rgba(255,255,255,0.08))]'
                    : 'bg-slate-50 border-slate-200/90 shadow-2xs'
                }`}>
                  <Quote className={`h-6 w-6 absolute top-3.5 right-4 ${isDark ? 'text-[var(--be-accent,#A78343)] opacity-70' : 'text-blue-600 opacity-60'}`} />
                  <p className={`text-xs sm:text-sm italic leading-relaxed pr-6 ${
                    isDark ? 'text-slate-100 font-medium' : 'text-slate-800 font-medium'
                  }`}>
                    "{profile.quote}"
                  </p>
                  <div className="mt-3 text-right">
                    <span className={`text-xs font-semibold ${isDark ? 'text-[var(--be-accent,#A78343)]' : 'text-blue-700 font-bold'}`}>
                      — {profile.quoteAuthor || profile.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons & Verified Social Link */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onReadStory && (
                  <button
                    onClick={onReadStory}
                    className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
                      isDark
                        ? 'bg-[var(--be-accent,#A78343)] hover:bg-[var(--be-accent-hover,#917135)] text-[#17130C]'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    }`}
                  >
                    <span>Read Full Founder Story</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                <a
                  href={founderConnectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-2 ${
                    isDark
                      ? 'bg-[var(--be-bg-surface,#181C22)] hover:bg-[var(--be-bg-card,#14171C)] text-slate-200 border-[var(--be-border-subtle,rgba(255,255,255,0.08))]'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                  <span>Connect on LinkedIn</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
