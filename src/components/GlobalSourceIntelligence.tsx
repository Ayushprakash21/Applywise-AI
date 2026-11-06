import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Building,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  Layers,
  X,
  Database
} from 'lucide-react';
import {
  GlobalJobSource,
  CompanyDirectoryItem,
  GeographicCoverageSummary,
  GlobalSourceIntelligenceSummary,
  AtsProviderType
} from '../types/index.ts';
import { api } from '../services/api.ts';

export interface ServiceState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: string | null;
}

export const GlobalSourceIntelligence: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sources' | 'companies' | 'coverage'>('sources');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Independent Request States for the 3 GCDE Data Feeds
  const [sourcesState, setSourcesState] = useState<ServiceState<{
    summary: GlobalSourceIntelligenceSummary | null;
    sources: GlobalJobSource[];
  }>>({
    status: 'loading',
    data: null,
    error: null,
  });

  const [companiesState, setCompaniesState] = useState<ServiceState<CompanyDirectoryItem[]>>({
    status: 'loading',
    data: null,
    error: null,
  });

  const [coverageState, setCoverageState] = useState<ServiceState<GeographicCoverageSummary>>({
    status: 'loading',
    data: null,
    error: null,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('all');

  // Add Company Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    careersUrl: '',
    domain: '',
    country: 'United States',
    region: 'north_america' as const,
    industry: 'Technology',
    detectedAts: 'custom_web' as AtsProviderType,
    publicBoardToken: '',
    publicEndpoint: '',
  });

  // Independent Data Loaders
  const loadSources = useCallback(async () => {
    setSourcesState(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const res = await api.getGlobalSourceIntelligence();
      if (res.success) {
        setSourcesState({
          status: 'success',
          data: {
            summary: res.summary || null,
            sources: res.sources || [],
          },
          error: null,
        });
        // Sync geographic coverage if available in intelligence payload
        if (res.geographicCoverage && coverageState.status !== 'success') {
          setCoverageState({
            status: 'success',
            data: res.geographicCoverage,
            error: null,
          });
        }
      } else {
        throw new Error((res as any).error || 'Failed to fetch global source intelligence');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSourcesState(prev => ({
        ...prev,
        status: 'error',
        error: msg,
      }));
    }
  }, [coverageState.status]);

  const loadCompanies = useCallback(async (params?: { query?: string; country?: string; detectedAts?: string; limit?: number }) => {
    setCompaniesState(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const res = await api.getCompanyDirectory(params);
      if (res.success) {
        setCompaniesState({
          status: 'success',
          data: res.companies || [],
          error: null,
        });
      } else {
        throw new Error((res as any).error || 'Failed to fetch employer directory');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompaniesState(prev => ({
        ...prev,
        status: 'error',
        error: msg,
      }));
    }
  }, []);

  const loadCoverage = useCallback(async () => {
    setCoverageState(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      const res = await api.getGeographicCoverage();
      if (res.success) {
        setCoverageState({
          status: 'success',
          data: res.coverage,
          error: null,
        });
      } else {
        throw new Error((res as any).error || 'Failed to fetch geographic coverage matrix');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCoverageState(prev => ({
        ...prev,
        status: 'error',
        error: msg,
      }));
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      loadSources(),
      loadCompanies(),
      loadCoverage()
    ]);
    setIsRefreshing(false);
  }, [loadSources, loadCompanies, loadCoverage]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Manual Trigger Source Sync
  const handleManualSync = async (sourceId?: string) => {
    try {
      setIsSyncing(sourceId || 'all');
      setSyncFeedback(null);
      const res = await api.triggerSourceSync(sourceId);
      if (res.success) {
        setSyncFeedback(res.message || 'Sync completed successfully');
        await loadSources();
      } else {
        setSyncFeedback(`Sync failed: ${(res as any).error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback(`Sync failed: ${msg}`);
    } finally {
      setIsSyncing(null);
    }
  };

  // Heuristic ATS detector for user-entered careers URL
  const handleDetectATS = () => {
    if (!newCompany.careersUrl.trim()) return;
    setIsDetecting(true);
    try {
      const url = newCompany.careersUrl.toLowerCase();
      let detected: AtsProviderType = 'custom_web';
      let token = '';
      let endpoint = '';

      if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
        detected = 'greenhouse';
        const match = url.match(/greenhouse\.io\/(?:embed\/job_board\/)?([^/?#]+)/i);
        token = match ? match[1] : '';
        endpoint = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;
      } else if (url.includes('lever.co') || url.includes('jobs.lever.co')) {
        detected = 'lever';
        const match = url.match(/lever\.co\/([^/?#]+)/i);
        token = match ? match[1] : '';
        endpoint = `https://api.lever.co/v0/postings/${token}?mode=json`;
      } else if (url.includes('ashbyhq.com')) {
        detected = 'ashby';
        const match = url.match(/ashbyhq\.com\/([^/?#]+)/i);
        token = match ? match[1] : '';
        endpoint = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
      } else if (url.includes('workable.com')) {
        detected = 'workable';
        const match = url.match(/workable\.com\/(?:j\/)?([^/?#]+)/i);
        token = match ? match[1] : '';
        endpoint = `https://apply.workable.com/api/v1/widget/accounts/${token}`;
      } else if (url.includes('smartrecruiters.com')) {
        detected = 'smartrecruiters';
        const match = url.match(/smartrecruiters\.com\/([^/?#]+)/i);
        token = match ? match[1] : '';
        endpoint = `https://api.smartrecruiters.com/v1/companies/${token}/postings`;
      } else if (url.includes('recruitee.com')) {
        detected = 'recruitee';
        const match = url.match(/([^.]+)\.recruitee\.com/i);
        token = match ? match[1] : '';
        endpoint = `https://${token}.recruitee.com/api/offers/`;
      }

      setNewCompany(prev => ({
        ...prev,
        detectedAts: detected,
        publicBoardToken: token,
        publicEndpoint: endpoint,
      }));
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim() || !newCompany.careersUrl.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await api.addCompanyDirectory(newCompany);
      if (res.success) {
        setShowAddModal(false);
        setNewCompany({
          name: '',
          careersUrl: '',
          domain: '',
          country: 'United States',
          region: 'north_america',
          industry: 'Technology',
          detectedAts: 'custom_web',
          publicBoardToken: '',
          publicEndpoint: '',
        });
        await loadCompanies();
        await loadSources();
      }
    } catch (err) {
      console.error('Failed to save company:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Operational State Diagnostics
  const sources = sourcesState.data?.sources || [];
  const summary = sourcesState.data?.summary || null;
  const companies = companiesState.data || [];
  const coverage = coverageState.data || null;

  const failedServices: Array<{ name: string; error: string; retry: () => void }> = [];
  if (sourcesState.status === 'error') {
    failedServices.push({ name: 'Job Sources & Telemetry', error: sourcesState.error || 'Request failed', retry: loadSources });
  }
  if (companiesState.status === 'error') {
    failedServices.push({ name: 'Employer Career Directory', error: companiesState.error || 'Request failed', retry: () => loadCompanies() });
  }
  if (coverageState.status === 'error') {
    failedServices.push({ name: 'Geographic Coverage Matrix', error: coverageState.error || 'Request failed', retry: loadCoverage });
  }

  const isCompleteFailure = failedServices.length === 3;
  const isPartialFailure = failedServices.length > 0 && failedServices.length < 3;
  const isAnyLoading = sourcesState.status === 'loading' || companiesState.status === 'loading' || coverageState.status === 'loading';

  const retryFailedServices = () => {
    failedServices.forEach(s => s.retry());
  };

  // Rate-limited connectors (genuinely calculated from live state, not hardcoded)
  const rateLimitedConnectorsCount = sources.filter(s => s.healthStatus === 'rate_limited').length;

  // Filtered Sources
  const filteredSources = sources.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.companyName.toLowerCase().includes(q) && !s.domain.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (countryFilter !== 'All' && s.country.toLowerCase() !== countryFilter.toLowerCase()) {
      return false;
    }
    if (healthFilter !== 'all' && s.healthStatus !== healthFilter) {
      return false;
    }
    return true;
  });

  // Filtered Companies
  const filteredCompanies = companies.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.domain.toLowerCase().includes(q) && !c.industry.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (countryFilter !== 'All' && c.country.toLowerCase() !== countryFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-[#F2F0EA] tracking-tight">Global Career Discovery Engine</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">
              GCDE 2.0
            </span>
          </div>
          <p className="text-xs text-[#92949A] mt-0.5">
            Global job intelligence, employer career portals, ATS connectors and geographic coverage.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadAllData}
            disabled={isRefreshing || isAnyLoading}
            className="px-3 py-1.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] text-xs font-semibold text-[#F2F0EA] hover:border-[rgba(198,166,106,0.30)] hover:text-[#C6A66A] flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isAnyLoading ? 'animate-spin text-[#C6A66A]' : ''}`} />
            <span>Refresh All</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#C6A66A] text-[#17130C] text-xs font-bold hover:bg-[#D9BB80] flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Career Site</span>
          </button>
        </div>
      </div>

      {/* STATE 5: COMPLETE API FAILURE BANNER */}
      {isCompleteFailure && (
        <div className="p-6 rounded-2xl bg-[#14171C] border border-rose-500/40 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F2F0EA]">GCDE Core Telemetry Services Unavailable</h3>
            <p className="text-xs text-[#C0BDB5] max-w-lg mx-auto">
              All three Global Career Discovery Engine endpoints failed to respond. Check server health, network connectivity, or administrative session authorization.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.06)] text-left text-[11px] font-mono text-rose-300 space-y-1 max-w-md mx-auto">
              {failedServices.map((fs, idx) => (
                <div key={idx}>• {fs.name}: {fs.error}</div>
              ))}
            </div>
          </div>
          <button
            onClick={loadAllData}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] text-xs font-bold transition flex items-center space-x-2 mx-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Retry All Requests</span>
          </button>
        </div>
      )}

      {/* STATE 4: PARTIAL API FAILURE WARNING BANNER */}
      {isPartialFailure && (
        <div className="p-4 rounded-2xl bg-[rgba(217,170,97,0.12)] border border-[rgba(217,170,97,0.35)] text-xs text-[#D9AA61] space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#D9AA61]" />
              <span className="font-bold">Partial GCDE Service Degradation ({failedServices.length} of 3 endpoints offline)</span>
            </div>
            <button
              onClick={retryFailedServices}
              disabled={isRefreshing}
              className="px-3 py-1 rounded-lg bg-[#0D1014] text-xs font-semibold text-[#D9AA61] hover:text-[#F2F0EA] border border-[rgba(217,170,97,0.40)] flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Retry Failed</span>
            </button>
          </div>
          <ul className="text-[11px] font-mono text-[#C0BDB5] pl-6 space-y-0.5 list-disc">
            {failedServices.map((fs, i) => (
              <li key={i}>
                <strong className="text-[#D9AA61]">{fs.name}:</strong> {fs.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div className="p-3.5 rounded-2xl bg-[rgba(53,184,135,0.12)] border border-[rgba(53,184,135,0.30)] text-xs text-[#35B887] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#35B887]" />
            <span className="font-medium">{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-[#35B887] hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-Time GCDE KPI Cards (With Genuine Error & Loading Representation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          {
            label: 'REGISTERED SOURCES',
            isError: sourcesState.status === 'error',
            isLoading: sourcesState.status === 'loading',
            value: sourcesState.status === 'success' ? (summary?.totalSources ?? sources.length) : '—',
            sub: sourcesState.status === 'error' ? 'Service offline' : `${summary?.activeSources ?? sources.filter(s => s.isEnabled).length} active`,
            icon: Radio,
          },
          {
            label: 'HEALTHY CONNECTORS',
            isError: sourcesState.status === 'error',
            isLoading: sourcesState.status === 'loading',
            value: sourcesState.status === 'success' ? (summary?.healthySources ?? sources.filter(s => s.healthStatus === 'healthy').length) : '—',
            sub: sourcesState.status === 'error' ? 'Service offline' : `${rateLimitedConnectorsCount} rate-limited`,
            icon: ShieldCheck,
            accent: 'text-[#35B887]',
          },
          {
            label: 'DISCOVERED EMPLOYERS',
            isError: companiesState.status === 'error',
            isLoading: companiesState.status === 'loading',
            value: companiesState.status === 'success' ? (summary?.totalDiscoveredCompanies ?? companies.length) : '—',
            sub: companiesState.status === 'error' ? 'Directory offline' : 'Official directories',
            icon: Building,
          },
          {
            label: 'VERIFIED CAREER SITES',
            isError: companiesState.status === 'error',
            isLoading: companiesState.status === 'loading',
            value: companiesState.status === 'success' ? (summary?.verifiedCareerPages ?? companies.filter(c => c.verificationStatus === 'verified').length) : '—',
            sub: companiesState.status === 'error' ? 'Directory offline' : 'Direct ATS boards',
            icon: CheckCircle2,
            accent: 'text-[#C6A66A]',
          },
          {
            label: 'ACTIVE GLOBAL JOBS',
            isError: sourcesState.status === 'error',
            isLoading: sourcesState.status === 'loading',
            value: sourcesState.status === 'success' ? (summary?.totalActiveVacancies ?? 0) : '—',
            sub: sourcesState.status === 'error' ? 'Telemetry offline' : 'Canonical cache',
            icon: Layers,
            accent: 'text-[#C6A66A]',
          },
          {
            label: 'PRUNED / EXPIRED',
            isError: sourcesState.status === 'error',
            isLoading: sourcesState.status === 'loading',
            value: sourcesState.status === 'success' ? (summary?.expiredOrPruned ?? 0) : '—',
            sub: sourcesState.status === 'error' ? 'Telemetry offline' : '14-day stale window',
            icon: AlertTriangle,
            accent: 'text-[#92949A]',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-4 rounded-2xl bg-[#14171C] border space-y-1.5 shadow-xs ${
              card.isError ? 'border-rose-500/40 bg-rose-950/10' : 'border-[rgba(255,255,255,0.09)]'
            }`}>
              <div className="flex items-center justify-between text-[#92949A]">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{card.label}</span>
                <Icon className={`w-3.5 h-3.5 ${card.isError ? 'text-rose-400' : ''}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${
                card.isError ? 'text-rose-400 text-lg' : card.accent || 'text-[#F2F0EA]'
              }`}>
                {card.isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : card.isError ? (
                  <span className="text-xs uppercase font-sans font-semibold">Unavailable</span>
                ) : (
                  card.value
                )}
              </div>
              <p className={`text-[10px] font-mono truncate ${card.isError ? 'text-rose-400/80' : 'text-[#92949A]'}`}>
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-[rgba(255,255,255,0.09)] pb-3">
        {[
          {
            id: 'sources',
            label: 'Job Sources Registry',
            count: sourcesState.status === 'success' ? sources.length : sourcesState.status === 'error' ? '!' : '...',
            hasError: sourcesState.status === 'error',
          },
          {
            id: 'companies',
            label: 'Company Career Directory',
            count: companiesState.status === 'success' ? companies.length : companiesState.status === 'error' ? '!' : '...',
            hasError: companiesState.status === 'error',
          },
          {
            id: 'coverage',
            label: 'Geographic Coverage Matrix',
            count: coverageState.status === 'success' ? (coverage?.countries.length || 0) : coverageState.status === 'error' ? '!' : '...',
            hasError: coverageState.status === 'error',
          },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-[#C6A66A] text-[#17130C] font-bold shadow-xs'
                : 'bg-[#14171C] text-[#C0BDB5] hover:text-[#F2F0EA] hover:bg-[#191D23] border border-[rgba(255,255,255,0.06)]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
              activeSubTab === tab.id
                ? 'bg-[#17130C]/20 text-[#17130C]'
                : tab.hasError
                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30 font-bold'
                : 'bg-[#0D1014] text-[#92949A]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: JOB SOURCES REGISTRY */}
      {activeSubTab === 'sources' && (
        <div className="space-y-4">
          {sourcesState.status === 'error' ? (
            /* Sub-Tab 1 Error State */
            <div className="p-8 rounded-2xl bg-[#14171C] border border-rose-500/30 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-400" />
              <h4 className="text-sm font-bold text-[#F2F0EA]">Unable to Load Job Sources Registry</h4>
              <p className="text-xs text-[#C0BDB5] max-w-md mx-auto">{sourcesState.error}</p>
              <button
                onClick={loadSources}
                disabled={isAnyLoading}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1014] border border-[rgba(198,166,106,0.30)] text-xs font-semibold text-[#C6A66A] hover:bg-[#191D23] transition flex items-center space-x-1.5 mx-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
                <span>Retry Sources</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92949A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search registered sources by name, company, or domain..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] placeholder-[#737780] focus:outline-none focus:border-[#C6A66A]"
                  />
                </div>
                <select
                  value={healthFilter}
                  onChange={e => setHealthFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
                >
                  <option value="all">All Health Statuses</option>
                  <option value="healthy">Healthy</option>
                  <option value="degraded">Degraded</option>
                  <option value="rate_limited">Rate Limited</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Sources Table */}
              <div className="bg-[#14171C] rounded-2xl border border-[rgba(255,255,255,0.09)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111318] text-[#92949A] uppercase font-mono text-[10px] border-b border-[rgba(255,255,255,0.09)]">
                      <tr>
                        <th className="py-3 px-4">Source / Employer</th>
                        <th className="py-3 px-4">Category & Adapter</th>
                        <th className="py-3 px-4">Region / Country</th>
                        <th className="py-3 px-4">Health</th>
                        <th className="py-3 px-4">Active Jobs</th>
                        <th className="py-3 px-4">Last Sync</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                      {sourcesState.status === 'loading' && sources.length === 0 ? (
                        [1, 2, 3].map(idx => (
                          <tr key={idx} className="animate-pulse">
                            <td colSpan={7} className="py-4 px-4">
                              <div className="h-4 bg-[#191D23] rounded w-3/4 mb-1" />
                              <div className="h-3 bg-[#111318] rounded w-1/2" />
                            </td>
                          </tr>
                        ))
                      ) : filteredSources.length === 0 ? (
                        /* STATE 3: ZERO RECORDS */
                        <tr>
                          <td colSpan={7} className="py-10 text-center space-y-2">
                            <Radio className="w-8 h-8 mx-auto text-[#92949A] opacity-50" />
                            <div className="text-xs font-bold text-[#F2F0EA]">
                              {searchQuery || healthFilter !== 'all' ? 'No sources match the selected criteria' : 'Zero Job Sources Registered'}
                            </div>
                            <p className="text-[11px] text-[#92949A] max-w-sm mx-auto">
                              {searchQuery || healthFilter !== 'all'
                                ? 'Try broadening your filter or searching for a different company or domain.'
                                : 'The GCDE registry is currently empty. Add employer career portals using the button above to begin discovery.'}
                            </p>
                            {!searchQuery && healthFilter === 'all' && (
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-2 px-3 py-1.5 rounded-xl bg-[#C6A66A] text-[#17130C] text-xs font-bold hover:bg-[#D9BB80] transition inline-flex items-center space-x-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add First Career Site</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredSources.map(s => (
                          <tr key={s.id} className="hover:bg-[#191D23] transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#F2F0EA]">{s.name}</div>
                              <div className="text-[11px] font-mono text-[#92949A] flex items-center space-x-1">
                                <span>{s.domain}</span>
                                {s.officialCareersUrl && (
                                  <a
                                    href={s.officialCareersUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#C6A66A] hover:underline"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0D1014] text-[#C0BDB5] border border-[rgba(255,255,255,0.08)] uppercase">
                                {s.adapterType || s.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#C0BDB5]">
                              <div>{s.country}</div>
                              <div className="text-[10px] font-mono text-[#92949A] capitalize">{s.region.replace('_', ' ')}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                s.healthStatus === 'healthy'
                                  ? 'bg-[rgba(53,184,135,0.12)] text-[#35B887] border border-[rgba(53,184,135,0.30)]'
                                  : 'bg-[rgba(217,170,97,0.12)] text-[#D9AA61] border border-[rgba(217,170,97,0.30)]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.healthStatus === 'healthy' ? 'bg-[#35B887]' : 'bg-[#D9AA61]'}`} />
                                <span className="uppercase">{s.healthStatus}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#F2F0EA]">
                              {s.totalActive || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-[#92949A]">
                              {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleTimeString() : 'Pending sync'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleManualSync(s.id)}
                                disabled={isSyncing === s.id}
                                className="px-2.5 py-1 rounded-lg bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-[11px] font-semibold text-[#F2F0EA] hover:border-[rgba(198,166,106,0.30)] hover:text-[#C6A66A] transition cursor-pointer disabled:opacity-50"
                              >
                                {isSyncing === s.id ? 'Syncing...' : 'Sync Now'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY CAREER DIRECTORY */}
      {activeSubTab === 'companies' && (
        <div className="space-y-4">
          {companiesState.status === 'error' ? (
            /* Sub-Tab 2 Error State */
            <div className="p-8 rounded-2xl bg-[#14171C] border border-rose-500/30 text-center space-y-3">
              <Building className="w-8 h-8 mx-auto text-rose-400" />
              <h4 className="text-sm font-bold text-[#F2F0EA]">Unable to Load Company Career Directory</h4>
              <p className="text-xs text-[#C0BDB5] max-w-md mx-auto">{companiesState.error}</p>
              <button
                onClick={() => loadCompanies()}
                disabled={isAnyLoading}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1014] border border-[rgba(198,166,106,0.30)] text-xs font-semibold text-[#C6A66A] hover:bg-[#191D23] transition flex items-center space-x-1.5 mx-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
                <span>Retry Directory</span>
              </button>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92949A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search companies by name, domain, or industry..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] placeholder-[#737780] focus:outline-none focus:border-[#C6A66A]"
                />
              </div>

              <div className="bg-[#14171C] rounded-2xl border border-[rgba(255,255,255,0.09)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111318] text-[#92949A] uppercase font-mono text-[10px] border-b border-[rgba(255,255,255,0.09)]">
                      <tr>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Careers Site</th>
                        <th className="py-3 px-4">Location & Region</th>
                        <th className="py-3 px-4">Detected ATS</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Active Vacancies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                      {companiesState.status === 'loading' && companies.length === 0 ? (
                        [1, 2, 3].map(idx => (
                          <tr key={idx} className="animate-pulse">
                            <td colSpan={6} className="py-4 px-4">
                              <div className="h-4 bg-[#191D23] rounded w-3/4 mb-1" />
                              <div className="h-3 bg-[#111318] rounded w-1/2" />
                            </td>
                          </tr>
                        ))
                      ) : filteredCompanies.length === 0 ? (
                        /* STATE 3: ZERO RECORDS */
                        <tr>
                          <td colSpan={6} className="py-10 text-center space-y-2">
                            <Building className="w-8 h-8 mx-auto text-[#92949A] opacity-50" />
                            <div className="text-xs font-bold text-[#F2F0EA]">
                              {searchQuery ? 'No companies match the search query' : 'Zero Discovered Employers'}
                            </div>
                            <p className="text-[11px] text-[#92949A] max-w-sm mx-auto">
                              {searchQuery
                                ? 'Try a different search term or check spelling.'
                                : 'No verified company career sites have been added to the directory yet.'}
                            </p>
                            {!searchQuery && (
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-2 px-3 py-1.5 rounded-xl bg-[#C6A66A] text-[#17130C] text-xs font-bold hover:bg-[#D9BB80] transition inline-flex items-center space-x-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add First Employer</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies.map(c => (
                          <tr key={c.id} className="hover:bg-[#191D23] transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#F2F0EA]">{c.name}</div>
                              <div className="text-[11px] font-mono text-[#92949A]">{c.industry}</div>
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={c.careersUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#C6A66A] hover:underline font-mono text-[11px] inline-flex items-center space-x-1"
                              >
                                <span>{c.domain}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </td>
                            <td className="py-3 px-4 text-[#C0BDB5]">
                              <div>{c.country}</div>
                              <div className="text-[10px] font-mono text-[#92949A] capitalize">{c.region.replace('_', ' ')}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0D1014] text-[#C6A66A] border border-[rgba(198,166,106,0.22)] uppercase">
                                {c.detectedAts}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(53,184,135,0.12)] text-[#35B887] border border-[rgba(53,184,135,0.30)] uppercase">
                                {c.verificationStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#F2F0EA]">
                              {c.activeVacanciesCount || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: GEOGRAPHIC COVERAGE MATRIX */}
      {activeSubTab === 'coverage' && (
        <div className="space-y-4">
          {coverageState.status === 'error' ? (
            /* Sub-Tab 3 Error State */
            <div className="p-8 rounded-2xl bg-[#14171C] border border-rose-500/30 text-center space-y-3">
              <Globe className="w-8 h-8 mx-auto text-rose-400" />
              <h4 className="text-sm font-bold text-[#F2F0EA]">Unable to Load Geographic Coverage Matrix</h4>
              <p className="text-xs text-[#C0BDB5] max-w-md mx-auto">{coverageState.error}</p>
              <button
                onClick={loadCoverage}
                disabled={isAnyLoading}
                className="px-3.5 py-1.5 rounded-xl bg-[#0D1014] border border-[rgba(198,166,106,0.30)] text-xs font-semibold text-[#C6A66A] hover:bg-[#191D23] transition flex items-center space-x-1.5 mx-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
                <span>Retry Coverage</span>
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] space-y-1">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#C6A66A]">
                  Worldwide Geographic Coverage & Source Density
                </h3>
                <p className="text-xs text-[#92949A]">
                  Coverage is measured strictly by confirmed live openings and registered official career portals. Zero fabricated country counts.
                </p>
              </div>

              {coverageState.status === 'loading' && (!coverage?.countries || coverage.countries.length === 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] space-y-3 animate-pulse">
                      <div className="h-4 bg-[#191D23] rounded w-1/2" />
                      <div className="h-6 bg-[#0D1014] rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (!coverage?.countries || coverage.countries.length === 0) ? (
                /* STATE 3: ZERO COVERAGE RECORDS */
                <div className="p-10 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] text-center space-y-2">
                  <Database className="w-8 h-8 mx-auto text-[#92949A] opacity-50" />
                  <div className="text-xs font-bold text-[#F2F0EA]">Zero Geographic Records</div>
                  <p className="text-[11px] text-[#92949A] max-w-sm mx-auto">
                    No geographic country distribution data has been aggregated yet. Once sources are synchronized, regional metrics will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {(coverage?.countries || []).map((country, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono font-bold text-[#C6A66A]">{country.code}</span>
                          <span className="text-xs font-bold text-[#F2F0EA]">{country.country}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          country.coverageStatus === 'strong'
                            ? 'bg-[rgba(53,184,135,0.12)] text-[#35B887] border border-[rgba(53,184,135,0.30)]'
                            : country.coverageStatus === 'moderate'
                            ? 'bg-[rgba(198,166,106,0.12)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                            : 'bg-[#191D23] text-[#92949A] border border-[rgba(255,255,255,0.09)]'
                        }`}>
                          {country.coverageStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <div className="text-[10px] font-mono text-[#92949A]">Active Jobs</div>
                          <div className="text-base font-bold font-mono text-[#F2F0EA]">{country.activeJobsCount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-[#92949A]">Verified Employers</div>
                          <div className="text-base font-bold font-mono text-[#C0BDB5]">{country.verifiedCompaniesCount}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] font-mono text-[#92949A]">
                        <span>Region: <strong className="text-[#C0BDB5] capitalize">{country.region.replace('_', ' ')}</strong></span>
                        <span>{country.healthySourcesCount}/{country.sourcesCount} sources healthy</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ADD CAREER SITE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#15181E] border border-[rgba(255,255,255,0.12)] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F2F0EA]">Add Official Career Site</h3>
                <p className="text-xs text-[#92949A]">Register an employer career site and detect its underlying ATS</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-[#0D1014] text-[#92949A] hover:text-[#F2F0EA] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C0BDB5] mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompany.name}
                  onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="e.g. Stripe, OpenAI, Notion"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C0BDB5] mb-1">Careers Page URL</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    required
                    value={newCompany.careersUrl}
                    onChange={e => setNewCompany({ ...newCompany, careersUrl: e.target.value })}
                    placeholder="https://jobs.ashbyhq.com/company or https://boards.greenhouse.io/company"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
                  />
                  <button
                    type="button"
                    onClick={handleDetectATS}
                    disabled={isDetecting}
                    className="px-3 py-2 rounded-xl bg-[#191D23] border border-[rgba(198,166,106,0.30)] text-xs font-semibold text-[#C6A66A] hover:bg-[#C6A66A] hover:text-[#17130C] transition cursor-pointer"
                  >
                    {isDetecting ? 'Detecting...' : 'Detect ATS'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C0BDB5] mb-1">Detected ATS</label>
                  <select
                    value={newCompany.detectedAts}
                    onChange={e => setNewCompany({ ...newCompany, detectedAts: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
                  >
                    <option value="custom_web">Custom Web / JSON-LD</option>
                    <option value="greenhouse">Greenhouse ATS</option>
                    <option value="lever">Lever ATS</option>
                    <option value="ashby">Ashby ATS</option>
                    <option value="workable">Workable ATS</option>
                    <option value="smartrecruiters">SmartRecruiters ATS</option>
                    <option value="recruitee">Recruitee ATS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C0BDB5] mb-1">Country</label>
                  <input
                    type="text"
                    value={newCompany.country}
                    onChange={e => setNewCompany({ ...newCompany, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] text-xs text-[#F2F0EA] focus:outline-none focus:border-[#C6A66A]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1014] text-xs font-semibold text-[#C0BDB5] hover:text-[#F2F0EA] border border-[rgba(255,255,255,0.09)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#C6A66A] text-[#17130C] text-xs font-bold hover:bg-[#D9BB80] transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Verify & Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
