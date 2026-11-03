import React from 'react';

interface AuthBackgroundProps {
  theme?: 'light' | 'black';
  children?: React.ReactNode;
}

export const AuthBackground: React.FC<AuthBackgroundProps> = ({ theme }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Dynamic Animated Blurred Light Orbs */}
      {/* Orb 1: Indigo / Violet top-right */}
      <div 
        className="auth-orb-1 absolute -top-[12%] right-[8%] w-[680px] h-[680px] rounded-full blur-[140px] opacity-75"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(139, 92, 246, 0.22) 45%, transparent 70%)',
        }}
      />

      {/* Orb 2: Sky Blue / Cyan bottom-left */}
      <div 
        className="auth-orb-2 absolute bottom-[2%] left-[4%] w-[640px] h-[640px] rounded-full blur-[130px] opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(147, 197, 253, 0.25) 45%, transparent 70%)',
        }}
      />

      {/* Orb 3: Lavender / Soft Magenta center-right floating */}
      <div 
        className="auth-orb-3 absolute top-[36%] right-[28%] w-[500px] h-[500px] rounded-full blur-[115px] opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(216, 180, 254, 0.2) 50%, transparent 70%)',
        }}
      />

      {/* Ambient Silk Ribbons SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60 mix-blend-multiply"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <path
          d="M-80 500 C 320 280, 720 740, 1520 400 L 1520 950 L -80 950 Z"
          fill="url(#authWaveGrad1)"
          opacity="0.55"
        />
        <path
          d="M-40 680 C 440 520, 880 840, 1500 580 L 1500 950 L -40 950 Z"
          fill="url(#authWaveGrad2)"
          opacity="0.45"
        />
        <defs>
          <linearGradient id="authWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C7D7F8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#D8D2FA" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="authWaveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BACDF4" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#E2DBFD" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.65" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
