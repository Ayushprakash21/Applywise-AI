import React from 'react';
import { Compass, Sparkles, TrendingUp, FileText, Target, ShieldCheck } from 'lucide-react';

export interface AuthFeatureCardsProps {
  mode: 'signin' | 'signup';
  className?: string;
}

export const AuthFeatureCards: React.FC<AuthFeatureCardsProps> = ({ mode, className = '' }) => {
  const signinFeatures = [
    {
      icon: <Compass className="w-5 h-5 text-blue-600" />,
      title: 'Discover Real Jobs',
      desc: 'Find roles that truly match you from verified sources.',
      gradient: 'from-blue-500/20 to-indigo-500/20 border-blue-200/50',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#8065F5]" />,
      title: 'Tailor & Apply',
      desc: 'Create personalized applications with verified evidence.',
      gradient: 'from-indigo-500/20 to-purple-500/20 border-indigo-200/50',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
      title: 'Track Your Growth',
      desc: 'Manage applications and verified career progress.',
      gradient: 'from-purple-500/20 to-blue-500/20 border-purple-200/50',
    },
  ];

  const signupFeatures = [
    {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      title: 'AI Resume Intelligence',
      desc: 'Extract and organize professional experience factually.',
      gradient: 'from-blue-500/20 to-indigo-500/20 border-blue-200/50',
    },
    {
      icon: <Target className="w-5 h-5 text-[#8065F5]" />,
      title: 'Smart Job Matching',
      desc: 'Discover relevant opportunities based on authentic skills.',
      gradient: 'from-indigo-500/20 to-purple-500/20 border-indigo-200/50',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
      title: 'Verified Career Profile',
      desc: 'Build an accurate profile without fabricated qualifications.',
      gradient: 'from-purple-500/20 to-blue-500/20 border-purple-200/50',
    },
  ];

  const items = mode === 'signin' ? signinFeatures : signupFeatures;

  return (
    <div className={`flex flex-col space-y-4 w-full max-w-[320px] select-none ${className}`}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="group relative flex items-center space-x-3.5 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(80,100,150,0.08)] hover:bg-white/80 hover:shadow-[0_16px_40px_rgba(80,100,150,0.12)] hover:-translate-y-0.5 transition-all duration-300"
        >
          {/* Leading Icon Badge */}
          <div
            className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-br ${item.gradient} border shadow-2xs group-hover:scale-105 transition-transform`}
          >
            {item.icon}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 tracking-tight leading-snug">
              {item.title}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-normal line-clamp-2">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
