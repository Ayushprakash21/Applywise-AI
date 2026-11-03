import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Linkedin, Quote } from 'lucide-react';
import { FounderProfile } from '../types/index.ts';
import { DEFAULT_FOUNDER_PROFILE } from '../data/defaultFounderProfile.ts';
import { api } from '../services/api.ts';

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
  theme = 'dark',
  initialProfile,
}) => {
  const [profile, setProfile] = useState<FounderProfile>(initialProfile || DEFAULT_FOUNDER_PROFILE);
  const isDark = theme === 'dark';

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
            ? 'bg-slate-950/70 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]'
            : 'bg-white border-slate-200 shadow-xl'
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
                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-[0_0_40px_rgba(14,165,233,0.25)] transition-transform duration-500 group-hover:scale-[1.02]">
                  {profile.photoUrl ? (
                    <div className="w-full h-full rounded-[22px] bg-slate-950 overflow-hidden relative group/img">
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover rounded-[22px] transition-transform duration-700 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 border border-white/15 rounded-[22px] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-100 to-blue-300">
                        AP
                      </span>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 mt-2 font-semibold">
                        Founder & Architect
                      </span>
                      <div className="absolute inset-0 border border-white/10 rounded-[22px] pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {profile.name || 'Ayush Prakash'}
                </h3>
                <p className="text-xs font-semibold text-cyan-400 mt-1">
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
                      className={`px-2.5 py-1 rounded-lg border ${
                        isDark
                          ? 'bg-slate-900/80 border-white/10 text-slate-300'
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

              {/* Founder Personal Quote Box */}
              {profile.quote && (
                <div className={`p-5 rounded-2xl border relative ${
                  isDark
                    ? 'bg-slate-900/60 border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <Quote className="h-6 w-6 text-cyan-400/30 absolute top-3 right-4" />
                  <p className={`text-xs sm:text-sm italic leading-relaxed ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}>
                    "{profile.quote}"
                  </p>
                  <div className="mt-3 text-right">
                    <span className={`text-xs font-semibold ${isDark ? 'text-cyan-400' : 'text-slate-900'}`}>
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
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-cyan-500/20 transition flex items-center space-x-2 active:scale-95"
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
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-cyan-500/40'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
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
