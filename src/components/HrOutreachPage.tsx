// src/components/HrOutreachPage.tsx
// ApplyVise AI — AI HR Outreach & Direct Application Automation Module
// Connects directly to GCDE, Verification Pipeline, Gemini Email Studio, Resume Attachment Engine, and OAuth Mailboxes.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Users,
  Briefcase,
  Sparkles,
  FolderKanban,
  Send,
  Inbox,
  KeyRound,
  Settings,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Archive,
  Ban,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import {
  CareerPreferences,
  ContactDiscoveryRun,
  DoNotContactEntry,
  EmailAccountSummary,
  HrContactWithRelevance,
  HrDiscoverySourceMeta,
  JobVacancy,
  OutreachCampaign,
  OutreachCampaignContact,
  OutreachEvent,
  OutreachMessage,
  OutreachOverviewMetrics,
  ResumeAttachmentOption,
  UserProfile,
} from '../types/index.ts';
import { HrOutreachStudio } from './hr-outreach/HrOutreachStudio.tsx';
import {
  ContactDetailDrawer,
  CreateCampaignModal,
  MessageAuditModal,
  VerificationBadge,
} from './hr-outreach/HrOutreachModals.tsx';

export type HrOutreachSubTab =
  | 'overview'
  | 'contacts'
  | 'opportunities'
  | 'studio'
  | 'campaigns'
  | 'sent'
  | 'replies'
  | 'accounts'
  | 'settings';

export interface HrOutreachPageProps {
  user: AuthUser;
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  vacancies: JobVacancy[];
  plan: 'free' | 'pro' | 'black';
  onOpenPricing: () => void;
  onShowToast: (msg: string) => void;
}

const SUB_TABS: Array<{ id: HrOutreachSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: Mail },
  { id: 'contacts', label: 'HR Contacts', icon: Users },
  { id: 'opportunities', label: 'Job Opportunities', icon: Briefcase },
  { id: 'studio', label: 'AI Email Studio', icon: Sparkles },
  { id: 'campaigns', label: 'Outreach Campaigns', icon: FolderKanban },
  { id: 'sent', label: 'Sent Emails', icon: Send },
  { id: 'replies', label: 'Replies & Follow-ups', icon: Inbox },
  { id: 'accounts', label: 'Email Accounts', icon: KeyRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const HrOutreachPage: React.FC<HrOutreachPageProps> = ({
  vacancies,
  plan,
  onOpenPricing,
  onShowToast,
}) => {
  const isBlack = plan === 'black';
  const [activeSubTab, setActiveSubTab] = useState<HrOutreachSubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Backend state
  const [overview, setOverview] = useState<OutreachOverviewMetrics | null>(null);
  const [recentRuns, setRecentRuns] = useState<ContactDiscoveryRun[]>([]);
  const [contacts, setContacts] = useState<HrContactWithRelevance[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [sources, setSources] = useState<HrDiscoverySourceMeta[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountSummary[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState<{ gmail: boolean; outlook: boolean }>({ gmail: false, outlook: false });
  const [resumes, setResumes] = useState<ResumeAttachmentOption[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [replies, setReplies] = useState<OutreachMessage[]>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [doNotContactList, setDoNotContactList] = useState<DoNotContactEntry[]>([]);

  // Discovery controls
  const [discoverCompany, setDiscoverCompany] = useState('');
  const [discoverWebsite, setDiscoverWebsite] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [lastDiscoveryNotice, setLastDiscoveryNotice] = useState<string | null>(null);

  // Contacts Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'relevance'>('relevance');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Studio Selection State
  const [studioContactId, setStudioContactId] = useState('');
  const [studioJobId, setStudioJobId] = useState('');
  const [prefilledSubject, setPrefilledSubject] = useState<string | undefined>(undefined);
  const [prefilledBody, setPrefilledBody] = useState<string | undefined>(undefined);

  // Modals & Drawers
  const [detailContact, setDetailContact] = useState<HrContactWithRelevance | null>(null);
  const [auditModalMessage, setAuditModalMessage] = useState<OutreachMessage | null>(null);
  const [auditModalEvents, setAuditModalEvents] = useState<OutreachEvent[]>([]);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [activeCampaignDetail, setActiveCampaignDetail] = useState<{
    campaign: OutreachCampaign;
    contacts: OutreachCampaignContact[];
  } | null>(null);

  // DNC & Sent Filter
  const [sentStatusFilter, setSentStatusFilter] = useState('all');
  const [dncEmailInput, setDncEmailInput] = useState('');
  const [dncReasonInput, setDncReasonInput] = useState('');
  const [syncingReplies, setSyncingReplies] = useState(false);

  const loadContacts = useCallback(async () => {
    const res = await api.getHrContacts({
      search: searchQuery || undefined,
      country: countryFilter !== 'all' ? countryFilter : undefined,
      designation: designationFilter !== 'all' ? designationFilter : undefined,
      verificationStatus: verificationFilter !== 'all' ? verificationFilter : undefined,
      sourceType: sourceFilter !== 'all' ? sourceFilter : undefined,
      jobId: studioJobId || undefined,
      sortBy,
      limit: pageSize,
      offset: page * pageSize,
    });
    setContacts(res.contacts);
    setContactsTotal(res.total);
  }, [searchQuery, countryFilter, designationFilter, verificationFilter, sourceFilter, studioJobId, sortBy, page]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ovRes, srcRes, accRes, resRes, msgRes, repRes, campRes, dncRes] = await Promise.all([
        api.getHrOutreachOverview(),
        api.getHrDiscoverySources(),
        api.getHrEmailAccounts(),
        api.getHrOutreachResumes(),
        api.getOutreachMessages(sentStatusFilter),
        api.getOutreachReplies(false),
        api.getOutreachCampaigns(),
        api.getDoNotContactList(),
      ]);

      setOverview(ovRes.overview);
      setRecentRuns(ovRes.recentRuns);
      setSources(srcRes.sources);
      setEmailAccounts(accRes.accounts);
      setOauthConfigured(accRes.oauthConfigured);
      setResumes(resRes.resumes);
      setMessages(msgRes.messages);
      setReplies(repRes.items);
      setCampaigns(campRes.campaigns);
      setDoNotContactList(dncRes.entries);
      await loadContacts();
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load AI HR Outreach module.');
    } finally {
      setLoading(false);
    }
  }, [loadContacts, sentStatusFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('oauth_connected');
    const oauthErr = params.get('oauth_error');
    if (connected) {
      onShowToast(`Connected ${connected.toUpperCase()} mailbox via OAuth 2.0.`);
      setActiveSubTab('accounts');
    } else if (oauthErr) {
      onShowToast(`OAuth connection notice: ${oauthErr}`);
      setActiveSubTab('accounts');
    }
  }, [onShowToast]);

  const handleRunDiscovery = async (override?: { companyName?: string; companyWebsite?: string; jobId?: string }) => {
    setDiscovering(true);
    setLastDiscoveryNotice(null);
    try {
      const res = await api.discoverHrContacts({
        companyName: override?.companyName ?? (discoverCompany.trim() || undefined),
        companyWebsite: override?.companyWebsite ?? (discoverWebsite.trim() || undefined),
        jobId: override?.jobId,
        forceRefresh: true,
      });
      await loadAll();
      if (res.discoveredContacts.length > 0) {
        onShowToast(`Discovered ${res.discoveredContacts.length} public HR contact(s).`);
        setLastDiscoveryNotice(null);
      } else {
        setLastDiscoveryNotice(
          res.unavailableReason || 'No publicly published HR email was found on the checked employer pages.'
        );
        onShowToast('Discovery completed — no public HR emails exposed by inspected sources.');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleOpenContactDetail = async (id: string) => {
    try {
      const res = await api.getHrContactDetail(id, studioJobId || undefined);
      setDetailContact(res.contact);
    } catch (err: any) {
      onShowToast(err.message || 'Could not load contact details.');
    }
  };

  const handleVerifyContact = async (id: string) => {
    try {
      const res = await api.verifyHrContact(id);
      await loadContacts();
      if (detailContact?.id === id) {
        await handleOpenContactDetail(id);
      }
      onShowToast(`Verification complete: ${res.verification?.status || 'Updated'}`);
    } catch (err: any) {
      onShowToast(err.message || 'Verification failed.');
    }
  };

  const handleOpenStudioWithContact = (contact: HrContactWithRelevance, jobId?: string) => {
    setStudioContactId(contact.id);
    if (jobId || contact.associatedJobIds[0]) {
      setStudioJobId(jobId || contact.associatedJobIds[0]);
    }
    setPrefilledSubject(undefined);
    setPrefilledBody(undefined);
    setActiveSubTab('studio');
  };

  const handleConnectOAuth = async (provider: 'gmail' | 'outlook') => {
    try {
      const res =
        provider === 'gmail'
          ? await api.connectGoogleEmailAccount()
          : await api.connectMicrosoftEmailAccount();
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      onShowToast(err.message || `${provider} OAuth is not configured on this server yet.`);
    }
  };

  const handleAddSelectedToCampaign = async (campaignId: string) => {
    if (!campaignId || selectedContactIds.length === 0) return;
    try {
      const res = await api.addContactsToOutreachCampaign(campaignId, selectedContactIds, studioJobId || undefined);
      setSelectedContactIds([]);
      await loadAll();
      onShowToast(`Added ${res.added} contact(s) to campaign.`);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to add contacts to campaign.');
    }
  };

  const cardSurface = isBlack ? 'bg-[#13161B] border-white/10 text-[#F2F0EA]' : 'bg-white border-slate-200 text-slate-900';
  const mutedText = isBlack ? 'text-[#92949A]' : 'text-slate-500';
  const countries = Array.from(new Set(contacts.map((c) => c.country).filter(Boolean)));
  const totalPages = Math.max(1, Math.ceil(contactsTotal / pageSize));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardSurface}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isBlack ? 'bg-[#C6A66A]/15 text-[#C6A66A]' : 'bg-blue-50 text-blue-600'}`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">AI HR Outreach & Direct Apply</h1>
              <p className={`text-xs sm:text-sm ${mutedText}`}>
                Discover verified public recruitment contacts from GCDE employers, generate resume-grounded emails, and send directly via Gmail or Outlook after explicit approval.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
              isBlack ? 'border-white/15 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleRunDiscovery()}
            disabled={discovering}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isBlack ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B]' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{discovering ? 'Scanning GCDE...' : 'Discover HR Contacts'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation (Responsive Scroll + Wrap) */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                active
                  ? isBlack
                    ? 'bg-[#C6A66A] text-[#08090B] border-transparent font-bold'
                    : 'bg-blue-600 text-white border-transparent shadow-xs'
                  : isBlack
                  ? 'bg-[#13161B] text-[#B7B4AD] border-white/10 hover:border-[#C6A66A]/40'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'replies' && replies.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white">{replies.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button onClick={loadAll} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* 1. OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Entitlement / OAuth Readiness Notice */}
          {overview && !overview.entitlement.canSendOutreach && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isBlack ? 'bg-[#171B22] border-[#C6A66A]/40' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="text-xs space-y-0.5">
                <p className="font-bold">Free Plan Preview Mode</p>
                <p className="opacity-80">
                  You can explore discovered public HR contacts and verification evidence. Upgrade to Pro or BLACK ELITE to unlock Gemini AI Email Studio and direct Gmail/Outlook outreach.
                </p>
              </div>
              <button
                onClick={onOpenPricing}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                  isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                }`}
              >
                Upgrade Plan
              </button>
            </div>
          )}

          {/* Database-backed KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'HR Contacts Discovered', value: overview?.contactsDiscovered ?? 0 },
              { label: 'Verified / Domain Valid', value: (overview?.verifiedContacts ?? 0) + (overview?.domainValidContacts ?? 0) },
              { label: 'Jobs with HR Contacts', value: overview?.jobsWithContacts ?? 0 },
              { label: 'Emails Drafted', value: overview?.emailsDrafted ?? 0 },
              { label: 'Emails Sent', value: overview?.emailsSent ?? 0 },
              { label: 'Provider Accepted', value: overview?.providerAcceptedCount ?? 0 },
              { label: 'Delivered Confirmed', value: overview?.deliveredCount ?? 0 },
              { label: 'Replies Received', value: overview?.repliesReceived ?? 0 },
              { label: 'Follow-ups Due', value: overview?.followUpsDue ?? 0 },
              { label: 'Connected Mailboxes', value: overview?.connectedAccountsCount ?? 0 },
            ].map((kpi) => (
              <div key={kpi.label} className={`p-4 rounded-2xl border ${cardSurface}`}>
                <span className={`text-[11px] font-medium block ${mutedText}`}>{kpi.label}</span>
                <span className="text-2xl font-extrabold mt-1 block">{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* Targeted Company / Official Career Page Discovery */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardSurface}`}>
            <div>
              <h3 className="text-sm font-bold">Discover HR Contacts via GCDE & Official Career Pages</h3>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                Scans cached GCDE postings and public HTTPS career pages while respecting SSRF checks, robots/rate limits, and anti-scraping boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                value={discoverCompany}
                onChange={(e) => setDiscoverCompany(e.target.value)}
                placeholder="Company Name (optional, e.g. Cloudflare)"
                className={`px-3.5 py-2.5 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                }`}
              />
              <input
                value={discoverWebsite}
                onChange={(e) => setDiscoverWebsite(e.target.value)}
                placeholder="Official Careers URL (optional, https://...)"
                className={`px-3.5 py-2.5 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                }`}
              />
              <button
                onClick={() => handleRunDiscovery()}
                disabled={discovering}
                className={`px-4 py-2.5 rounded-xl font-bold cursor-pointer disabled:opacity-50 ${
                  isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                }`}
              >
                {discovering ? 'Discovering & Verifying...' : 'Run Discovery Scan'}
              </button>
            </div>

            {lastDiscoveryNotice && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isBlack ? 'bg-[#0C0E12] border-white/10 text-[#B7B4AD]' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{lastDiscoveryNotice}</span>
              </div>
            )}
          </div>

          {/* Discovery Run History */}
          <div className={`p-6 rounded-2xl border space-y-3 ${cardSurface}`}>
            <h3 className="text-sm font-bold">Recent Background Discovery Runs</h3>
            {recentRuns.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>No discovery runs recorded yet. Click "Run Discovery Scan" above to scan GCDE sources.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className={`border-b border-current/10 ${mutedText}`}>
                      <th className="py-2 pr-3">Target</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Sources</th>
                      <th className="py-2 pr-3">Contacts</th>
                      <th className="py-2 pr-3">MX Checked</th>
                      <th className="py-2">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-current/5">
                    {recentRuns.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-3 font-medium">{r.companyName || r.jobId || 'GCDE Batch'}</td>
                        <td className="py-2 pr-3 uppercase font-mono text-[11px]">{r.status}</td>
                        <td className="py-2 pr-3">{r.sourcesScanned}</td>
                        <td className="py-2 pr-3 font-semibold">{r.contactsDiscovered}</td>
                        <td className="py-2 pr-3">{r.contactsVerified}</td>
                        <td className={`py-2 ${mutedText}`}>{new Date(r.startedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HR CONTACTS TAB */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs ${cardSurface}`}>
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 opacity-50" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search company, name, email, role..."
                className={`w-full pl-8 pr-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                }`}
              />
            </div>

            <select
              aria-label="Filter by Country"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(0);
              }}
              className={`px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
              }`}
            >
              <option value="all">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              aria-label="Filter by Verification"
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(0);
              }}
              className={`px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
              }`}
            >
              <option value="all">All Verification</option>
              {['Verified', 'Domain Valid', 'Role-Based', 'Discovered', 'Unverified', 'Stale', 'Verification Failed', 'Invalid'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              aria-label="Filter by Designation"
              value={designationFilter}
              onChange={(e) => {
                setDesignationFilter(e.target.value);
                setPage(0);
              }}
              className={`px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
              }`}
            >
              <option value="all">All Designations</option>
              {[
                'Talent Acquisition Specialist',
                'HR Recruiter',
                'Technical Recruiter',
                'Recruitment Manager',
                'Senior HR Manager',
                'Head of Talent Acquisition',
                'Recruitment Coordinator',
                'Hiring Manager',
                'General Recruitment Contact',
                'Careers Department',
              ].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              aria-label="Sort Contacts"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'confidence')}
              className={`px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
              }`}
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="confidence">Sort: Confidence</option>
            </select>
          </div>

          {/* Bulk Campaign Selection Bar */}
          {selectedContactIds.length > 0 && (
            <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${cardSurface}`}>
              <span className="font-semibold">{selectedContactIds.length} contact(s) selected</span>
              <div className="flex items-center gap-2">
                {campaigns.length > 0 && (
                  <select
                    aria-label="Add to Campaign"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAddSelectedToCampaign(e.target.value);
                      e.target.value = '';
                    }}
                    className={`px-3 py-1.5 rounded-lg border ${
                      isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="">+ Add Selected to Campaign...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setSelectedContactIds([])}
                  className="px-2.5 py-1.5 rounded-lg border border-current/15 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
            {contacts.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Users className="w-8 h-8 mx-auto opacity-40" />
                <h3 className="text-sm font-bold">No Public HR Contacts Discovered Yet</h3>
                <p className={`text-xs max-w-md mx-auto ${mutedText}`}>
                  ApplyVise never fabricates recruiter email addresses. Run a GCDE discovery scan to index publicly listed employer recruitment contacts.
                </p>
                <button
                  onClick={() => handleRunDiscovery()}
                  disabled={discovering}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                  }`}
                >
                  Scan GCDE Sources
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className={`border-b border-current/10 ${mutedText}`}>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                          onChange={(e) =>
                            setSelectedContactIds(e.target.checked ? contacts.map((c) => c.id) : [])
                          }
                        />
                      </th>
                      <th className="p-3">Contact Name</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Country</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Related Job</th>
                      <th className="p-3">Relevance</th>
                      <th className="p-3">Last Contacted</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-current/5">
                    {contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-500/5">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(c.id)}
                            onChange={(e) =>
                              setSelectedContactIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                              )
                            }
                          />
                        </td>
                        <td className="p-3 font-semibold">{c.contactName || '—'}</td>
                        <td className="p-3">{c.designation}</td>
                        <td className="p-3 font-medium">{c.companyName}</td>
                        <td className="p-3">{c.country}</td>
                        <td className="p-3 font-mono text-[11px]">
                          {c.email}
                          {c.isDoNotContact && <span className="ml-1.5 text-[10px] text-rose-500 font-sans font-bold">[OPT-OUT]</span>}
                        </td>
                        <td className="p-3"><VerificationBadge status={c.emailVerificationStatus} /></td>
                        <td className="p-3 max-w-[160px] truncate">{c.relatedJobTitle || 'General'}</td>
                        <td className="p-3 font-bold text-[#C6A66A]">{c.relevance?.overallScore ?? '—'}/100</td>
                        <td className={`p-3 ${mutedText}`}>{c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString() : 'Never'}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              title="View Details & Provenance"
                              onClick={() => handleOpenContactDetail(c.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Verify Email"
                              onClick={() => handleVerifyContact(c.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Generate AI Email"
                              onClick={() => handleOpenStudioWithContact(c)}
                              disabled={c.isDoNotContact || c.emailVerificationStatus === 'Invalid'}
                              className="p-1.5 rounded-lg hover:bg-slate-500/15 text-[#C6A66A] disabled:opacity-30 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Public Source"
                              className="p-1.5 rounded-lg hover:bg-slate-500/15"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              title="Mark Contacted"
                              onClick={async () => {
                                await api.updateHrContactStatus(c.id, 'active', true);
                                await loadContacts();
                                onShowToast('Marked contact as contacted.');
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Archive Contact"
                              onClick={async () => {
                                await api.updateHrContactStatus(c.id, 'archived');
                                await loadContacts();
                                onShowToast('Contact archived.');
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-500/15 opacity-70 cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-current/10 flex items-center justify-between text-xs">
                <span className={mutedText}>
                  Page {page + 1} of {totalPages} ({contactsTotal} total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded-lg border border-current/15 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-current/15 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. JOB OPPORTUNITIES TAB */}
      {activeSubTab === 'opportunities' && (
        <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
          <div className="p-5 border-b border-current/10">
            <h3 className="text-sm font-bold">GCDE Job Opportunities Linked to HR Contacts</h3>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Job match scores remain strictly independent from HR contact relevance scores.
            </p>
          </div>
          {vacancies.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-70">
              No GCDE jobs loaded yet. Visit Opportunity Radar to sync active employers.
            </div>
          ) : (
            <div className="divide-y divide-current/10">
              {vacancies.slice(0, 30).map((job) => {
                const matchingContacts = contacts.filter(
                  (c) =>
                    c.associatedJobIds.includes(job.id) ||
                    c.companyName.toLowerCase() === job.company.toLowerCase()
                );
                return (
                  <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm">{job.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border border-current/15 ${mutedText}`}>
                          {job.company} · {job.country || job.location}
                        </span>
                        {job.matchEvaluation && (
                          <span className="text-[11px] font-semibold text-emerald-500">
                            Job Match: {job.matchEvaluation.matchScore}%
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${mutedText}`}>
                        {matchingContacts.length > 0
                          ? `${matchingContacts.length} public HR contact(s) matched for ${job.company}`
                          : 'No direct HR contact cached for this role yet.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRunDiscovery({ companyName: job.company, jobId: job.id })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                          isBlack ? 'border-white/15 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Find HR Contact
                      </button>
                      {matchingContacts.length > 0 && (
                        <button
                          onClick={() => handleOpenStudioWithContact(matchingContacts[0], job.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                            isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                          }`}
                        >
                          Draft AI Email
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. AI EMAIL STUDIO TAB */}
      {activeSubTab === 'studio' && (
        <HrOutreachStudio
          isBlack={isBlack}
          contacts={contacts}
          jobs={vacancies}
          emailAccounts={emailAccounts}
          resumes={resumes}
          campaigns={campaigns}
          canSendOutreach={overview?.entitlement.canSendOutreach ?? plan !== 'free'}
          oauthConfigured={oauthConfigured}
          selectedContactId={studioContactId}
          selectedJobId={studioJobId}
          onSelectContactId={setStudioContactId}
          onSelectJobId={setStudioJobId}
          onOpenPricing={onOpenPricing}
          onGoToAccounts={() => setActiveSubTab('accounts')}
          onMessageSavedOrSent={loadAll}
          onShowToast={onShowToast}
          prefilledSubject={prefilledSubject}
          prefilledBody={prefilledBody}
        />
      )}

      {/* 5. OUTREACH CAMPAIGNS TAB */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Outreach Campaigns</h3>
              <p className={`text-xs ${mutedText}`}>Organize target regions, roles, and individually approved applications.</p>
            </div>
            <button
              onClick={() => setCreateCampaignOpen(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className={`p-10 rounded-2xl border text-center space-y-2 ${cardSurface}`}>
              <FolderKanban className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-bold">No Outreach Campaigns Created</p>
              <p className={`text-xs ${mutedText}`}>Create a campaign to organize regional roles (e.g. Germany Supply Chain Applications).</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div key={camp.id} className={`p-5 rounded-2xl border space-y-3 ${cardSurface}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm">{camp.name}</h4>
                      <p className={`text-xs ${mutedText}`}>
                        {camp.targetCountry || 'Global'} · Cap: {camp.dailyLimit}/day
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border border-current/15">
                      {camp.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-slate-500/10">
                      <span className="block font-bold">{camp.contactsCount || 0}</span>
                      <span className="text-[10px] opacity-70">Contacts</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-500/10">
                      <span className="block font-bold">{camp.draftsCount || 0}</span>
                      <span className="text-[10px] opacity-70">Drafts</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-500/10">
                      <span className="block font-bold">{camp.sentCount || 0}</span>
                      <span className="text-[10px] opacity-70">Sent</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-500/10">
                      <span className="block font-bold">{camp.repliesCount || 0}</span>
                      <span className="text-[10px] opacity-70">Replies</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await api.getOutreachCampaignDetail(camp.id);
                      setActiveCampaignDetail({ campaign: res.campaign, contacts: res.contacts });
                    }}
                    className="text-xs font-semibold text-[#C6A66A] hover:underline cursor-pointer"
                  >
                    Manage Campaign Contacts →
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeCampaignDetail && (
            <div className={`p-5 rounded-2xl border space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">{activeCampaignDetail.campaign.name} — Queued Contacts</h4>
                <button
                  onClick={() => setActiveCampaignDetail(null)}
                  className="text-xs underline cursor-pointer"
                >
                  Close
                </button>
              </div>
              {activeCampaignDetail.contacts.length === 0 ? (
                <p className={`text-xs ${mutedText}`}>No contacts added yet. Select contacts in the HR Contacts tab and add them here.</p>
              ) : (
                <div className="divide-y divide-current/10 text-xs">
                  {activeCampaignDetail.contacts.map((cc) => (
                    <div key={cc.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold">{cc.contact?.contactName || cc.contact?.designation}</span>{' '}
                        <span className={mutedText}>({cc.contact?.email} · {cc.contact?.companyName})</span>
                      </div>
                      {cc.contact && (
                        <button
                          onClick={() => handleOpenStudioWithContact(cc.contact!, cc.jobId)}
                          className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                            isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                          }`}
                        >
                          Review & Draft
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. SENT EMAILS TAB */}
      {activeSubTab === 'sent' && (
        <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
          <div className="p-4 border-b border-current/10 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Outreach Messages & Provider Delivery Audit</h3>
            <select
              aria-label="Filter Sent Status"
              value={sentStatusFilter}
              onChange={(e) => setSentStatusFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
              }`}
            >
              <option value="all">All Statuses</option>
              {['draft', 'approved', 'provider_accepted', 'delivered', 'bounced', 'failed', 'replied', 'follow_up_due'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-70">No outreach drafts or sent emails recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className={`border-b border-current/10 ${mutedText}`}>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Attachment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Provider Message ID</th>
                    <th className="p-3 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5">
                  {messages.map((m) => (
                    <tr key={m.id}>
                      <td className="p-3 font-mono text-[11px]">{m.recipientEmail}</td>
                      <td className="p-3">{m.companyName}</td>
                      <td className="p-3 max-w-[220px] truncate font-medium">{m.subject}</td>
                      <td className="p-3">{m.resumeFileName || '—'}</td>
                      <td className="p-3 uppercase font-mono text-[11px] font-bold">{m.status}</td>
                      <td className="p-3 font-mono text-[10px] max-w-[140px] truncate">{m.providerMessageId || '—'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            const detail = await api.getOutreachMessageDetail(m.id);
                            setAuditModalMessage(detail.message);
                            setAuditModalEvents(detail.events);
                          }}
                          className="text-[#C6A66A] hover:underline font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. REPLIES & FOLLOW-UPS TAB */}
      {activeSubTab === 'replies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Outreach Inbox, Replies & Follow-up Suggestions</h3>
              <p className={`text-xs ${mutedText}`}>
                Replies are matched using provider Thread IDs from connected mailboxes. AI never auto-replies.
              </p>
            </div>
            <button
              onClick={async () => {
                setSyncingReplies(true);
                try {
                  const res = await api.getOutreachReplies(true);
                  setReplies(res.items);
                  onShowToast('Synced thread replies from connected mailboxes.');
                } finally {
                  setSyncingReplies(false);
                }
              }}
              disabled={syncingReplies}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                isBlack ? 'border-white/15 hover:bg-white/5' : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingReplies ? 'animate-spin' : ''}`} />
              <span>{syncingReplies ? 'Syncing...' : 'Sync Replies'}</span>
            </button>
          </div>

          {replies.length === 0 ? (
            <div className={`p-10 rounded-2xl border text-center text-xs ${cardSurface}`}>
              <Inbox className="w-8 h-8 mx-auto opacity-40 mb-2" />
              No replies or pending follow-ups due yet.
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((item) => (
                <div key={item.id} className={`p-5 rounded-2xl border space-y-3 text-xs ${cardSurface}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm">{item.subject}</span>
                      <p className={mutedText}>
                        {item.recipientEmail} · {item.companyName} · Status: <strong className="uppercase">{item.status}</strong>
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await api.addDoNotContactEntry(item.recipientEmail, 'Opt-out from Outreach Inbox');
                        await loadAll();
                        onShowToast(`Added ${item.recipientEmail} to Do-Not-Contact list.`);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" /> Opt-Out
                    </button>
                  </div>

                  {item.replySummary && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <strong>Incoming Reply Summary:</strong> {item.replySummary}
                    </div>
                  )}

                  {item.suggestedReply && (
                    <div className="space-y-2">
                      <span className="font-semibold block opacity-80">Suggested Follow-up (Requires your review & approval):</span>
                      <pre className={`p-3 rounded-xl border font-sans whitespace-pre-wrap ${isBlack ? 'bg-[#0C0E12] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        {item.suggestedReply}
                      </pre>
                      <button
                        onClick={() => {
                          setStudioContactId(item.contactId);
                          if (item.jobId) setStudioJobId(item.jobId);
                          setPrefilledSubject(`Re: ${item.subject}`);
                          setPrefilledBody(item.suggestedReply);
                          setActiveSubTab('studio');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer ${
                          isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                        }`}
                      >
                        Review & Edit in Studio
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. EMAIL ACCOUNTS TAB (OAuth 2.0) */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-6 rounded-2xl border space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Gmail (Google OAuth 2.0)</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${oauthConfigured.gmail ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                  {oauthConfigured.gmail ? 'OAuth Ready' : 'Credentials Needed'}
                </span>
              </div>
              <p className={`text-xs ${mutedText}`}>
                Uses least-privilege scopes (`gmail.send`, `gmail.readonly`, `userinfo.email`). Tokens are AES-256-GCM encrypted server-side; passwords are never requested.
              </p>
              <button
                onClick={() => handleConnectOAuth('gmail')}
                disabled={!oauthConfigured.gmail}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 ${
                  isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                }`}
              >
                {oauthConfigured.gmail ? 'Connect Gmail via Google OAuth' : 'Configure GOOGLE_OAUTH_CLIENT_ID on Server'}
              </button>
            </div>

            <div className={`p-6 rounded-2xl border space-y-3 ${cardSurface}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Microsoft Outlook (Microsoft Graph OAuth 2.0)</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${oauthConfigured.outlook ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                  {oauthConfigured.outlook ? 'OAuth Ready' : 'Credentials Needed'}
                </span>
              </div>
              <p className={`text-xs ${mutedText}`}>
                Uses least-privilege Graph scopes (`Mail.Send`, `Mail.Read`, `User.Read`, `offline_access`). Supports Outlook.com and Microsoft 365 accounts.
              </p>
              <button
                onClick={() => handleConnectOAuth('outlook')}
                disabled={!oauthConfigured.outlook}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 ${
                  isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                }`}
              >
                {oauthConfigured.outlook ? 'Connect Outlook via Microsoft OAuth' : 'Configure MICROSOFT_CLIENT_ID on Server'}
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 ${cardSurface}`}>
            <h3 className="text-sm font-bold">Connected Email Accounts</h3>
            {emailAccounts.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>No mailboxes connected yet.</p>
            ) : (
              <div className="divide-y divide-current/10 text-xs">
                {emailAccounts.map((acc) => (
                  <div key={acc.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-bold uppercase mr-2">{acc.provider}</span>
                      <span className="font-mono">{acc.email}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        acc.status === 'connected' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                    {acc.status === 'connected' && (
                      <button
                        onClick={async () => {
                          await api.disconnectEmailAccount(acc.id);
                          await loadAll();
                          onShowToast(`Disconnected ${acc.email} and purged tokens.`);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        Disconnect & Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. SETTINGS & COMPLIANCE TAB */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Do Not Contact Manager */}
          <div className={`p-6 rounded-2xl border space-y-4 ${cardSurface}`}>
            <div>
              <h3 className="text-sm font-bold">Do-Not-Contact Suppression List</h3>
              <p className={`text-xs ${mutedText}`}>
                Emails listed here are strictly blocked from receiving any outreach drafts or messages.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 text-xs">
              <input
                value={dncEmailInput}
                onChange={(e) => setDncEmailInput(e.target.value)}
                placeholder="recruiter@company.com"
                className={`flex-1 px-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                }`}
              />
              <input
                value={dncReasonInput}
                onChange={(e) => setDncReasonInput(e.target.value)}
                placeholder="Reason (e.g. Opt-out requested)"
                className={`flex-1 px-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300'
                }`}
              />
              <button
                onClick={async () => {
                  if (!dncEmailInput.includes('@')) return;
                  await api.addDoNotContactEntry(dncEmailInput, dncReasonInput || undefined);
                  setDncEmailInput('');
                  setDncReasonInput('');
                  await loadAll();
                  onShowToast('Added to Do-Not-Contact suppression list.');
                }}
                className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                  isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
                }`}
              >
                Add Suppression
              </button>
            </div>

            {doNotContactList.length > 0 && (
              <div className="divide-y divide-current/10 text-xs">
                {doNotContactList.map((entry) => (
                  <div key={entry.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold">{entry.email}</span>
                      <span className={`ml-2 ${mutedText}`}>— {entry.reason}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await api.removeDoNotContactEntry(entry.id);
                        await loadAll();
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discovery Sources Registry */}
          <div className={`p-6 rounded-2xl border space-y-3 ${cardSurface}`}>
            <h3 className="text-sm font-bold">HR Contact Discovery Source Registry & Compliance Boundaries</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className={`border-b border-current/10 ${mutedText}`}>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Access Mode</th>
                    <th className="py-2 pr-3">Public Emails Exposed</th>
                    <th className="py-2">Notes & Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5">
                  {sources.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3 font-semibold">{s.name}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">{s.permissionMode}</td>
                      <td className="py-2.5 pr-3">{String(s.exposesPublicEmails)}</td>
                      <td className={`py-2.5 ${mutedText}`}>{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Drawers & Modals */}
      <ContactDetailDrawer
        contact={detailContact}
        isBlack={isBlack}
        onClose={() => setDetailContact(null)}
        onVerify={handleVerifyContact}
        onGenerateEmail={(c) => handleOpenStudioWithContact(c)}
        onSuppress={async (email) => {
          await api.addDoNotContactEntry(email, 'Suppressed from Contact Drawer');
          await loadAll();
          setDetailContact(null);
          onShowToast(`${email} added to Do-Not-Contact.`);
        }}
      />

      <MessageAuditModal
        message={auditModalMessage}
        events={auditModalEvents}
        isBlack={isBlack}
        onClose={() => setAuditModalMessage(null)}
      />

      <CreateCampaignModal
        open={createCampaignOpen}
        isBlack={isBlack}
        onClose={() => setCreateCampaignOpen(false)}
        onCreate={async (payload) => {
          await api.createOutreachCampaign(payload);
          await loadAll();
          onShowToast(`Campaign "${payload.name}" created.`);
        }}
      />
    </div>
  );
};
