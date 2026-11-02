import React, { useState } from 'react';
import {
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Compass,
  Briefcase,
  User,
  FileText,
  ListOrdered,
  Kanban,
  Globe,
  Sliders,
  BarChart3,
  ScrollText,
  Layers
} from 'lucide-react';
import { AutomationSettings, NotificationItem } from '../types/index.ts';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: AutomationSettings | null;
  onToggleEmergencyStop: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onToggleEmergencyStop,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const modeLabels: Record<string, { label: string; color: string; desc: string }> = {
    MODE_A_RESEARCH: {
      label: 'MODE A: Research Only',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      desc: 'Discovery & match scoring only. Zero submissions.',
    },
    MODE_B_PREPARE_APPROVE: {
      label: 'MODE B: Prepare & Approve',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      desc: 'Tailors resumes & packages; requires 1-click human approval.',
    },
    MODE_C_AUTONOMOUS: {
      label: 'MODE C: Preauthorized Auto',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      desc: 'Autonomous submission for matches >= threshold.',
    },
  };

  const currentModeInfo = settings ? modeLabels[settings.mode] : modeLabels.MODE_B_PREPARE_APPROVE;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Compass },
    { id: 'discovery', label: 'Job Discovery', icon: Briefcase },
    { id: 'profile', label: 'Career Profile', icon: User },
    { id: 'resume_studio', label: 'Resume Studio', icon: FileText },
    { id: 'queue', label: 'Application Queue', icon: ListOrdered },
    { id: 'tracker', label: 'Tracker', icon: Kanban },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'settings', label: 'Automation', icon: Sliders },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Logs', icon: ScrollText },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md text-slate-100">
      {/* Top Banner & Safety Controls */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 font-bold text-white shadow-lg shadow-indigo-500/20">
            <span className="text-lg tracking-wider font-mono">Ω</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-tight text-white text-base">ORION</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                CAREER AGENT
              </span>
              <span className="flex items-center space-x-1 text-xs text-slate-400">
                <span className={`inline-block h-2 w-2 rounded-full ${settings?.emergencyStop ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
                <span>{settings?.emergencyStop ? 'Engine Halted' : 'Agent Active'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Autonomous Job Search & Truthful Resume Optimization
            </p>
          </div>
        </div>

        {/* Operating Mode and Emergency Stop Controls */}
        <div className="flex items-center space-x-3">
          {/* Mode Badge */}
          <div
            title={currentModeInfo.desc}
            className={`hidden md:flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${currentModeInfo.color}`}
          >
            <span className="mr-1.5 font-bold">●</span>
            {currentModeInfo.label}
          </div>

          {/* Emergency Stop Switch */}
          <button
            onClick={onToggleEmergencyStop}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 border shadow-sm ${
              settings?.emergencyStop
                ? 'bg-red-600 text-white border-red-500 hover:bg-red-700 animate-pulse'
                : 'bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/60 hover:text-white'
            }`}
            title="Emergency Stop: Instantly halts all autonomous application submissions"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{settings?.emergencyStop ? 'EMERGENCY STOPPED' : 'EMERGENCY STOP'}</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl z-50 text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">Agent Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-500">No notifications</p>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                          notif.read
                            ? 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                            : 'bg-indigo-950/30 border-indigo-800/50 text-slate-200 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-100">{notif.title}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="mx-auto max-w-7xl px-2 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-900">
        <nav className="flex space-x-1 py-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
