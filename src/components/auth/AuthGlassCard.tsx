import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface AuthGlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const AuthGlassCard: React.FC<AuthGlassCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className={`relative w-full max-w-[450px] p-6 sm:p-8 rounded-3xl glass-auth-surface overflow-hidden ${className}`}
      {...props}
    >
      {/* Specular glass reflection line at top edge */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" 
        aria-hidden="true"
      />
      {/* Subtle corner sheen */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 w-48 h-48 rounded-full bg-white/20 blur-2xl" 
        aria-hidden="true"
      />

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
