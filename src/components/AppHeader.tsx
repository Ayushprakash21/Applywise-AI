import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  User,
  Bell,
  Sliders,
  Shield,
  LogOut,
  ChevronDown,
  Check,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { AuthUser } from '../services/api.ts';
import { NotificationItem, AutomationSettings } from '../types/index.ts';

interface AppHeaderProps {
  user: AuthUser;
  activeTab: 'jobs' | 'applications' | 'profile';
  onSelectTab: (tab: 'jobs' | 'applications' | 'profile') => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  settings: AutomationSettings | null;
  onToggleEmergencyStop: () => void;
  onOpenSettingsModal: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onLogout: () => void;
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
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center space-x-8">
          <BrandLogo size="md" onClick={() => onSelectTab('jobs')} />

          {/* Minimal 3-Tab Signed-In Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('jobs')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'jobs'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Find Jobs</span>
            </button>

            <button
              onClick={() => onSelectTab('applications')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'applications'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>My Applications</span>
            </button>

            <button
              onClick={() => onSelectTab('profile')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </button>
          </nav>
        </div>

        {/* Right: Safety Stop, Notifications, User Avatar Dropdown */}
        <div className="flex items-center space-x-3">
          {/* Emergency Safety Pill */}
          {settings && (
            <button
              onClick={onToggleEmergencyStop}
              title={settings.emergencyStop ? 'Automation paused. Click to re-enable.' : 'Click to halt all automation instantly.'}
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                settings.emergencyStop
                  ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${settings.emergencyStop ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <span>{settings.emergencyStop ? 'Engine Halted' : 'Active Safe'}</span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden py-2 animate-in fade-in duration-150 z-50">
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
                    <p className="p-4 text-center text-xs text-slate-400">No notifications</p>
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

          {/* User Avatar & Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:block max-w-[120px] truncate">
                {user.fullName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden py-1.5 animate-in fade-in duration-150 z-50 text-xs">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                </div>

                <div className="py-1">
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
                    className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 font-semibold transition"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200/80 px-2 py-1.5 bg-slate-50/80 text-[11px]">
        <button
          onClick={() => onSelectTab('jobs')}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center font-medium ${
            activeTab === 'jobs' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Briefcase className="h-4 w-4 mb-0.5" />
          <span>Find Jobs</span>
        </button>
        <button
          onClick={() => onSelectTab('applications')}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center font-medium ${
            activeTab === 'applications' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileCheck className="h-4 w-4 mb-0.5" />
          <span>Applications</span>
        </button>
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center font-medium ${
            activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <User className="h-4 w-4 mb-0.5" />
          <span>Profile</span>
        </button>
      </div>
    </header>
  );
};
