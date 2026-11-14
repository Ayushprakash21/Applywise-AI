import React from 'react';
import { Compass, Sparkles, TrendingUp, FileText, Target, ShieldCheck } from 'lucide-react';

export interface AuthFeatureCardsProps {
  mode: 'signin' | 'signup';
  className?: string;
}

export const AuthFeatureCards: React.FC<AuthFeatureCardsProps> = ({ mode, className = '' }) => {
  const signinFeatures = [
    {
      icon: <Compass className="w-5 h-5 text-blue-600 dark:text-sky-400" />,
      title: 'Discover Real Jobs',
      desc: 'Find roles that truly match you from verified sources.',
      gradient: 'from-blue-500/20 to-indigo-500/20 border-blue-200/50 dark:from-blue-500/30 dark:to-indigo-500/30 dark:border-blue-400/30',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#8065F5] dark:text-[#A78BFA]" />,
      title: 'Tailor & Apply',
      desc: 'Create personalized applications with verified evidence.',
      gradient: 'from-indigo-500/20 to-purple-500/20 border-indigo-200/50 dark:from-indigo-500/30 dark:to-purple-500/30 dark:border-indigo-400/30',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: 'Track Your Growth',
      desc: 'Manage applications and verified career progress.',
      gradient: 'from-purple-500/20 to-blue-500/20 border-purple-200/50 dark:from-purple-500/30 dark:to-blue-500/30 dark:border-purple-400/30',
    },
  ];

  const signupFeatures = [
    {
      icon: <FileText className="w-5 h-5 text-blue-600 dark:text-sky-400" />,
      title: 'AI Resume Intelligence',
      desc: 'Extract and organize professional experience factually.',
      gradient: 'from-blue-500/20 to-indigo-500/20 border-blue-200/50 dark:from-blue-500/30 dark:to-indigo-500/30 dark:border-blue-400/30',
    },
    {
      icon: <Target className="w-5 h-5 text-[#8065F5] dark:text-[#A78BFA]" />,
      title: 'Smart Job Matching',
      desc: 'Discover relevant opportunities based on authentic skills.',
      gradient: 'from-indigo-500/20 to-purple-500/20 border-indigo-200/50 dark:from-indigo-500/30 dark:to-purple-500/30 dark:border-indigo-400/30',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: 'Verified Career Profile',
      desc: 'Build an accurate profile without fabricated qualifications.',
      gradient: 'from-purple-500/20 to-blue-500/20 border-purple-200/50 dark:from-purple-500/30 dark:to-blue-500/30 dark:border-purple-400/30',
    },
  ];

  const items = mode === 'signin' ? signinFeatures : signupFeatures;

  return (
    <div className={`flex flex-col space-y-4 w-full max-w-[320px] select-none ${className}`}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="auth-feature-card group relative flex items-center space-x-3.5 p-4 rounded-2xl bg-white/90 dark:bg-[var(--be-bg-card,#14171C)] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_32px_rgba(80,100,150,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:bg-white dark:hover:bg-[var(--be-bg-elevated,#191D23)] hover:shadow-[0_16px_40px_rgba(80,100,150,0.12)] hover:-translate-y-0.5 transition-all duration-300"
        >
          {/* Leading Icon Badge */}
          <div
            className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br ${item.gradient} border shadow-2xs group-hover:scale-105 transition-transform`}
          >
            {item.icon}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC] tracking-tight leading-snug">
              {item.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5 leading-normal line-clamp-2">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
