import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  FileCheck,
  User,
  Shield,
  Bell,
  Sliders,
  LogOut,
  ChevronDown,
  Sparkles,
  Info,
  ShieldAlert,
  FileText,
  KeyRound,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { AuthUser } from '../services/api.ts';
import { NotificationItem, AutomationSettings, AccountUsageStats } from '../types/index.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';

interface AppHeaderProps {
  user: AuthUser;
  activeTab: 'jobs' | 'applications' | 'profile' | 'twin';
  onSelectTab: (tab: 'jobs' | 'applications' | 'profile' | 'twin') => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  settings: AutomationSettings | null;
  onToggleEmergencyStop: () => void;
  onOpenSettingsModal: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onLogout: () => void;
  plan?: 'free' | 'pro';
  usage?: AccountUsageStats | null;
  onOpenPricing?: () => void;
  onOpenAbout?: () => void;
  onOpenAdmin?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  settings,
  onToggleEmergencyStop,
  onOpenSettingsModal,
  onOpenPrivacy,
  onOpenTerms,
  onLogout,
  plan = 'free',
  usage,
  onOpenPricing,
  onOpenAbout,
  onOpenAdmin,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isFounderAccount = isPermanentFreeAccessAccount(user);
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Primary Fixed / Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.03)] transition-all">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Segmented Tab Navigation */}
          <div className="flex items-center space-x-6 min-w-0">
            <BrandLogo size="md" onClick={() => onSelectTab('jobs')} />

            {/* Segmented Neumorphic Tab Container (Desktop & Tablet) */}
            <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => onSelectTab('jobs')}
                className={`h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 sm:space-x-2 transition-all ${
                  activeTab === 'jobs'
                    ? 'bg-white text-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Live Jobs</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => onSelectTab('applications')}
                className={`h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 sm:space-x-2 transition-all ${
                  activeTab === 'applications'
                    ? 'bg-white text-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>My Applications</span>
              </button>

              <button
                onClick={() => onSelectTab('profile')}
                className={`h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 sm:space-x-2 transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white text-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => onSelectTab('twin')}
                className={`h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 sm:space-x-2 transition-all ${
                  activeTab === 'twin'
                    ? 'bg-white text-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span>Career Twin</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                  Verified
                </span>
              </button>
            </nav>
          </div>

          {/* Right Controls: Harmonized Height (h-8.5 / h-8), Neumorphic/Glass Balance */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Quota / Resumes counter (Desktop) */}
            {usage && (
              <div className="hidden xl:flex items-center h-8.5 px-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 text-[11px] font-medium shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] space-x-2">
                {usage.planId === 'free' ? (
                  <>
                    <span>Resumes: <strong className="text-slate-900">{usage.resumes.active}/1</strong></span>
                    <span className="text-slate-300">·</span>
                    <span>Apps: <strong className="text-slate-900">{usage.applications.distinctCount}/5</strong></span>
                  </>
                ) : (
                  <span className="text-blue-700 font-semibold flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Unlimited Usage</span>
                  </span>
                )}
              </div>
            )}

            {/* Refined Plan Badge (Neumorphic) */}
            {isFounderAccount ? (
              <button
                onClick={onOpenPricing}
                title="Founder Access: Unrestricted Pro Privileges"
                className="h-8.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 text-blue-800 border border-blue-200/80 hover:border-blue-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center space-x-1.5 transition active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Founder Pro</span>
              </button>
            ) : plan === 'pro' ? (
              <button
                onClick={onOpenPricing}
                className="h-8.5 px-3 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center space-x-1.5 transition hover:bg-blue-100/70 active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Pro Tier</span>
              </button>
            ) : (
              onOpenPricing && (
                <button
                  onClick={onOpenPricing}
                  className="hidden sm:flex items-center space-x-1.5 h-8.5 px-3.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Upgrade</span>
                </button>
              )
            )}

            {/* Emergency Automation Toggle Pill */}
            {settings && (
              <button
                onClick={onToggleEmergencyStop}
                title={settings.emergencyStop ? 'Automation halted. Click to re-activate.' : 'Engine active. Click to halt instantly.'}
                className={`hidden md:flex items-center space-x-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
                  settings.emergencyStop
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/60'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${settings.emergencyStop ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span>{settings.emergencyStop ? 'Halted' : 'Active Safe'}</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                className="h-8.5 w-8.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition relative active:scale-95"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12)] overflow-hidden py-2 animate-in fade-in duration-150 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition ${!n.read ? 'bg-blue-50/40' : ''}`}
                        >
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-8.5 pl-2 pr-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center space-x-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition active:scale-95"
              >
                <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-800 hidden sm:block max-w-[110px] truncate">
                  {user.fullName || user.email}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12)] overflow-hidden py-1.5 animate-in fade-in duration-150 z-50 text-xs">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                    <p className="font-bold text-slate-900 truncate">{user.fullName || 'User'}</p>
                    <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                        {isFounderAccount ? 'Founder Access' : plan}
                      </span>
                      {isAdmin && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-slate-900 text-white uppercase">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Admin Console Shortcut if admin */}
                    {isAdmin && onOpenAdmin && (
                      <button
                        onClick={() => { setShowUserMenu(false); onOpenAdmin(); }}
                        className="w-full px-3.5 py-2 text-left text-slate-900 hover:bg-slate-100 flex items-center space-x-2 font-bold transition border-b border-slate-100"
                      >
                        <ShieldAlert className="h-4 w-4 text-indigo-600" />
                        <span>Administrator Console</span>
                      </button>
                    )}

                    {onOpenPricing && (
                      <button
                        onClick={() => { setShowUserMenu(false); onOpenPricing(); }}
                        className="w-full px-3.5 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center space-x-2 font-semibold transition"
                      >
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span>{isFounderAccount ? 'Plan: Founder Access' : plan === 'pro' ? 'Subscription & Billing' : 'Upgrade to Pro'}</span>
                      </button>
                    )}

                    {onOpenAbout && (
                      <button
                        onClick={() => { setShowUserMenu(false); onOpenAbout(); }}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                      >
                        <Info className="h-4 w-4 text-slate-400" />
                        <span>About ApplyVise AI</span>
                      </button>
                    )}

                    <button
                      onClick={() => { setShowUserMenu(false); onOpenSettingsModal(); }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                    >
                      <Sliders className="h-4 w-4 text-slate-400" />
                      <span>Automation Settings</span>
                    </button>

                    <button
                      onClick={() => { setShowUserMenu(false); onOpenPrivacy(); }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                    >
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span>Privacy Policy</span>
                    </button>

                    <button
                      onClick={() => { setShowUserMenu(false); onOpenTerms(); }}
                      className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                    >
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span>Terms of Use</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-semibold transition"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop, Fixed to bottom on Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around">
        <button
          onClick={() => onSelectTab('jobs')}
          className={`flex-1 min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold transition ${
            activeTab === 'jobs' ? 'text-blue-600 bg-blue-50/80' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Live Jobs"
        >
          <Briefcase className="h-4 w-4 mb-0.5" />
          <span>Live Jobs</span>
        </button>

        <button
          onClick={() => onSelectTab('applications')}
          className={`flex-1 min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold transition ${
            activeTab === 'applications' ? 'text-blue-600 bg-blue-50/80' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Applications"
        >
          <FileCheck className="h-4 w-4 mb-0.5" />
          <span>Applications</span>
        </button>

        <button
          onClick={() => onSelectTab('profile')}
          className={`flex-1 min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold transition ${
            activeTab === 'profile' ? 'text-blue-600 bg-blue-50/80' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Profile"
        >
          <User className="h-4 w-4 mb-0.5" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => onSelectTab('twin')}
          className={`flex-1 min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold transition ${
            activeTab === 'twin' ? 'text-blue-600 bg-blue-50/80' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Career Twin"
        >
          <Shield className="h-4 w-4 mb-0.5 text-emerald-600" />
          <span>Career Twin</span>
        </button>
      </div>
    </>
  );
};
