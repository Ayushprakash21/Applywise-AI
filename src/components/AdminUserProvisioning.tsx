// src/components/AdminUserProvisioning.tsx
// Production User Provisioning & Membership Validity Management for ApplyVise AI Admin Console

import React, { useState, useEffect, useId } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  Sparkles,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  X,
  Copy,
  Check,
  ArrowUpRight,
  History,
  Lock,
  PauseCircle,
  PlayCircle,
  Trash2,
  ExternalLink,
  Award,
  Zap,
  Info
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import {
  MembershipPlanId,
  MembershipValidityType,
  MembershipStatus,
  MembershipSummaryMetrics,
  MembershipGrant,
  MembershipHistoryItem
} from '../types/index.ts';
import { addCalendarMonthsUTC, calculateMembershipExpiry } from '../utils/membershipDates.ts';

interface AdminUserProvisioningProps {
  currentUser: AuthUser;
}

export const AdminUserProvisioning: React.FC<AdminUserProvisioningProps> = ({ currentUser }) => {
  // State: Metrics
  const [metrics, setMetrics] = useState<MembershipSummaryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // State: Management Table Items
  const [items, setItems] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingItems, setLoadingItems] = useState(true);

  // State: Filters
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedValidity, setSelectedValidity] = useState<string>('all');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [lifetimeOnly, setLifetimeOnly] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionUser, setActionUser] = useState<any | null>(null);
  const [activeModalAction, setActiveModalAction] = useState<'modify' | 'extend' | 'status' | null>(null);
  const [historyUser, setHistoryUser] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<{ grants: any[]; auditLogs: MembershipHistoryItem[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Provision Form State
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState<MembershipPlanId>('black');
  const [formValidity, setFormValidity] = useState<MembershipValidityType>('12_months');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);
  const [provisionResult, setProvisionResult] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modify / Extend Form State
  const [modifyPlan, setModifyPlan] = useState<MembershipPlanId>('black');
  const [modifyValidity, setModifyValidity] = useState<MembershipValidityType>('12_months');
  const [modifyNotes, setModifyNotes] = useState('');
  const [confirmOverridePaid, setConfirmOverridePaid] = useState(false);
  const [extendValidity, setExtendValidity] = useState<MembershipValidityType>('12_months');
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'revoked'>('suspended');
  const [statusNotes, setStatusNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Dynamic Accessible IDs for Screen Readers
  const searchInputId = useId();
  const planFilterId = useId();
  const statusFilterId = useId();
  const validityFilterId = useId();

  // Load Metrics
  const loadMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await api.getAdminMembershipSummary();
      if (res.success) {
        setMetrics(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load membership metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Load Table Items
  const loadItems = async (targetPage: number = page) => {
    try {
      setLoadingItems(true);
      const res = await api.getAdminMemberships({
        search: search.trim() || undefined,
        plan: selectedPlan !== 'all' ? selectedPlan : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        validityType: selectedValidity !== 'all' ? selectedValidity : undefined,
        lifetimeOnly: lifetimeOnly || undefined,
        expiringWithin30Days: expiringOnly || undefined,
        page: targetPage,
        limit: 15,
      });
      if (res.success) {
        setItems(res.items);
        setTotalItems(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load membership inventory.');
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    loadItems(1);
  }, [selectedPlan, selectedStatus, selectedValidity, expiringOnly, lifetimeOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadItems(1);
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Live Date Calculations for Form Preview
  const getPreviewDates = (validity: MembershipValidityType) => {
    const now = new Date();
    const activationFormatted = now.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
    const expiryIso = calculateMembershipExpiry(now, validity);
    let expiryFormatted = 'Never (Lifetime Access)';
    if (expiryIso) {
      expiryFormatted = new Date(expiryIso).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    return { activationFormatted, expiryFormatted };
  };

  const previewDates = getPreviewDates(formValidity);

  // Handle Add/Invite User Submit
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingProvision(true);
      setErrorMsg(null);
      const res = await api.provisionAdminUser({
        fullName: formFullName,
        email: formEmail,
        plan: formPlan,
        validity: formValidity,
        notes: formNotes,
      });

      if (res.success) {
        setProvisionResult(res);
        showNotification(res.message);
        loadMetrics();
        loadItems(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to provision user membership.');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  const resetProvisionForm = () => {
    setFormFullName('');
    setFormEmail('');
    setFormPlan('black');
    setFormValidity('12_months');
    setFormNotes('');
    setProvisionResult(null);
    setShowAddModal(false);
  };

  // Open User History
  const handleViewHistory = async (user: any) => {
    setHistoryUser(user);
    setLoadingHistory(true);
    setHistoryData(null);
    try {
      const res = await api.getAdminMembershipHistory(user.userId);
      if (res.success) {
        setHistoryData({
          grants: res.grants,
          auditLogs: res.auditLogs,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user membership history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Action: Modify Plan Submit
  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionUser) return;
    try {
      setIsSubmittingAction(true);
      setErrorMsg(null);
      const res = await api.assignAdminMembership(actionUser.userId, {
        plan: modifyPlan,
        validity: modifyValidity,
        notes: modifyNotes,
        confirmOverridePaid,
      });
      if (res.success) {
        showNotification(res.message);
        setActiveModalAction(null);
        setActionUser(null);
        loadMetrics();
        loadItems(page);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to modify membership.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Extend Submit
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionUser || !actionUser.grantId) return;
    try {
      setIsSubmittingAction(true);
      setErrorMsg(null);
      const res = await api.extendAdminMembership(actionUser.grantId, {
        validity: extendValidity,
        notes: modifyNotes,
      });
      if (res.success) {
        showNotification(res.message);
        setActiveModalAction(null);
        setActionUser(null);
        loadMetrics();
        loadItems(page);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extend membership.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Status Update Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionUser || !actionUser.grantId) return;
    try {
      setIsSubmittingAction(true);
      setErrorMsg(null);
      const res = await api.updateAdminMembershipStatus(actionUser.grantId, {
        status: targetStatus,
        notes: statusNotes,
      });
      if (res.success) {
        showNotification(res.message);
        setActiveModalAction(null);
        setActionUser(null);
        loadMetrics();
        loadItems(page);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update membership status.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helpers for Badges
  const renderPlanBadge = (plan: MembershipPlanId) => {
    switch (plan) {
      case 'black':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-[#C6A66A]/10 text-[#C6A66A] border border-[#C6A66A]/30">
            <Crown className="w-3 h-3 text-[#C6A66A]" />
            BLACK ELITE
          </span>
        );
      case 'pro':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-blue-950/40 text-blue-300 border border-blue-500/30">
            <Zap className="w-3 h-3 text-blue-400" />
            PRO
          </span>
        );
      case 'free':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
            FREE
          </span>
        );
    }
  };

  const renderStatusBadge = (status: MembershipStatus, remainingDays: number | null) => {
    switch (status) {
      case 'lifetime':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#C6A66A]/15 text-[#E2C58A] border border-[#C6A66A]/40">
            <Crown className="w-3 h-3" />
            Lifetime
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Expiring Soon ({remainingDays}d)
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/40 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <PauseCircle className="w-3 h-3" />
            Suspended
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/30 text-rose-300 border border-rose-800/40">
            <X className="w-3 h-3" />
            Revoked
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/30 text-blue-300 border border-blue-800/40">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#C6A66A]/10 border border-[#C6A66A]/30">
              <Award className="w-5 h-5 text-[#C6A66A]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#F2F0EA]">
              User Provisioning & Membership Validity
            </h1>
          </div>
          <p className="text-xs text-[#92949A] mt-1">
            Create or invite candidates, assign official membership tiers, specify validity periods, and govern lifecycle access.
          </p>
        </div>

        <button
          onClick={() => {
            resetProvisionForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] font-bold text-xs shadow-lg shadow-[#C6A66A]/10 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#17130C]" />
          <span>+ Add New User</span>
        </button>
      </div>

      {/* KPI Summary Cards (8 Database-Driven Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Registered', value: metrics?.totalRegisteredUsers ?? '—', icon: Users, color: 'text-slate-300' },
          { label: 'Free Users', value: metrics?.freeUsers ?? '—', icon: Shield, color: 'text-slate-400' },
          { label: 'Pro Members', value: metrics?.proMembers ?? '—', icon: Zap, color: 'text-blue-400' },
          { label: 'BLACK ELITE', value: metrics?.blackEliteMembers ?? '—', icon: Crown, color: 'text-[#C6A66A]' },
          { label: 'Active Grants', value: metrics?.activeMemberships ?? '—', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Lifetime', value: metrics?.lifetimeMembers ?? '—', icon: Crown, color: 'text-[#E2C58A]' },
          { label: 'Expiring in 30d', value: metrics?.expiringWithin30Days ?? '—', icon: Clock, color: 'text-amber-400' },
          { label: 'Expired', value: metrics?.expiredMemberships ?? '—', icon: AlertTriangle, color: 'text-red-400' },
        ].map((card, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-[#14171C] border border-white/[0.08] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#92949A] mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider">{card.label}</span>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <div className="text-xl font-bold text-[#F2F0EA]">
              {loadingMetrics ? <span className="animate-pulse">···</span> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Controls: Search, Filters, Quick Toggles */}
      <div className="p-4 rounded-2xl bg-[#14171C] border border-white/[0.08] space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-[#92949A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={searchInputId}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate by full name or email address..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]/60 focus:outline-none"
            />
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#92949A]">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Plan Filter */}
            <select
              id={planFilterId}
              aria-label="Filter candidates by plan"
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]/60"
            >
              <option value="all">All Plans</option>
              <option value="black">BLACK ELITE</option>
              <option value="pro">Pro</option>
              <option value="free">Free</option>
            </select>

            {/* Status Filter */}
            <select
              id={statusFilterId}
              aria-label="Filter candidates by membership status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]/60"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="lifetime">Lifetime</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>

            {/* Validity Filter */}
            <select
              id={validityFilterId}
              aria-label="Filter candidates by membership validity period"
              value={selectedValidity}
              onChange={e => setSelectedValidity(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]/60"
            >
              <option value="all">All Validities</option>
              <option value="6_months">6 Months</option>
              <option value="12_months">12 Months</option>
              <option value="24_months">24 Months</option>
              <option value="lifetime">Lifetime</option>
            </select>

            {/* Quick Toggle: Expiring in 30 Days */}
            <button
              onClick={() => setExpiringOnly(!expiringOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                expiringOnly
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                  : 'bg-[#0D1014] border-white/[0.09] text-[#92949A] hover:text-[#F2F0EA]'
              }`}
            >
              Expiring in 30 Days
            </button>

            {/* Quick Toggle: Lifetime */}
            <button
              onClick={() => setLifetimeOnly(!lifetimeOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                lifetimeOnly
                  ? 'bg-[#C6A66A]/20 border-[#C6A66A]/60 text-[#E2C58A]'
                  : 'bg-[#0D1014] border-white/[0.09] text-[#92949A] hover:text-[#F2F0EA]'
              }`}
            >
              Lifetime Only
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                loadMetrics();
                loadItems(page);
              }}
              aria-label="Refresh membership list"
              className="p-2 rounded-lg bg-[#0D1014] border border-white/[0.09] text-[#92949A] hover:text-[#F2F0EA] transition"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingItems ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Membership Management Table */}
      <div className="rounded-2xl bg-[#14171C] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1014] text-[#92949A] uppercase tracking-wider text-[10px] font-semibold border-b border-white/[0.08]">
              <tr>
                <th className="py-3.5 px-4">User Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Activation Date</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Remaining Validity</th>
                <th className="py-3.5 px-4">Provisioned By</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-[#C0BDB5]">
              {loadingItems ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#92949A]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#C6A66A]" />
                      <span>Loading candidate membership records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#92949A]">
                    No membership records found matching current query or filters.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.userId} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-semibold text-[#F2F0EA]">
                      {item.userName || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#C0BDB5]">
                      {item.userEmail}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderPlanBadge(item.currentPlan)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(item.membershipStatus, item.remainingDays)}
                    </td>
                    <td className="py-3.5 px-4 text-[#92949A]">
                      {item.activationDate ? new Date(item.activationDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#92949A]">
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : (item.membershipStatus === 'lifetime' || item.validityType === 'lifetime' ? 'Lifetime' : '—')}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#F2F0EA]">
                      {item.remainingValidity}
                    </td>
                    <td className="py-3.5 px-4 text-[#92949A] text-[11px]">
                      {item.provisionedBy}
                    </td>
                    <td className="py-3.5 px-4 text-[#92949A] text-[11px]">
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Change / Reassign Plan */}
                        <button
                          onClick={() => {
                            setActionUser(item);
                            setModifyPlan(item.currentPlan === 'black' ? 'black' : item.currentPlan === 'pro' ? 'pro' : 'black');
                            setModifyValidity('12_months');
                            setModifyNotes('');
                            setConfirmOverridePaid(false);
                            setActiveModalAction('modify');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#C6A66A]/20 hover:text-[#E2C58A] border border-white/[0.08] text-[11px] font-medium text-[#C0BDB5] transition cursor-pointer"
                        >
                          Modify
                        </button>

                        {/* Extend Validity (if has active temporary grant) */}
                        {item.grantId && item.membershipStatus !== 'lifetime' && item.validityType !== 'lifetime' && (
                          <button
                            onClick={() => {
                              setActionUser(item);
                              setExtendValidity('12_months');
                              setModifyNotes('');
                              setActiveModalAction('extend');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-emerald-950/40 hover:text-emerald-300 border border-white/[0.08] text-[11px] font-medium text-[#C0BDB5] transition cursor-pointer"
                          >
                            Extend
                          </button>
                        )}

                        {/* Suspend / Reactivate (if has grant) */}
                        {item.grantId && (
                          <button
                            onClick={() => {
                              setActionUser(item);
                              setTargetStatus(item.membershipStatus === 'suspended' ? 'active' : 'suspended');
                              setStatusNotes('');
                              setActiveModalAction('status');
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                              item.membershipStatus === 'suspended'
                                ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                                : 'bg-white/[0.04] text-[#C0BDB5] border-white/[0.08] hover:bg-amber-950/40 hover:text-amber-300'
                            }`}
                          >
                            {item.membershipStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        )}

                        {/* History */}
                        <button
                          onClick={() => handleViewHistory(item)}
                          className="p-1 rounded-lg hover:bg-white/[0.06] text-[#92949A] hover:text-[#F2F0EA] transition"
                          title="View membership grant & audit history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#0D1014] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#92949A]">
          <span>
            Showing {items.length} of {totalItems} candidates
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadItems(page - 1)}
              disabled={page <= 1 || loadingItems}
              className="p-1.5 rounded-lg bg-[#14171C] border border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.05] text-[#F2F0EA]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#F2F0EA]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadItems(page + 1)}
              disabled={page >= totalPages || loadingItems}
              className="p-1.5 rounded-lg bg-[#14171C] border border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.05] text-[#F2F0EA]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: ADD / INVITE NEW USER WITH MEMBERSHIP                       */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div
            className="w-full max-w-xl bg-[#14171C] border border-[#C6A66A]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111318]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#C6A66A]/15 text-[#C6A66A] border border-[#C6A66A]/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F2F0EA]">
                    {provisionResult ? 'Provisioning Completed' : 'Add New User & Provision Membership'}
                  </h2>
                  <p className="text-xs text-[#92949A]">
                    {provisionResult ? 'Account successfully configured.' : 'Authoritative membership assignment with UTC calendar validity calculations.'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetProvisionForm}
                className="p-2 rounded-lg text-[#92949A] hover:text-[#F2F0EA] hover:bg-white/[0.05] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {provisionResult ? (
              <div className="p-6 space-y-5 text-xs text-[#C0BDB5]">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>User Account & Membership Ready</span>
                  </div>
                  <p className="text-xs text-emerald-200/90">{provisionResult.message}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#0D1014] border border-white/[0.08] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#92949A]">Candidate:</span>
                    <span className="font-semibold text-[#F2F0EA]">{provisionResult.user.fullName} ({provisionResult.user.email})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#92949A]">Tier:</span>
                    <span>{renderPlanBadge(provisionResult.grant.plan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#92949A]">Validity:</span>
                    <span className="font-semibold text-[#F2F0EA]">{provisionResult.grant.validityType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#92949A]">Expires:</span>
                    <span className="text-[#F2F0EA]">
                      {provisionResult.grant.expiresAt ? new Date(provisionResult.grant.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never (Lifetime)'}
                    </span>
                  </div>
                </div>

                {/* Secure Invitation Link (When email delivery unconfigured) */}
                {provisionResult.invitationUrl && (
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-blue-300 font-semibold">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span>Invitation & Password Setup Link</span>
                    </div>
                    <p className="text-[11px] text-blue-200/80">
                      Standard email provider is unconfigured in this environment. Provide the authorized invitation link directly to the candidate:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={window.location.origin + provisionResult.invitationUrl}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0B0D10] border border-blue-500/30 text-xs text-blue-200 font-mono select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + provisionResult.invitationUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={resetProvisionForm}
                    className="px-5 py-2.5 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] font-bold text-xs transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProvisionSubmit} className="p-6 space-y-5 text-xs">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#F2F0EA] block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={e => setFormFullName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]/60 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#F2F0EA] block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="e.g. candidate@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="font-semibold text-[#F2F0EA] block">Membership Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'black', title: 'BLACK ELITE', desc: 'Unrestricted AI, Executive Twin & Concierge', badgeColor: 'border-[#C6A66A]/40' },
                      { id: 'pro', title: 'Pro', desc: 'Advanced AI tailoring & interview simulations', badgeColor: 'border-blue-500/40' },
                      { id: 'free', title: 'Free', desc: 'Core discovery & factual resume extraction', badgeColor: 'border-slate-700' },
                    ].map(p => (
                      <div
                        key={p.id}
                        onClick={() => setFormPlan(p.id as MembershipPlanId)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          formPlan === p.id
                            ? 'bg-[#C6A66A]/10 border-[#C6A66A] shadow-md shadow-[#C6A66A]/10'
                            : 'bg-[#0D1014] border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#F2F0EA]">{p.title}</span>
                          {formPlan === p.id && <Check className="w-3.5 h-3.5 text-[#C6A66A]" />}
                        </div>
                        <p className="text-[10px] text-[#92949A]">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validity Selection */}
                <div className="space-y-2">
                  <label className="font-semibold text-[#F2F0EA] block">Membership Validity</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { id: '6_months', label: '6 Months' },
                      { id: '12_months', label: '12 Months' },
                      { id: '24_months', label: '24 Months' },
                      { id: 'lifetime', label: 'Lifetime' },
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setFormValidity(v.id as MembershipValidityType)}
                        className={`py-2 px-3 rounded-xl border text-center font-semibold text-xs transition cursor-pointer ${
                          formValidity === v.id
                            ? 'bg-[#C6A66A] text-[#17130C] border-[#C6A66A]'
                            : 'bg-[#0D1014] text-[#C0BDB5] border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Pre-Confirmation Summary Card */}
                <div className="p-4 rounded-xl bg-[#0D1014] border border-[#C6A66A]/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#C6A66A]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Live Pre-Confirmation Summary (Backend UTC Calculations)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-[#C0BDB5]">
                    <div>
                      <span className="text-[#92949A] block">Candidate:</span>
                      <span className="font-medium text-[#F2F0EA]">{formEmail || 'candidate@example.com'}</span>
                    </div>
                    <div>
                      <span className="text-[#92949A] block">Selected Tier:</span>
                      <span className="font-bold text-[#E2C58A]">{formPlan.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[#92949A] block">Activation Date:</span>
                      <span className="text-[#F2F0EA]">{previewDates.activationFormatted}</span>
                    </div>
                    <div>
                      <span className="text-[#92949A] block">Calculated Expiry Date:</span>
                      <span className="font-semibold text-[#F2F0EA]">{previewDates.expiryFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Admin Notes */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#F2F0EA] block">Administrator Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Enter context, e.g. Executive VIP grant, institutional sponsor, or onboarding exception..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]/60 focus:outline-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetProvisionForm}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#C0BDB5] font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProvision}
                    className="px-5 py-2.5 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] font-bold text-xs shadow-lg shadow-[#C6A66A]/10 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingProvision ? 'Provisioning...' : 'Confirm & Provision User'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: MODIFY MEMBERSHIP PLAN (UPGRADE / DOWNGRADE)                */}
      {/* ==================================================================== */}
      {activeModalAction === 'modify' && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#14171C] border border-[#C6A66A]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111318]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#C6A66A]/15 text-[#C6A66A] border border-[#C6A66A]/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F2F0EA]">Modify Membership Plan</h2>
                  <p className="text-xs text-[#92949A]">{actionUser.userName} ({actionUser.userEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAction(null)}
                className="p-2 text-[#92949A] hover:text-[#F2F0EA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModifySubmit} className="p-6 space-y-4 text-xs">
              {/* Existing Paid Subscription Warning */}
              {actionUser.hasPaidSubscription && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Active Paid Subscription Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    This user currently holds an active payment-backed subscription. Applying an administrative grant will manage their effective tier.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold pt-1">
                    <input
                      type="checkbox"
                      checked={confirmOverridePaid}
                      onChange={e => setConfirmOverridePaid(e.target.checked)}
                      className="rounded bg-[#0D1014] border-amber-500/50 text-[#C6A66A] focus:ring-0"
                    />
                    <span>I confirm overriding their active paid subscription</span>
                  </label>
                </div>
              )}

              {/* Before vs After Plan Comparison */}
              <div className="p-4 rounded-xl bg-[#0D1014] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#92949A] uppercase tracking-wider block">Current Tier</span>
                  <div className="mt-1">{renderPlanBadge(actionUser.currentPlan)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#92949A]" />
                <div>
                  <span className="text-[10px] text-[#92949A] uppercase tracking-wider block">New Target Tier</span>
                  <div className="mt-1">{renderPlanBadge(modifyPlan)}</div>
                </div>
              </div>

              {/* Plan Choice */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Target Plan</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['black', 'pro', 'free'] as MembershipPlanId[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setModifyPlan(p)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        modifyPlan === p
                          ? 'bg-[#C6A66A] text-[#17130C] border-[#C6A66A]'
                          : 'bg-[#0D1014] text-[#C0BDB5] border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validity Choice */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Validity Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['6_months', '12_months', '24_months', 'lifetime'] as MembershipValidityType[]).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setModifyValidity(v)}
                      className={`py-2 px-2.5 rounded-xl border text-center font-semibold text-[11px] transition cursor-pointer ${
                        modifyValidity === v
                          ? 'bg-[#C6A66A] text-[#17130C] border-[#C6A66A]'
                          : 'bg-[#0D1014] text-[#C0BDB5] border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                    >
                      {v.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Reason / Audit Justification</label>
                <input
                  type="text"
                  required
                  value={modifyNotes}
                  onChange={e => setModifyNotes(e.target.value)}
                  placeholder="e.g. VIP upgrade request, customer support adjustment..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:border-[#C6A66A]/60 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalAction(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-[#C0BDB5] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || (actionUser.hasPaidSubscription && !confirmOverridePaid)}
                  className="px-5 py-2 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] font-bold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  {isSubmittingAction ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EXTEND MEMBERSHIP VALIDITY                                  */}
      {/* ==================================================================== */}
      {activeModalAction === 'extend' && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#14171C] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111318]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F2F0EA]">Extend Membership Validity</h2>
                  <p className="text-xs text-[#92949A]">{actionUser.userName} ({actionUser.userEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAction(null)}
                className="p-2 text-[#92949A] hover:text-[#F2F0EA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0D1014] border border-white/[0.08] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#92949A]">Current Expiry:</span>
                  <span className="font-semibold text-[#F2F0EA]">
                    {actionUser.expiryDate ? new Date(actionUser.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Expired / None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#92949A]">Current Plan:</span>
                  <span>{renderPlanBadge(actionUser.currentPlan)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Add Additional Validity</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '6_months', label: '+ 6 Months' },
                    { id: '12_months', label: '+ 12 Months' },
                    { id: '24_months', label: '+ 24 Months' },
                    { id: 'lifetime', label: 'Make Lifetime' },
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setExtendValidity(v.id as MembershipValidityType)}
                      className={`py-2 px-2.5 rounded-xl border text-center font-semibold text-[11px] transition cursor-pointer ${
                        extendValidity === v.id
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#0D1014] text-[#C0BDB5] border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Extension Reason</label>
                <input
                  type="text"
                  required
                  value={modifyNotes}
                  onChange={e => setModifyNotes(e.target.value)}
                  placeholder="e.g. Loyalty extension, courtesy renewal..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:border-emerald-500/60 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalAction(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-[#C0BDB5] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAction ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: SUSPEND / REACTIVATE STATUS                                 */}
      {/* ==================================================================== */}
      {activeModalAction === 'status' && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#14171C] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111318]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${targetStatus === 'active' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-amber-950/40 text-amber-400'}`}>
                  {targetStatus === 'active' ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#F2F0EA]">
                    {targetStatus === 'active' ? 'Reactivate Membership' : 'Suspend Membership'}
                  </h2>
                  <p className="text-xs text-[#92949A]">{actionUser.userName} ({actionUser.userEmail})</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAction(null)}
                className="p-2 text-[#92949A] hover:text-[#F2F0EA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-xs text-[#C0BDB5] leading-relaxed">
                {targetStatus === 'active'
                  ? 'Reactivating this membership will restore the candidate\'s premium privileges and original expiration date.'
                  : 'Suspending this membership will temporarily downgrade the candidate\'s active privileges to Free tier without deleting their data, resume history, or profile.'}
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#F2F0EA] block">Reason / Audit Justification</label>
                <input
                  type="text"
                  required
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="e.g. Temporary leave, billing audit, candidate request..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0D1014] border border-white/[0.09] text-xs text-[#F2F0EA] focus:border-[#C6A66A]/60 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalAction(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-[#C0BDB5] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`px-5 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                    targetStatus === 'active'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-black'
                  }`}
                >
                  {isSubmittingAction ? 'Updating...' : targetStatus === 'active' ? 'Confirm Reactivation' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DRAWER: USER MEMBERSHIP GRANT & AUDIT HISTORY                        */}
      {/* ==================================================================== */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md h-full bg-[#111318] border-l border-white/[0.08] shadow-2xl flex flex-col p-6 space-y-6 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#C6A66A]" />
                <div>
                  <h3 className="font-bold text-sm text-[#F2F0EA]">Membership Audit Trail</h3>
                  <p className="text-xs text-[#92949A]">{historyUser.userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryUser(null)}
                className="p-1.5 rounded-lg text-[#92949A] hover:text-[#F2F0EA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-[#92949A]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#C6A66A] mb-2" />
                <span>Loading audit trail...</span>
              </div>
            ) : !historyData || (historyData.grants.length === 0 && historyData.auditLogs.length === 0) ? (
              <div className="py-12 text-center text-[#92949A] text-xs">
                No administrative events recorded for this candidate yet.
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Active & Historical Grants */}
                <div>
                  <h4 className="font-semibold text-xs text-[#F2F0EA] mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#C6A66A]" />
                    <span>Grant Records ({historyData.grants.length})</span>
                  </h4>
                  <div className="space-y-2.5">
                    {historyData.grants.map((g, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#14171C] border border-white/[0.08] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#F2F0EA]">{g.plan.toUpperCase()}</span>
                          <span className="text-[10px] text-[#92949A]">{g.status.toUpperCase()}</span>
                        </div>
                        <div className="text-[11px] text-[#92949A]">
                          Validity: <span className="text-[#C0BDB5]">{g.validity_type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[11px] text-[#92949A]">
                          Expires: <span className="text-[#C0BDB5]">{g.expires_at ? new Date(g.expires_at).toLocaleDateString('en-US') : 'Lifetime'}</span>
                        </div>
                        {g.reason && (
                          <div className="text-[10px] text-[#737780] italic">
                            "{g.reason}"
                          </div>
                        )}
                        <div className="text-[10px] text-[#737780]">
                          Granted on {new Date(g.created_at).toLocaleString('en-US')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Logs */}
                <div>
                  <h4 className="font-semibold text-xs text-[#F2F0EA] mb-3 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Security & Lifecycle Events ({historyData.auditLogs.length})</span>
                  </h4>
                  <div className="space-y-2.5">
                    {historyData.auditLogs.map((log, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#0D1014] border border-white/[0.06] space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] text-blue-300">
                          <span>{log.action}</span>
                          <span className="text-[#737780]">{new Date(log.timestamp).toLocaleDateString('en-US')}</span>
                        </div>
                        <p className="text-[11px] text-[#C0BDB5]">
                          Actor: <span className="text-[#F2F0EA]">{log.actor}</span>
                        </p>
                        {log.details?.reason && (
                          <p className="text-[10px] text-[#92949A] italic">
                            Reason: {log.details.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
