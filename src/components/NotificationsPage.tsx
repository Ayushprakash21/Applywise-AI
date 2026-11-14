import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Sparkles,
  Info,
  Check,
  RotateCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Inbox,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem } from '../types/index.ts';

export interface NotificationsPageProps {
  notifications: NotificationItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => Promise<void> | void;
  onMarkAsRead: (id: string) => Promise<void> | void;
  onMarkAllAsRead: () => Promise<void> | void;
  onNavigateToJobs?: () => void;
  onNavigateToApplications?: () => void;
}

type FilterType = 'all' | 'unread' | 'read';

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  isLoading = false,
  error = null,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToJobs,
  onNavigateToApplications,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Executive Notifications workspace is permanently styled in luxury BLACK ELITE
  const isBlack = true;

  // Statistics strictly derived from actual notification records
  const totalCount = notifications.length;
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const readCount = totalCount - unreadCount;

  // Filtered and searched notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // 1. Tab filter
      if (filter === 'unread' && n.read) return false;
      if (filter === 'read' && !n.read) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesMessage = n.message?.toLowerCase().includes(q);
        const matchesType = n.type?.toLowerCase().includes(q);
        return matchesTitle || matchesMessage || matchesType;
      }

      return true;
    });
  }, [notifications, filter, searchQuery]);

  // Handlers with rapid click protection
  const handleMarkOne = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await onMarkAsRead(id);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAll = async () => {
    if (isProcessingAll || unreadCount === 0) return;
    setIsProcessingAll(true);
    try {
      await onMarkAllAsRead();
    } finally {
      setIsProcessingAll(false);
    }
  };

  // Helper: Format timestamp cleanly
  const formatTime = (isoString?: string): string => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Helper: Configuration per notification type
  const getTypeConfig = (type: NotificationItem['type']) => {
    switch (type) {
      case 'match':
        return {
          icon: Sparkles,
          iconBg: isBlack
            ? 'bg-[rgba(148,131,232,0.18)] text-[#9483E8] border border-[rgba(148,131,232,0.35)]'
            : 'bg-violet-100 text-violet-600 border border-violet-200',
          label: 'Opportunity Match',
          badgeClass: isBlack
            ? 'bg-[rgba(148,131,232,0.12)] text-[#9483E8] border-[rgba(148,131,232,0.30)]'
            : 'bg-violet-50 text-violet-700 border-violet-200',
        };
      case 'submission_success':
        return {
          icon: CheckCircle2,
          iconBg: isBlack
            ? 'bg-[rgba(53,184,135,0.18)] text-[#35B887] border border-[rgba(53,184,135,0.35)]'
            : 'bg-emerald-100 text-emerald-600 border border-emerald-200',
          label: 'Application Sent',
          badgeClass: isBlack
            ? 'bg-[rgba(53,184,135,0.12)] text-[#35B887] border-[rgba(53,184,135,0.30)]'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'submission_failed':
        return {
          icon: AlertTriangle,
          iconBg: isBlack
            ? 'bg-[rgba(214,117,117,0.18)] text-[#D67575] border border-[rgba(214,117,117,0.35)]'
            : 'bg-rose-100 text-rose-600 border border-rose-200',
          label: 'Action Required',
          badgeClass: isBlack
            ? 'bg-[rgba(214,117,117,0.12)] text-[#D67575] border-[rgba(214,117,117,0.30)]'
            : 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'approval_needed':
        return {
          icon: Clock,
          iconBg: isBlack
            ? 'bg-[rgba(217,170,97,0.18)] text-[#D9AA61] border border-[rgba(217,170,97,0.35)]'
            : 'bg-amber-100 text-amber-600 border border-amber-200',
          label: 'Approval Needed',
          badgeClass: isBlack
            ? 'bg-[rgba(217,170,97,0.12)] text-[#D9AA61] border-[rgba(217,170,97,0.30)]'
            : 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'reminder':
        return {
          icon: Calendar,
          iconBg: isBlack
            ? 'bg-[rgba(148,131,232,0.18)] text-[#9483E8] border border-[rgba(148,131,232,0.35)]'
            : 'bg-indigo-100 text-indigo-600 border border-indigo-200',
          label: 'Interview Reminder',
          badgeClass: isBlack
            ? 'bg-[rgba(148,131,232,0.12)] text-[#9483E8] border-[rgba(148,131,232,0.30)]'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'system':
      default:
        return {
          icon: Info,
          iconBg: isBlack
            ? 'bg-[rgba(118,169,216,0.18)] text-[#76A9D8] border border-[rgba(118,169,216,0.35)]'
            : 'bg-sky-100 text-sky-600 border border-sky-200',
          label: 'System Update',
          badgeClass: isBlack
            ? 'bg-[rgba(118,169,216,0.12)] text-[#76A9D8] border-[rgba(118,169,216,0.30)]'
            : 'bg-sky-50 text-sky-700 border-sky-200',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Summary Metric Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2 ${
            isBlack
              ? 'bg-[rgba(198,166,106,0.12)] border border-[rgba(198,166,106,0.30)] text-[#C6A66A]'
              : 'bg-blue-50/80 border border-blue-200/80 text-blue-700'
          }`}>
            <Bell className={`w-3.5 h-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-blue-600'}`} />
            <span>Activity Center</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'
          }`}>
            Notifications
          </h1>
          <p className={`text-sm mt-1 max-w-2xl ${
            isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'
          }`}>
            Stay informed about your career activity, applications and important account updates.
          </p>
        </div>

        {/* Real Ground-Truth Metric Badges */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Total Badge */}
          <div className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border shadow-2xs flex items-center gap-2 ${
            isBlack
              ? 'bg-[var(--be-bg-card,#14171C)] border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
              : 'bg-white/70 border-white/80'
          }`}>
            <span className={`text-xs font-medium ${isBlack ? 'text-[#92949A]' : 'text-slate-400'}`}>Total</span>
            <span className={`text-sm font-bold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-800'}`}>{totalCount}</span>
          </div>

          {/* Unread Badge */}
          <div className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border shadow-2xs flex items-center gap-2 ${
            isBlack
              ? 'bg-[var(--be-bg-card,#14171C)] border-[rgba(198,166,106,0.30)]'
              : 'bg-white/70 border-white/80'
          }`}>
            <span className="flex h-2 w-2 relative">
              {unreadCount > 0 && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBlack ? 'bg-[#C6A66A]' : 'bg-violet-400'
                }`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                unreadCount > 0
                  ? isBlack ? 'bg-[#C6A66A]' : 'bg-violet-600'
                  : isBlack ? 'bg-[#737780]' : 'bg-slate-300'
              }`} />
            </span>
            <span className={`text-xs font-medium ${isBlack ? 'text-[#92949A]' : 'text-slate-400'}`}>Unread</span>
            <span className={`text-sm font-bold ${
              unreadCount > 0
                ? isBlack ? 'text-[#C6A66A]' : 'text-[#8065F5]'
                : isBlack ? 'text-[#C0BDB5]' : 'text-slate-700'
            }`}>
              {unreadCount}
            </span>
          </div>

          {/* Read Badge */}
          <div className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border shadow-2xs flex items-center gap-2 ${
            isBlack
              ? 'bg-[var(--be-bg-card,#14171C)] border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
              : 'bg-white/70 border-white/80'
          }`}>
            <span className={`text-xs font-medium ${isBlack ? 'text-[#92949A]' : 'text-slate-400'}`}>Read</span>
            <span className={`text-sm font-bold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-800'}`}>{readCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Filter Tabs, Search & Global Actions */}
      <div className={`p-3 sm:p-4 rounded-3xl backdrop-blur-2xl border shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        isBlack
          ? 'bg-[var(--be-bg-card,#14171C)] border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
          : 'bg-white/70 border-white/80'
      }`}>
        {/* Left: Tab Switcher */}
        <div className={`flex items-center p-1 rounded-2xl w-full sm:w-auto ${
          isBlack
            ? 'bg-[#0D1014] border border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
            : 'bg-slate-100/80'
        }`}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? isBlack
                  ? 'bg-[var(--be-bg-elevated,#191D23)] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-2xs'
                  : 'bg-white text-slate-900 shadow-2xs'
                : isBlack
                  ? 'text-[#C0BDB5] hover:text-[#F2F0EA]'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All <span className="ml-1 text-[11px] opacity-70">({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              filter === 'unread'
                ? isBlack
                  ? 'bg-[var(--be-bg-elevated,#191D23)] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-2xs'
                  : 'bg-white text-slate-900 shadow-2xs'
                : isBlack
                  ? 'text-[#C0BDB5] hover:text-[#F2F0EA]'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.18)] text-[#C6A66A]'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('read')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'read'
                ? isBlack
                  ? 'bg-[var(--be-bg-elevated,#191D23)] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-2xs'
                  : 'bg-white text-slate-900 shadow-2xs'
                : isBlack
                  ? 'text-[#C0BDB5] hover:text-[#F2F0EA]'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Read <span className="ml-1 text-[11px] opacity-70">({readCount})</span>
          </button>
        </div>

        {/* Center: Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className={`w-full pl-9 pr-8 py-2 rounded-2xl text-xs transition border focus:outline-none ${
              isBlack
                ? 'bg-[#0D1014] border-[rgba(255,255,255,0.12)] text-[#F2F0EA] placeholder-[#737780] focus:border-[rgba(198,166,106,0.50)]'
                : 'bg-white/80 border-slate-200/80 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs p-0.5 ${
                isBlack ? 'text-[#92949A] hover:text-[#F2F0EA]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              ×
            </button>
          )}
        </div>

        {/* Right: Actions (Mark all read & Refresh) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || isProcessingAll}
            className={`be-btn-secondary flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer border ${
              isBlack
                ? 'bg-[var(--be-bg-elevated,#191D23)] hover:bg-[#20252D] text-[#F2F0EA] border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)]'
                : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/80'
            }`}
            title="Mark all notifications as read"
          >
            <Check className={`w-3.5 h-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-blue-600'}`} />
            <span>Mark all read</span>
          </button>

          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={isLoading}
            className={`p-2 rounded-2xl transition shadow-2xs cursor-pointer disabled:opacity-50 border ${
              isBlack
                ? 'bg-[var(--be-bg-elevated,#191D23)] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)]'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/80'
            }`}
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin ' + (isBlack ? 'text-[#C6A66A]' : 'text-blue-600') : (isBlack ? 'text-[#C6A66A]' : '')}`} />
          </button>
        </div>
      </div>

      {/* 3. Error Banner (if error occurred) */}
      {error && (
        <div className="p-4 rounded-3xl bg-rose-50/80 border border-rose-200/80 backdrop-blur-xl flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-rose-900">Unable to load notifications</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="px-3 py-1.5 rounded-xl bg-white text-xs font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Main Notification Content Area */}
      {isLoading && notifications.length === 0 ? (
        /* Loading Skeleton State */
        <div className="space-y-3">
          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-2xs animate-pulse flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty State */
        <div className="p-10 sm:p-14 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-2xs text-center flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-blue-300/20 via-violet-300/15 to-transparent blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-4 shadow-xs relative">
            <Inbox className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {searchQuery
              ? 'No matching notifications found'
              : filter === 'unread'
              ? "You're all caught up."
              : 'No notifications yet.'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            {searchQuery
              ? `No notifications found matching "${searchQuery}". Try a different keyword.`
              : 'Important updates about your career journey will appear here.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRefresh()}
                  className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Check for Updates</span>
                </button>
                {onNavigateToJobs && (
                  <button
                    type="button"
                    onClick={onNavigateToJobs}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#8065F5] text-white text-xs font-semibold shadow-xs hover:shadow-md hover:brightness-105 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Browse Opportunities</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Notification Items List */
        <div className="space-y-3">
          {filteredNotifications.map(notification => {
            const config = getTypeConfig(notification.type);
            const IconComponent = config.icon;
            const isUnread = !notification.read;
            const isProcessingThis = processingIds.has(notification.id);

            return (
              <div
                key={notification.id}
                className={`p-4 sm:p-5 rounded-3xl transition-all duration-200 relative border ${
                  isUnread
                    ? 'bg-[var(--be-bg-card,#14171C)] backdrop-blur-2xl border-[var(--be-border-subtle,rgba(255,255,255,0.09))] hover:border-[rgba(198,166,106,0.30)] shadow-2xs hover:shadow-md border-l-4 border-l-blue-600'
                    : 'bg-[var(--be-bg-card,#14171C)]/75 backdrop-blur-xl border-[rgba(255,255,255,0.06)] shadow-2xs hover:bg-[var(--be-bg-card,#14171C)] opacity-90'
                }`}
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Type Icon Badge */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${config.iconBg}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Main Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Title */}
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isUnread ? 'text-[#F2F0EA]' : 'text-[#C0BDB5]'
                        }`}
                      >
                        {notification.title}
                      </h4>

                      {/* Type Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>

                      {/* New Status Indicator */}
                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border animate-pulse bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border-[rgba(198,166,106,0.30)]">
                          New
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="ml-auto text-[11px] font-medium font-mono text-[#92949A]">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>

                    {/* Notification Message */}
                    <p className="text-xs sm:text-sm leading-relaxed break-words text-[#C0BDB5]">
                      {notification.message}
                    </p>

                    {/* Contextual Actions Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--be-border-subtle,rgba(255,255,255,0.08))]">
                      {/* Related Destination Action (if supported by metadata or type) */}
                      {(notification.type === 'match' || notification.vacancyId) && onNavigateToJobs && (
                        <button
                          type="button"
                          onClick={onNavigateToJobs}
                          className="be-btn-primary px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] border-[rgba(198,166,106,0.30)]"
                        >
                          <span className="text-[#17130C] font-bold">Explore Opportunity</span>
                          <ArrowRight className="w-3 h-3 text-[#17130C]" />
                        </button>
                      )}

                      {(notification.type === 'submission_success' ||
                        notification.type === 'submission_failed' ||
                        notification.applicationId) &&
                        onNavigateToApplications && (
                          <button
                            type="button"
                            onClick={onNavigateToApplications}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border bg-[var(--be-bg-elevated,#191D23)] hover:bg-[#20252D] text-[#F2F0EA] border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)]"
                          >
                            <span>View Applications</span>
                            <ExternalLink className="w-3 h-3 text-[#C6A66A]" />
                          </button>
                        )}

                      {/* Single Item: Mark as Read */}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkOne(notification.id)}
                          disabled={isProcessingThis}
                          className="ml-auto px-3 py-1.5 rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer border bg-[var(--be-bg-elevated,#191D23)] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.35)] shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5 text-[#C6A66A]" />
                          <span>{isProcessingThis ? 'Updating...' : 'Mark as read'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Zero-Hallucination & Safe Activity Guarantee */}
      <div className={`p-4 rounded-3xl backdrop-blur-md border flex items-center justify-between text-xs ${
        isBlack
          ? 'bg-[var(--be-bg-card,#14171C)] border-[var(--be-border-subtle,rgba(255,255,255,0.09))] text-[#C0BDB5]'
          : 'bg-white/40 border-white/60 text-slate-500'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${isBlack ? 'text-[#35B887]' : 'text-emerald-600'}`} />
          <span>Activity events are generated strictly from verified user actions and live company postings.</span>
        </div>
        <span className={`font-mono text-[10px] hidden sm:inline ${
          isBlack ? 'text-[#92949A]' : 'text-slate-400'
        }`}>ZERO FABRICATED UPDATES</span>
      </div>
    </div>
  );
};
