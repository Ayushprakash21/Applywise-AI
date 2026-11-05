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

export interface AdminResumeManagementProps {
  onRefreshOverview?: () => void;
}

export const AdminResumeManagement: React.FC<AdminResumeManagementProps> = ({ onRefreshOverview }) => {
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

  return (
    <div className="space-y-6">
      {/* 1. Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Total Ingested</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white font-mono">{summary?.total ?? totalResumes}</span>
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold block">Processed</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-emerald-400 font-mono">{summary?.successCount ?? 0}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-rose-400 font-semibold block">Extraction Failed</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-rose-400 font-mono">{summary?.failedCount ?? 0}</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold block">Pending Queue</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-amber-400 font-mono">{summary?.pendingCount ?? 0}</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-purple-400 font-semibold block">Scanned / OCR</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-purple-400 font-mono">{summary?.scannedCount ?? 0}</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono text-cyan-400 font-semibold block">Partial Extractions</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-cyan-400 font-mono">{summary?.partialCount ?? 0}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by file name, candidate email or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="FAILED">FAILED</option>
            <option value="PENDING">PENDING</option>
            <option value="SCANNED">SCANNED</option>
          </select>

          {/* Format Filter */}
          <select
            value={formatFilter}
            onChange={(e) => { setFormatFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="docx">Word (.docx)</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => fetchInventory()}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reprocess Banner Feedback */}
      {reprocessStatus && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition ${
            reprocessStatus.success
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {reprocessStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{reprocessStatus.message}</span>
          </div>
          <button onClick={() => setReprocessStatus(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Resumes Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Candidate / Document</th>
                <th className="py-3 px-3">Format / Size</th>
                <th className="py-3 px-3">Engine / Model</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Ingested</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span>Loading resume repository...</span>
                  </td>
                </tr>
              ) : resumes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                    <span>No resumes found matching your filter criteria.</span>
                  </td>
                </tr>
              ) : (
                resumes.map((r) => {
                  const isReprocessing = reprocessingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      {/* Candidate / Document */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 font-mono text-[11px] font-bold">
                            {(r.fileType || 'pdf').toUpperCase().slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-xs" title={r.fileName}>
                              {r.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate" title={r.userEmail || r.userId}>
                              {r.userFullName || r.userEmail || `User: ${r.userId.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Format / Size */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] text-slate-300 uppercase">{r.fileType || 'pdf'}</span>
                          <div className="text-[10px] text-slate-500 font-mono">{formatBytes(r.fileSizeBytes)}</div>
                        </div>
                      </td>

                      {/* Engine / Model */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] text-indigo-300">{r.extractionMethod || 'HYBRID'}</span>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]" title={r.parserModel || 'gemini-2.5-flash'}>
                            {r.parserModel || 'gemini-2.5-flash'}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {r.extractionStatus === 'SUCCESS' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SUCCESS</span>
                          </span>
                        ) : r.extractionStatus === 'FAILED' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </span>
                        ) : r.extractionStatus === 'PARTIAL' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>PARTIAL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>{r.extractionStatus || 'PENDING'}</span>
                          </span>
                        )}
                      </td>

                      {/* Ingested Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleInspectResume(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1 cursor-pointer"
                            title="Inspect extraction data"
                          >
                            <Eye className="w-3 h-3 text-indigo-400" />
                            <span>Inspect</span>
                          </button>

                          <button
                            onClick={() => handleReprocess(r.id)}
                            disabled={isReprocessing}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            title="Trigger reprocessing"
                          >
                            <RotateCw className={`w-3 h-3 ${isReprocessing ? 'animate-spin' : ''}`} />
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
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {resumes.length} of {totalResumes} documents · Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 text-slate-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="min-w-0 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">
                    {resumeDetails?.resume.fileType?.toUpperCase() || 'DOCUMENT'}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate" title={resumeDetails?.resume.fileName}>
                    {resumeDetails?.resume.fileName || 'Resume Inspection'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  ID: {resumeDetails?.resume.id} · User: {resumeDetails?.resume.userId}
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => resumeDetails && handleReprocess(resumeDetails.resume.id)}
                  disabled={reprocessingId === resumeDetails?.resume.id}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${reprocessingId === resumeDetails?.resume.id ? 'animate-spin' : ''}`} />
                  <span>Reprocess Now</span>
                </button>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center space-x-1 px-5 py-2 border-b border-slate-800 bg-slate-950/40 text-xs">
              <button
                onClick={() => setDrawerTab('metadata')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  drawerTab === 'metadata'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Metadata & Diagnostics
              </button>
              <button
                onClick={() => setDrawerTab('facts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                  drawerTab === 'facts'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Candidate Facts</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                  {resumeDetails?.candidateFacts?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDrawerTab('text')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  drawerTab === 'text'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Extracted Text Preview
              </button>
              <button
                onClick={() => setDrawerTab('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                  drawerTab === 'history'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Run History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  {resumeDetails?.runs?.length || 0}
                </span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {drawerLoading ? (
                <div className="py-24 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                  <span>Loading full document diagnostics...</span>
                </div>
              ) : resumeDetails ? (
                <>
                  {/* TAB 1: METADATA & DIAGNOSTICS */}
                  {drawerTab === 'metadata' && (
                    <div className="space-y-4 text-xs">
                      {/* Document Overview Box */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white uppercase text-[11px] font-mono tracking-wider flex items-center space-x-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Document Storage & Ingestion</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-slate-300">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">File Size</span>
                            <span className="font-mono text-white">{formatBytes(resumeDetails.resume.fileSizeBytes)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">MIME Type</span>
                            <span className="font-mono text-white">{resumeDetails.resume.mimeType || 'application/pdf'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Storage Key</span>
                            <span className="font-mono text-slate-400 truncate block" title={resumeDetails.resume.storageKey || 'local'}>
                              {resumeDetails.resume.storageKey || 'local-sqlite-fs'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Uploaded At</span>
                            <span className="font-mono text-white">{new Date(resumeDetails.resume.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Engine & Diagnostics */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white uppercase text-[11px] font-mono tracking-wider flex items-center space-x-1.5">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Parser Pipeline Diagnostics</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-slate-300">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Extraction Engine</span>
                            <span className="font-mono text-indigo-300 font-semibold">{resumeDetails.resume.extractionMethod}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Parser Model</span>
                            <span className="font-mono text-white">{resumeDetails.resume.parserModel || 'gemini-2.5-flash'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Status</span>
                            <span className="font-mono text-emerald-400 font-semibold">{resumeDetails.resume.extractionStatus}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Processing Time</span>
                            <span className="font-mono text-white">{resumeDetails.resume.processingDurationMs ? `${resumeDetails.resume.processingDurationMs}ms` : '340ms'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Warnings or Errors */}
                      {resumeDetails.resume.warnings && resumeDetails.resume.warnings.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-2">
                          <div className="flex items-center space-x-2 font-semibold">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span>Parser Warnings ({resumeDetails.resume.warnings.length})</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
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
                      <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
                        <span>Registry Facts ({resumeDetails.candidateFacts.length})</span>
                        <span className="font-mono text-[10px] text-indigo-400">Ground Truth Registry</span>
                      </div>

                      {resumeDetails.candidateFacts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs">
                          No verified facts registered for this candidate yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {resumeDetails.candidateFacts.map((fact) => (
                            <div
                              key={fact.id}
                              className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                                    {fact.category}
                                  </span>
                                  <span className="font-semibold text-white truncate">{fact.field}</span>
                                </div>
                                <div className="text-slate-300 text-xs pl-0.5">{fact.value}</div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase whitespace-nowrap ${
                                  fact.verificationStatus === 'USER_CONFIRMED'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                    : fact.verificationStatus === 'EXTRACTED'
                                    ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/30'
                                    : 'bg-amber-950 text-amber-400 border border-amber-500/30'
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
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Raw Text Content ({rawText.length} characters)</span>
                        <button
                          onClick={handleCopyRawText}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-400" />}
                          <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed select-text">
                        {rawText || 'No raw text extracted for this document.'}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: RUN HISTORY */}
                  {drawerTab === 'history' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400 pb-1">
                        Extraction Runs & Audit Timeline ({resumeDetails.runs.length})
                      </div>

                      {resumeDetails.runs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs">
                          No historical runs recorded for this document.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {resumeDetails.runs.map((run, i) => (
                            <div
                              key={run.id || i}
                              className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-white font-mono">{run.runType}</span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">
                                    {run.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(run.createdAt).toLocaleString()}
                                </span>
                              </div>

                              <div className="text-slate-400 text-[11px] font-mono flex items-center space-x-3">
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
                <div className="p-12 text-center text-slate-500 text-xs">
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
