import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowLeft, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { api, AuthUser } from '../services/api.ts';

interface AdminLoginPageProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAccessDenied(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both administrative email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login({ email: email.trim(), password });
      
      if (!res.success || !res.user) {
        setErrorMessage('Authentication failed. Please verify administrative credentials.');
        return;
      }

      // Strict client verification of server-issued role
      if (res.user.role !== 'admin') {
        setIsAccessDenied(true);
        setErrorMessage(
          `Access Denied: Account "${res.user.email}" authenticated successfully but is not assigned the "admin" role. Administrator privileges are required to access this console.`
        );
        return;
      }

      onSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'An error occurred during administrator authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top minimal header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
          <BrandLogo size="md" showWordmark={true} />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-900 text-white shadow-xs">
            Admin Portal
          </span>
        </div>
        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition neu-button"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </button>
      </header>

      {/* Center login card */}
      <div className="w-full max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08)] relative overflow-hidden">
          {/* Subtle security accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-800" />

          {/* Badge & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-4 neu-raised">
              <Shield className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Administrator Login
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Authorized personnel only. Access is strictly audited and monitored for platform integrity.
            </p>
          </div>

          {/* Error / Access Denied Alerts */}
          {errorMessage && (
            <div
              className={`p-3.5 rounded-2xl mb-6 text-xs flex items-start space-x-2.5 border animate-in fade-in duration-200 ${
                isAccessDenied
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-bold">{isAccessDenied ? 'Permission Defect' : 'Authentication Error'}</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@applywise.ai"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs tracking-wide shadow-md hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center space-x-2 mt-6 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-blue-400" />
                  <span>Authenticate as Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Footer advisory */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>TLS 1.3 / D1 Protected</span>
            </span>
            <span>Zero Trust Architecture</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        ApplyWise AI Internal Control Plane · Cloudflare Edge Runtime · All sessions recorded to security audit log
      </footer>
    </div>
  );
};
