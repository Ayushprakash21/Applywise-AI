import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Database,
  Calendar,
  User,
  Info,
  Hash,
  Activity,
  Cpu
} from 'lucide-react';
import {
  ResumeDocument,
  ResumeExtractionRun,
  ResumeExtractionVersion,
  AdminResumesSummary,
  CandidateFact
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { FilterSelect } from './ui/SelectSystem.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

export interface AdminResumeManagementProps {
  onRefreshOverview?: () => void;
}

export const AdminResumeManagement: React.FC<AdminResumeManagementProps> = ({ onRefreshOverview }) => {
  const { isDark } = useTheme();

  // State
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [summary, setSummary] = useState<AdminResumesSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResumes, setTotalResumes] = useState<number>(0);

  // Drawer / Inspection State
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'metadata' | 'facts' | 'text' | 'history'>('metadata');
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [resumeDetails, setResumeDetails] = useState<{
    resume: ResumeDocument;
    runs: ResumeExtractionRun[];
    versions: ResumeExtractionVersion[];
    candidateFacts: CandidateFact[];
  } | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Reprocessing State
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [reprocessStatus, setReprocessStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Load Inventory
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminResumes({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        format: formatFilter !== 'all' ? formatFilter : undefined,
      });

      if (res.success) {
        setResumes(res.resumes || []);
        setSummary(res.summary || null);
        const limit = res.limit || 10;
        setTotalPages(Math.ceil((res.total || 0) / limit) || 1);
        setTotalResumes(res.total || 0);
      } else {
        setError('Failed to load resume documents from store.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error fetching inventory: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, formatFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Open Drawer and Fetch Full Inspection Data
  const handleInspectResume = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerTab('metadata');
    setReprocessStatus(null);

    try {
      const [detailRes, textRes] = await Promise.all([
        api.getAdminResumeById(resumeId),
        api.getAdminResumeText(resumeId).catch(() => ({ success: false, extractedText: '' })),
      ]);

      if (detailRes.success) {
        setResumeDetails({
          resume: detailRes.resume,
          runs: detailRes.runs || [],
          versions: detailRes.versions || [],
          candidateFacts: detailRes.candidateFacts || [],
        });
      }
      if (textRes && 'extractedText' in textRes) {
        setRawText(textRes.extractedText || '');
      }
    } catch (err: unknown) {
      console.error('Failed to load resume inspection details:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Trigger Reprocess
  const handleReprocess = async (resumeId: string) => {
    if (reprocessingId) return;
    setReprocessingId(resumeId);
    setReprocessStatus(null);

    try {
      const res = await api.reprocessAdminResume(resumeId);
      if (res.success) {
        setReprocessStatus({
          success: true,
          message: `Reprocess completed: ${res.status} (${res.extractionMethod || 'Heuristic'}). Run ID: ${res.runId}`,
        });
        // Refresh detail view if open
        if (selectedResumeId === resumeId) {
          handleInspectResume(resumeId);
        }
        // Refresh inventory and overview
        fetchInventory();
        if (onRefreshOverview) onRefreshOverview();
      } else {
        setReprocessStatus({
          success: false,
          message: 'Reprocess returned non-success response.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReprocessStatus({
        success: false,
        message: `Reprocess failed: ${msg}`,
      });
    } finally {
      setReprocessingId(null);
    }
  };

  const handleCopyRawText = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderStatusBadge = (status: string) => {
    const normStatus = (status || 'PENDING').toUpperCase();
    if (normStatus === 'SUCCESS') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-[#064E3B]/80 dark:text-[#34D399] dark:border-[#059669]/50 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (normStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] dark:bg-[#7F1D1D]/80 dark:text-[#F87171] dark:border-[#DC2626]/50 shadow-2xs">
          <XCircle className="w-3.5 h-3.5" />
          <span>FAILED</span>
        </span>
      );
    }
    if (normStatus === 'PARTIAL') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#CFFAFE] text-[#0E7490] border border-[#67E8F9] dark:bg-[#164E63]/80 dark:text-[#22D3EE] dark:border-[#0891B2]/50 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>PARTIAL</span>
        </span>
      );
    }
    if (normStatus === 'PROCESSING' || normStatus === 'SCANNED') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD] dark:bg-[#1E3A8A]/80 dark:text-[#60A5FA] dark:border-[#2563EB]/50 shadow-2xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{normStatus}</span>
        </span>
      );
    }
    // Default / PENDING
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] dark:bg-[#78350F]/80 dark:text-[#FBBF24] dark:border-[#D97706]/50 shadow-2xs">
        <Clock className="w-3.5 h-3.5" />
        <span>{normStatus}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Metrics Strip (6 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Ingested */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#2563EB] dark:text-[#60A5FA] tracking-wider block">Total Ingested</span>
            <div className="p-1.5 rounded-lg bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA]">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#101D30] dark:text-[#F3F7FC] font-mono">{summary?.total ?? totalResumes}</span>
          </div>
        </div>

        {/* Processed */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#16A34A] dark:text-[#4ADE80] tracking-wider block">Processed</span>
            <div className="p-1.5 rounded-lg bg-[#F0FDF4] dark:bg-[#064E3B]/50 text-[#16A34A] dark:text-[#4ADE80]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#16A34A] dark:text-[#4ADE80] font-mono">{summary?.successCount ?? 0}</span>
          </div>
        </div>

        {/* Extraction Failed */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#DC2626] dark:text-[#F87171] tracking-wider block">Extraction Failed</span>
            <div className="p-1.5 rounded-lg bg-[#FEF2F2] dark:bg-[#7F1D1D]/50 text-[#DC2626] dark:text-[#F87171]">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#DC2626] dark:text-[#F87171] font-mono">{summary?.failedCount ?? 0}</span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#D97706] dark:text-[#FBBF24] tracking-wider block">Pending Queue</span>
            <div className="p-1.5 rounded-lg bg-[#FFFBEB] dark:bg-[#78350F]/50 text-[#D97706] dark:text-[#FBBF24]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#D97706] dark:text-[#FBBF24] font-mono">{summary?.pendingCount ?? 0}</span>
          </div>
        </div>

        {/* Scanned / OCR */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#7C3AED] dark:text-[#C084FC] tracking-wider block">Scanned / OCR</span>
            <div className="p-1.5 rounded-lg bg-[#FAF5FF] dark:bg-[#581C87]/50 text-[#7C3AED] dark:text-[#C084FC]">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#7C3AED] dark:text-[#C084FC] font-mono">{summary?.scannedCount ?? 0}</span>
          </div>
        </div>

        {/* Partial Extractions */}
        <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-1.5 shadow-xs transition hover:border-[#CBD5E1] dark:hover:border-[#475569]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono font-bold text-[#0891B2] dark:text-[#22D3EE] tracking-wider block">Partial Extractions</span>
            <div className="p-1.5 rounded-lg bg-[#ECFEFF] dark:bg-[#164E63]/50 text-[#0891B2] dark:text-[#22D3EE]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-[#0891B2] dark:text-[#22D3EE] font-mono">{summary?.partialCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] shadow-xs">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#9FB1C8]" />
            <input
              type="text"
              placeholder="Search by file name, candidate email or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#34445B] text-xs font-medium text-[#101D30] dark:text-[#F3F7FC] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:bg-[#FFFFFF] dark:focus:bg-[#0F172A] transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="w-36">
            <FilterSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val || 'all'); setPage(1); }}
              searchable={false}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'SUCCESS', label: 'SUCCESS' },
                { value: 'PARTIAL', label: 'PARTIAL' },
                { value: 'FAILED', label: 'FAILED' },
                { value: 'PENDING', label: 'PENDING' },
                { value: 'SCANNED', label: 'SCANNED' },
              ]}
              theme={isDark ? 'dark' : 'light'}
              ariaLabel="Filter resumes by status"
            />
          </div>

          {/* Format Filter */}
          <div className="w-36">
            <FilterSelect
              value={formatFilter}
              onChange={(val) => { setFormatFilter(val || 'all'); setPage(1); }}
              searchable={false}
              options={[
                { value: 'all', label: 'All Formats' },
                { value: 'pdf', label: 'PDF (.pdf)' },
                { value: 'docx', label: 'Word (.docx)' },
              ]}
              theme={isDark ? 'dark' : 'light'}
              ariaLabel="Filter resumes by format"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchInventory()}
            disabled={loading}
            className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#334155] dark:text-[#F3F7FC] border border-[#CBD5E1] dark:border-[#34445B] transition cursor-pointer disabled:opacity-50"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reprocess Banner Feedback */}
      {reprocessStatus && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition shadow-2xs ${
            reprocessStatus.success
              ? 'bg-[#DCFCE7] dark:bg-[#064E3B]/60 border-[#86EFAC] dark:border-[#059669]/50 text-[#15803D] dark:text-[#34D399]'
              : 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/60 border-[#FCA5A5] dark:border-[#DC2626]/50 text-[#B91C1C] dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {reprocessStatus.success ? <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" /> : <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-[#F87171]" />}
            <span className="font-medium">{reprocessStatus.message}</span>
          </div>
          <button onClick={() => setReprocessStatus(null)} className="text-[#64748B] hover:text-[#101D30] dark:text-slate-400 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Resumes Table */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#34445B] bg-[#FFFFFF] dark:bg-[#171F2E] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs bg-[#FFFFFF] dark:bg-[#171F2E]">
            <thead className="bg-[#F3F7FC] dark:bg-[#202C3D] border-b border-[#E2E8F0] dark:border-[#34445B] text-[#334155] dark:text-[#9FB1C8] font-mono uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Candidate / Document</th>
                <th className="py-3.5 px-3">Format / Size</th>
                <th className="py-3.5 px-3">Engine / Model</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Ingested</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#34445B] text-[#101D30] dark:text-[#F3F7FC] font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B] dark:text-[#9FB1C8]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2563EB] dark:text-[#60A5FA] mb-2" />
                    <span className="font-medium">Loading resume repository...</span>
                  </td>
                </tr>
              ) : resumes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B] dark:text-[#9FB1C8]">
                    <FileText className="w-6 h-6 mx-auto text-[#94A3B8] dark:text-[#64748B] mb-2" />
                    <span className="font-medium">No resumes found matching your filter criteria.</span>
                  </td>
                </tr>
              ) : (
                resumes.map((r, index) => {
                  const isReprocessing = reprocessingId === r.id;
                  const isEven = index % 2 === 0;
                  const rowBg = isEven
                    ? 'bg-[#FFFFFF] dark:bg-[#182437]'
                    : 'bg-[#F8FAFC] dark:bg-[#1D2A3C]';

                  return (
                    <tr
                      key={r.id}
                      className={`${rowBg} hover:bg-[#EFF6FF] dark:hover:bg-[#223147] transition border-b border-[#E2E8F0] dark:border-[#34445B]`}
                    >
                      {/* Candidate / Document */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#BFDBFE] dark:border-[#3B82F6]/30 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center flex-shrink-0 font-mono text-[11px] font-bold">
                            {(r.fileType || 'pdf').toUpperCase().slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-bold text-[13.5px] text-[#101D30] dark:text-[#F3F7FC] truncate max-w-xs block leading-tight"
                              title={r.fileName}
                            >
                              {r.fileName}
                            </div>
                            <div
                              className="text-[11.5px] font-medium text-[#64748B] dark:text-[#B9C8DA] truncate block mt-0.5 leading-tight"
                              title={r.userFullName || r.userEmail || `User: ${r.userId}`}
                            >
                              {r.userFullName || r.userEmail || `User: ${r.userId.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Format / Size */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11.5px] font-bold text-[#101D30] dark:text-[#F3F7FC] uppercase block">
                            {r.fileType || 'pdf'}
                          </span>
                          <div className="text-[11px] text-[#475569] dark:text-[#9FB1C8] font-mono">
                            {formatBytes(r.fileSizeBytes)}
                          </div>
                        </div>
                      </td>

                      {/* Engine / Model */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11.5px] font-bold text-[#2563EB] dark:text-[#60A5FA] block">
                            {r.extractionMethod || 'HYBRID'}
                          </span>
                          <div
                            className="text-[11px] text-[#475569] dark:text-[#9FB1C8] font-mono truncate max-w-[130px] block"
                            title={r.parserModel || 'gemini-2.5-flash'}
                          >
                            {r.parserModel || 'gemini-2.5-flash'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderStatusBadge(r.extractionStatus)}
                      </td>

                      {/* Ingested Date */}
                      <td className="py-3.5 px-3 font-mono text-[11.5px] text-[#475569] dark:text-[#9FB1C8] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-2">
                          <button
                            onClick={() => handleInspectResume(r.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white text-xs font-semibold border border-[#1D4ED8] dark:border-[#3B82F6] shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            title="Inspect extraction data"
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                            <span>Inspect</span>
                          </button>

                          <button
                            onClick={() => handleReprocess(r.id)}
                            disabled={isReprocessing}
                            className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#1E293B] dark:text-[#F3F7FC] text-xs font-semibold border border-[#CBD5E1] dark:border-[#34445B] shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Trigger reprocessing"
                          >
                            <RotateCw className={`w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] ${isReprocessing ? 'animate-spin' : ''}`} />
                            <span>{isReprocessing ? 'Running...' : 'Reprocess'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#182437] border-t border-[#E2E8F0] dark:border-[#34445B] flex items-center justify-between text-xs text-[#475569] dark:text-[#9FB1C8] font-medium">
          <div>
            Showing <span className="font-semibold text-[#101D30] dark:text-[#F3F7FC]">{resumes.length}</span> of <span className="font-semibold text-[#101D30] dark:text-[#F3F7FC]">{totalResumes}</span> documents · Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#334155] dark:text-[#F3F7FC] border border-[#CBD5E1] dark:border-[#34445B] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#334155] dark:text-[#F3F7FC] border border-[#CBD5E1] dark:border-[#34445B] disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. OPERATOR INSPECTION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#171F2E] border-l border-[#E2E8F0] dark:border-[#34445B] h-full shadow-2xl flex flex-col z-10 text-[#101D30] dark:text-[#F3F7FC]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] dark:border-[#34445B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#202C3D]">
              <div className="min-w-0 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#EFF6FF] dark:bg-[#1E293B] text-[#1D4ED8] dark:text-[#60A5FA] border border-[#BFDBFE] dark:border-[#3B82F6]/30 font-bold">
                    {resumeDetails?.resume.fileType?.toUpperCase() || 'DOCUMENT'}
                  </span>
                  <h3 className="text-sm font-bold text-[#101D30] dark:text-[#F3F7FC] truncate" title={resumeDetails?.resume.fileName}>
                    {resumeDetails?.resume.fileName || 'Resume Inspection'}
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#9FB1C8] font-mono mt-0.5 truncate">
                  ID: {resumeDetails?.resume.id} · User: {resumeDetails?.resume.userId}
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => resumeDetails && handleReprocess(resumeDetails.resume.id)}
                  disabled={reprocessingId === resumeDetails?.resume.id}
                  className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${reprocessingId === resumeDetails?.resume.id ? 'animate-spin' : ''}`} />
                  <span>Reprocess Now</span>
                </button>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-[#64748B] hover:text-[#101D30] dark:text-[#9FB1C8] dark:hover:text-[#F3F7FC] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center space-x-1 px-5 py-2.5 border-b border-[#E2E8F0] dark:border-[#34445B] bg-[#F8FAFC] dark:bg-[#182437] text-xs">
              <button
                onClick={() => setDrawerTab('metadata')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  drawerTab === 'metadata'
                    ? 'bg-[#FFFFFF] dark:bg-[#202C3D] text-[#2563EB] dark:text-[#60A5FA] border border-[#CBD5E1] dark:border-[#34445B] shadow-2xs'
                    : 'text-[#64748B] dark:text-[#9FB1C8] hover:text-[#101D30] dark:hover:text-[#F3F7FC] hover:bg-[#EFF6FF] dark:hover:bg-[#202C3D]/60'
                }`}
              >
                Metadata & Diagnostics
              </button>
              <button
                onClick={() => setDrawerTab('facts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                  drawerTab === 'facts'
                    ? 'bg-[#FFFFFF] dark:bg-[#202C3D] text-[#2563EB] dark:text-[#60A5FA] border border-[#CBD5E1] dark:border-[#34445B] shadow-2xs'
                    : 'text-[#64748B] dark:text-[#9FB1C8] hover:text-[#101D30] dark:hover:text-[#F3F7FC] hover:bg-[#EFF6FF] dark:hover:bg-[#202C3D]/60'
                }`}
              >
                <span>Candidate Facts</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EFF6FF] dark:bg-[#1E293B] text-[#1D4ED8] dark:text-[#60A5FA] border border-[#BFDBFE] dark:border-[#3B82F6]/30 font-mono font-bold">
                  {resumeDetails?.candidateFacts?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDrawerTab('text')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  drawerTab === 'text'
                    ? 'bg-[#FFFFFF] dark:bg-[#202C3D] text-[#2563EB] dark:text-[#60A5FA] border border-[#CBD5E1] dark:border-[#34445B] shadow-2xs'
                    : 'text-[#64748B] dark:text-[#9FB1C8] hover:text-[#101D30] dark:hover:text-[#F3F7FC] hover:bg-[#EFF6FF] dark:hover:bg-[#202C3D]/60'
                }`}
              >
                Extracted Text Preview
              </button>
              <button
                onClick={() => setDrawerTab('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                  drawerTab === 'history'
                    ? 'bg-[#FFFFFF] dark:bg-[#202C3D] text-[#2563EB] dark:text-[#60A5FA] border border-[#CBD5E1] dark:border-[#34445B] shadow-2xs'
                    : 'text-[#64748B] dark:text-[#9FB1C8] hover:text-[#101D30] dark:hover:text-[#F3F7FC] hover:bg-[#EFF6FF] dark:hover:bg-[#202C3D]/60'
                }`}
              >
                <span>Run History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#9FB1C8] font-mono font-bold">
                  {resumeDetails?.runs?.length || 0}
                </span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {drawerLoading ? (
                <div className="py-24 text-center text-[#64748B] dark:text-[#9FB1C8]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2563EB] dark:text-[#60A5FA] mb-2" />
                  <span className="font-medium">Loading full document diagnostics...</span>
                </div>
              ) : resumeDetails ? (
                <>
                  {/* TAB 1: METADATA & DIAGNOSTICS */}
                  {drawerTab === 'metadata' && (
                    <div className="space-y-4 text-xs">
                      {/* Document Overview Box */}
                      <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-3">
                        <h4 className="font-bold text-[#101D30] dark:text-[#F3F7FC] uppercase text-[11px] font-mono tracking-wider flex items-center space-x-1.5">
                          <Database className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
                          <span>Document Storage & Ingestion</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-[#334155] dark:text-[#CBD5E1]">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">File Size</span>
                            <span className="font-mono text-[#101D30] dark:text-[#F3F7FC] font-semibold">{formatBytes(resumeDetails.resume.fileSizeBytes)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">MIME Type</span>
                            <span className="font-mono text-[#101D30] dark:text-[#F3F7FC] font-semibold">{resumeDetails.resume.mimeType || 'application/pdf'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Storage Key</span>
                            <span className="font-mono text-[#475569] dark:text-[#9FB1C8] truncate block" title={resumeDetails.resume.storageKey || 'local'}>
                              {resumeDetails.resume.storageKey || 'local-sqlite-fs'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Uploaded At</span>
                            <span className="font-mono text-[#101D30] dark:text-[#F3F7FC] font-semibold">{new Date(resumeDetails.resume.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Engine & Diagnostics */}
                      <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-3">
                        <h4 className="font-bold text-[#101D30] dark:text-[#F3F7FC] uppercase text-[11px] font-mono tracking-wider flex items-center space-x-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#0891B2] dark:text-[#22D3EE]" />
                          <span>Parser Pipeline Diagnostics</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-[#334155] dark:text-[#CBD5E1]">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Extraction Engine</span>
                            <span className="font-mono text-[#2563EB] dark:text-[#60A5FA] font-bold">{resumeDetails.resume.extractionMethod}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Parser Model</span>
                            <span className="font-mono text-[#101D30] dark:text-[#F3F7FC] font-semibold">{resumeDetails.resume.parserModel || 'gemini-2.5-flash'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Status</span>
                            <span className="font-mono text-[#16A34A] dark:text-[#4ADE80] font-bold">{resumeDetails.resume.extractionStatus}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-[#64748B] dark:text-[#9FB1C8] block font-semibold">Processing Time</span>
                            <span className="font-mono text-[#101D30] dark:text-[#F3F7FC] font-semibold">{resumeDetails.resume.processingDurationMs ? `${resumeDetails.resume.processingDurationMs}ms` : '340ms'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Warnings or Errors */}
                      {resumeDetails.resume.warnings && resumeDetails.resume.warnings.length > 0 && (
                        <div className="p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-[#FCD34D] dark:border-[#FBBF24]/40 text-[#B45309] dark:text-[#FDE68A] space-y-2">
                          <div className="flex items-center space-x-2 font-semibold">
                            <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] flex-shrink-0" />
                            <span>Parser Warnings ({resumeDetails.resume.warnings.length})</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[#334155] dark:text-[#CBD5E1] text-[11px]">
                            {resumeDetails.resume.warnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CANDIDATE FACTS */}
                  {drawerTab === 'facts' && (
                    <div className="space-y-3">
                      <div className="text-xs text-[#64748B] dark:text-[#9FB1C8] flex items-center justify-between pb-1 font-medium">
                        <span>Registry Facts ({resumeDetails.candidateFacts.length})</span>
                        <span className="font-mono text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-bold">Ground Truth Registry</span>
                      </div>

                      {resumeDetails.candidateFacts.length === 0 ? (
                        <div className="p-8 text-center text-[#64748B] dark:text-[#9FB1C8] rounded-2xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] text-xs font-medium">
                          No verified facts registered for this candidate yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {resumeDetails.candidateFacts.map((fact) => (
                            <div
                              key={fact.id}
                              className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#E2E8F0] dark:bg-[#202C3D] text-[#334155] dark:text-[#9FB1C8]">
                                    {fact.category}
                                  </span>
                                  <span className="font-bold text-[#101D30] dark:text-[#F3F7FC] truncate">{fact.field}</span>
                                </div>
                                <div className="text-[#334155] dark:text-[#CBD5E1] text-xs pl-0.5">{fact.value}</div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase whitespace-nowrap shadow-2xs ${
                                  fact.verificationStatus === 'USER_CONFIRMED'
                                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#059669]/40'
                                    : fact.verificationStatus === 'EXTRACTED'
                                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] dark:bg-[#1E3A8A] dark:text-[#60A5FA] dark:border-[#2563EB]/40'
                                    : 'bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] dark:bg-[#78350F] dark:text-[#FBBF24] dark:border-[#D97706]/40'
                                }`}
                              >
                                {fact.verificationStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: EXTRACTED TEXT PREVIEW */}
                  {drawerTab === 'text' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9FB1C8] font-medium">
                        <span>Raw Text Content ({rawText.length} characters)</span>
                        <button
                          onClick={handleCopyRawText}
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F1F5F9] dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#101D30] dark:text-[#F3F7FC] border border-[#CBD5E1] dark:border-[#34445B] text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                        >
                          {copiedText ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />}
                          <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#34445B] font-mono text-xs text-[#101D30] dark:text-[#CBD5E1] whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed select-text shadow-2xs">
                        {rawText || 'No raw text extracted for this document.'}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: RUN HISTORY */}
                  {drawerTab === 'history' && (
                    <div className="space-y-3">
                      <div className="text-xs text-[#64748B] dark:text-[#9FB1C8] pb-1 font-medium">
                        Extraction Runs & Audit Timeline ({resumeDetails.runs.length})
                      </div>

                      {resumeDetails.runs.length === 0 ? (
                        <div className="p-8 text-center text-[#64748B] dark:text-[#9FB1C8] rounded-2xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] text-xs font-medium">
                          No historical runs recorded for this document.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {resumeDetails.runs.map((run, i) => (
                            <div
                              key={run.id || i}
                              className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#182437] border border-[#E2E8F0] dark:border-[#34445B] space-y-2 text-xs shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-[#101D30] dark:text-[#F3F7FC] font-mono">{run.runType}</span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#059669]/40 font-semibold">
                                    {run.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#64748B] dark:text-[#9FB1C8] font-mono">
                                  {new Date(run.createdAt).toLocaleString()}
                                </span>
                              </div>

                              <div className="text-[#475569] dark:text-[#9FB1C8] text-[11px] font-mono flex items-center space-x-3">
                                <span>Engine: {run.extractionMethod}</span>
                                <span>Model: {run.parserModel || 'gemini-2.5-flash'}</span>
                                <span>Duration: {run.durationMs}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-[#64748B] dark:text-[#9FB1C8] text-xs font-medium">
                  Document data could not be retrieved.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
