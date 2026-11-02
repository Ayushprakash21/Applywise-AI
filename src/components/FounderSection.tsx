import React from 'react';
import { Sparkles, ArrowRight, Linkedin, Mail, ExternalLink, Quote, Compass, Target, Award } from 'lucide-react';

interface FounderSectionProps {
  onReadStory?: () => void;
  showExtendedBio?: boolean;
  className?: string;
}

export const FounderSection: React.FC<FounderSectionProps> = ({
  onReadStory,
  showExtendedBio = false,
  className = '',
}) => {
  // Configurable external founder connect URL (preserves privacy without inventing fake links)
  const founderConnectUrl = 'https://www.linkedin.com/in/ayushprakash21/';

  return (
    <section className={`relative overflow-hidden py-16 md:py-24 ${className}`} id="founder">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Meet the Founder</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built with ambition. Powered by AI.
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Designed to make every career opportunity count.
          </p>
        </div>

        {/* Founder Card with Glassmorphic & Neumorphic Design */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-6 sm:p-10 md:p-12 relative">
          {/* Subtle Ambient Gradient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Left: Avatar & Badges */}
            <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
              {/* Premium Initials Avatar with AV brand gradient & squircle framing */}
              <div className="relative group">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-1 shadow-xl shadow-blue-500/20 transition-transform duration-300 group-hover:scale-[1.02]">
                  <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white relative overflow-hidden">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-100 to-blue-300">
                      AP
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 mt-1 font-semibold">
                      Founder
                    </span>
                    {/* Subtle orbital ring reflection */}
                    <div className="absolute inset-0 border border-white/10 rounded-[22px] pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Ayush Prakash</h3>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">Founder & Product Architect, ApplyWise AI</p>
                <p className="text-xs text-slate-500 mt-1">MBA (Marketing & IT) • Project Management • AI Enthusiast</p>
              </div>

              {/* Founder Badges */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-1 text-[11px] text-slate-600">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200">Supply Chain & Operations</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200">Digital Product Strategy</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200">Applied AI Workflows</span>
              </div>
            </div>

            {/* Right: Bio & Founder Message */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-900 font-semibold">Ayush Prakash</strong> is a technology enthusiast, project management professional, and entrepreneur focused on exploring how artificial intelligence can make career development more accessible and efficient.
                </p>
                <p>
                  With a background spanning project management, business operations, supply chain, and an MBA in Marketing and IT, he brings together business thinking, operational experience, and a passion for building AI-powered digital products.
                </p>
                <p>
                  ApplyWise AI reflects his vision of making job searching more organized, intelligent, and accessible through technology. His goal is to build tools that help job seekers spend less time navigating repetitive tasks and more time preparing for meaningful career opportunities.
                </p>
              </div>

              {/* Founder Personal Quote Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative">
                <Quote className="h-6 w-6 text-blue-400/40 absolute top-3 right-3" />
                <p className="text-xs sm:text-sm italic text-slate-700 leading-relaxed">
                  "ApplyWise AI started with a simple idea: job searching should be more organized, less repetitive, and better supported by technology. I want to bring useful AI capabilities into one platform so candidates can approach their career journey with greater clarity and confidence. This is an ongoing journey, and the vision is to keep making the experience more helpful, accessible, and intelligent."
                </p>
                <div className="mt-2 text-right">
                  <span className="text-xs font-semibold text-slate-900">— Ayush Prakash</span>
                </div>
              </div>

              {/* Call-to-action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onReadStory && (
                  <button
                    type="button"
                    onClick={onReadStory}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                  >
                    <span>Read Our Story</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <a
                  href={founderConnectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs hover:shadow-sm transition flex items-center space-x-2"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                  <span>Connect with the Founder</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
