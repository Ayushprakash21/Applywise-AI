import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { HrAdminDiagnosticsSummary, HrDiscoveryQueueItem } from '../types/index.ts';

export const AdminHrDiscoveryDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<HrAdminDiagnosticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [inspectedItem, setInspectedItem] = useState<HrDiscoveryQueueItem | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminHrDiscoveryDiagnostics();
      setDiagnostics(res.diagnostics);
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Failed to load HR discovery diagnostics.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDiagnostics();
  }, []);

  const handleRunDiscovery = async () => {
    setBusyAction('run');
    setFeedback(null);
    try {
      const res = await api.runAdminHrDiscoveryBatch({ batchLimit: 80, fetchBudget: 10 });
      setDiagnostics(res.diagnostics);
      setFeedback({
        type: 'ok',
        text: `Batch finished: inspected ${res.run.jobsScanned} jobs (${res.run.descriptionsInspected} descriptions, ${res.run.companyPagesInspected} company pages) and persisted ${res.discoveredContacts.length} contacts.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Discovery batch run failed.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRetryFailed = async () => {
    setBusyAction('retry');
    setFeedback(null);
    try {
      const res = await api.retryFailedHrDiscovery();
      setDiagnostics(res.diagnostics);
      setFeedback({
        type: 'ok',
        text: `Requeued ${res.requeuedCount} failed/dead-letter records; processed ${res.run.jobsScanned} jobs.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Failed to retry failed queue items.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRevalidateStale = async () => {
    setBusyAction('revalidate');
    setFeedback(null);
    try {
      const res = await api.revalidateStaleHrContacts(30);
      setDiagnostics(res.diagnostics);
      setFeedback({
        type: 'ok',
        text: `Revalidated ${res.result.checked} contacts (${res.result.stillValid} valid, ${res.result.markedStaleOrFailed} stale/failed).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Stale contact revalidation failed.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReprocessJob = async (jobId: string) => {
    setBusyAction(`reprocess:${jobId}`);
    setFeedback(null);
    try {
      const res = await api.reprocessHrDiscoveryJob(jobId);
      setDiagnostics(res.diagnostics);
      setFeedback({
        type: 'ok',
        text: `Reprocessed job ${jobId}: ${res.discoveredContacts.length} contacts extracted.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Failed to reprocess job.' });
    } finally {
      setBusyAction(null);
    }
  };

  const totals = diagnostics?.totals;
  const qStats = diagnostics?.queueStats;

  return (
    <div className="space-y-6">
      {/* Header & Operational Controls */}
      <div className="p-5 rounded-2xl bg-[#14171C] border border-[rgba(198,166,106,0.30)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F2F0EA]">HR Contact Discovery & Extraction Diagnostics</h1>
              <p className="text-xs text-[#92949A]">
                Real database telemetry for GCDE extraction queue, 5-level verification, job coverage, and failure triage.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleRunDiscovery}
            className="px-3.5 py-2 rounded-xl bg-[#C6A66A] text-[#0D1014] text-xs font-bold flex items-center space-x-1.5 hover:bg-[#D4B87E] disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{busyAction === 'run' ? 'Running Batch...' : 'Run Discovery Batch'}</span>
          </button>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleRetryFailed}
            className="px-3 py-2 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.12)] text-[#F2F0EA] text-xs font-semibold flex items-center space-x-1.5 hover:border-[#C6A66A] disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>{busyAction === 'retry' ? 'Retrying...' : 'Retry Failed'}</span>
          </button>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleRevalidateStale}
            className="px-3 py-2 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.12)] text-[#F2F0EA] text-xs font-semibold flex items-center space-x-1.5 hover:border-[#C6A66A] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#35B887]" />
            <span>{busyAction === 'revalidate' ? 'Checking...' : 'Revalidate Stale'}</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={loadDiagnostics}
            className="px-3 py-2 rounded-xl bg-[#0D1014] border border-[rgba(255,255,255,0.10)] text-[#92949A] hover:text-[#F2F0EA] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
            feedback.type === 'ok'
              ? 'bg-[rgba(53,184,135,0.10)] border-[rgba(53,184,135,0.35)] text-[#35B887]'
              : 'bg-rose-500/10 border-rose-500/35 text-rose-300'
          }`}
        >
          {feedback.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Grid (Real DB Counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Public Contacts', value: totals?.totalContacts ?? 0, sub: `${totals?.totalJobLinks ?? 0} job links` },
          { label: 'Source Confirmed (L4)', value: totals?.sourceConfirmedContacts ?? 0, sub: 'Official posting / careers evidence' },
          { label: 'MX Validated (L3)', value: totals?.mxValidatedContacts ?? 0, sub: `${totals?.domainValidContacts ?? 0} domain valid` },
          { label: 'Mailbox Verified (L5)', value: totals?.mailboxVerifiedContacts ?? 0, sub: 'Confirmed SMTP / delivery' },
          {
            label: 'GCDE Job Coverage',
            value: `${totals?.jobCoveragePercent ?? 0}%`,
            sub: `${totals?.jobsCoveredCount ?? 0} / ${totals?.totalActiveJobs ?? 0} active jobs`,
          },
          {
            label: 'Stale / Failed Contacts',
            value: (totals?.staleContacts ?? 0) + (totals?.invalidOrFailedContacts ?? 0),
            sub: `${totals?.staleContacts ?? 0} stale, ${totals?.invalidOrFailedContacts ?? 0} invalid/failed`,
          },
        ].map((card) => (
          <div key={card.label} className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.08)]">
            <div className="text-[11px] font-medium text-[#92949A]">{card.label}</div>
            <div className="text-xl font-bold text-[#F2F0EA] mt-1 font-mono">{card.value}</div>
            <div className="text-[10px] text-[#92949A] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Queue State Breakdown */}
      <div className="p-4 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center space-x-2">
            <Database className="h-4 w-4 text-[#C6A66A]" />
            <span>Persistent Discovery Queue State</span>
          </h2>
          {diagnostics?.lastSuccessfulRun && (
            <span className="text-[11px] text-[#92949A] font-mono">
              Last Run: {new Date(diagnostics.lastSuccessfulRun.completedAt || diagnostics.lastSuccessfulRun.startedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {[
            { label: 'Pending', val: qStats?.pending ?? 0, cls: 'text-amber-300 border-amber-500/25' },
            { label: 'Processing', val: qStats?.processing ?? 0, cls: 'text-sky-300 border-sky-500/25' },
            { label: 'Contacts Extracted', val: qStats?.completed ?? 0, cls: 'text-[#35B887] border-[#35B887]/30' },
            { label: 'No Email Published', val: qStats?.noContactFound ?? 0, cls: 'text-[#92949A] border-white/10' },
            { label: 'Retrying (Failed)', val: qStats?.failed ?? 0, cls: 'text-orange-300 border-orange-500/25' },
            { label: 'Dead Letter', val: qStats?.deadLetter ?? 0, cls: 'text-rose-300 border-rose-500/30' },
            { label: 'Unsupported Source', val: qStats?.unsupportedSource ?? 0, cls: 'text-slate-400 border-white/10' },
          ].map((s) => (
            <div key={s.label} className={`p-2.5 rounded-xl bg-[#0D1014] border ${s.cls}`}>
              <div className="text-[10px] text-[#92949A]">{s.label}</div>
              <div className="text-lg font-bold font-mono mt-0.5">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Source Breakdown Table */}
      <div className="rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F2F0EA]">Extraction Yield by GCDE Source</h2>
          <span className="text-[11px] text-[#92949A]">{diagnostics?.sourceBreakdown.length ?? 0} queued sources</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1014] text-[#92949A] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Queued Jobs</th>
                <th className="px-4 py-2.5">Contacts Accepted</th>
                <th className="px-4 py-2.5">No Email Published</th>
                <th className="px-4 py-2.5">Failed / Dead Letter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {(diagnostics?.sourceBreakdown || []).map((row) => (
                <tr key={row.source} className="hover:bg-[#191D23]">
                  <td className="px-4 py-2.5 font-mono text-[#F2F0EA]">{row.source}</td>
                  <td className="px-4 py-2.5 font-mono text-[#C0BDB5]">{row.totalQueued}</td>
                  <td className="px-4 py-2.5 font-mono text-[#35B887] font-bold">{row.contactsFound}</td>
                  <td className="px-4 py-2.5 font-mono text-[#92949A]">{row.noContactFound}</td>
                  <td className="px-4 py-2.5 font-mono text-rose-300">{row.failed}</td>
                </tr>
              ))}
              {(!diagnostics || diagnostics.sourceBreakdown.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#92949A]">
                    No jobs have entered the HR discovery queue yet. Click &ldquo;Run Discovery Batch&rdquo; to scan synced GCDE jobs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center space-x-2">
          <Activity className="h-4 w-4 text-[#C6A66A]" />
          <h2 className="text-sm font-bold text-[#F2F0EA]">Recent Extraction Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1014] text-[#92949A] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Started</th>
                <th className="px-4 py-2.5">Trigger</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Jobs</th>
                <th className="px-4 py-2.5">Extracted</th>
                <th className="px-4 py-2.5">MX / Source</th>
                <th className="px-4 py-2.5">Dupes / Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {(diagnostics?.recentRuns || []).map((run) => (
                <tr key={run.id} className="hover:bg-[#191D23]">
                  <td className="px-4 py-2.5 text-[#C0BDB5] font-mono">{new Date(run.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[#C6A66A] font-mono">{run.triggerType}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#191D23] border border-white/10 text-[#F2F0EA]">
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[#F2F0EA]">{run.jobsScanned}</td>
                  <td className="px-4 py-2.5 font-mono text-[#35B887]">{run.emailsExtracted}</td>
                  <td className="px-4 py-2.5 font-mono text-[#C0BDB5]">
                    {run.mxValidatedCount} MX / {run.sourceConfirmedCount} Src
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[#92949A]">
                    {run.duplicatesSkipped} dup / {run.invalidRejected} rej
                  </td>
                </tr>
              ))}
              {(!diagnostics || diagnostics.recentRuns.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-[#92949A]">
                    No extraction runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failing & Dead-Letter Records */}
      <div className="rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-rose-400" />
            <span>Failing & Dead-Letter Queue Records</span>
          </h2>
          <span className="text-[11px] text-[#92949A]">{diagnostics?.failingRecords.length ?? 0} failing</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1014] text-[#92949A] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Company</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Diagnostic Category</th>
                <th className="px-4 py-2.5">Attempts</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {(diagnostics?.failingRecords || []).map((rec) => (
                <tr key={rec.id} className="hover:bg-[#191D23]">
                  <td className="px-4 py-2.5 font-semibold text-[#F2F0EA]">{rec.companyName}</td>
                  <td className="px-4 py-2.5 font-mono text-[#92949A]">{rec.source}</td>
                  <td className="px-4 py-2.5 font-mono text-rose-300">{rec.status}</td>
                  <td className="px-4 py-2.5 text-[#C0BDB5]">{rec.diagnosticCategory || 'unknown'}</td>
                  <td className="px-4 py-2.5 font-mono text-[#92949A]">{rec.attemptCount}/3</td>
                  <td className="px-4 py-2.5 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setInspectedItem(rec)}
                      className="px-2 py-1 rounded-lg bg-[#0D1014] border border-white/10 text-[11px] text-[#C6A66A] hover:border-[#C6A66A] cursor-pointer"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => handleReprocessJob(rec.jobId)}
                      className="px-2 py-1 rounded-lg bg-[#191D23] border border-white/15 text-[11px] text-[#F2F0EA] hover:border-[#35B887] cursor-pointer disabled:opacity-50"
                    >
                      {busyAction === `reprocess:${rec.jobId}` ? 'Running...' : 'Reprocess'}
                    </button>
                  </td>
                </tr>
              ))}
              {(!diagnostics || diagnostics.failingRecords.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-[#92949A]">
                    Zero failing or dead-letter queue records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostic Inspector Modal */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#14171C] border border-[rgba(198,166,106,0.40)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F2F0EA]">Queue Diagnostic Inspector</h3>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="text-xs text-[#92949A] hover:text-[#F2F0EA] cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div><span className="text-[#92949A]">Job ID:</span> <span className="font-mono text-[#F2F0EA]">{inspectedItem.jobId}</span></div>
              <div><span className="text-[#92949A]">Company:</span> <span className="text-[#F2F0EA]">{inspectedItem.companyName}</span></div>
              <div><span className="text-[#92949A]">Source:</span> <span className="font-mono text-[#C6A66A]">{inspectedItem.source}</span></div>
              <div><span className="text-[#92949A]">Category:</span> <span className="font-mono text-[#F2F0EA]">{inspectedItem.diagnosticCategory}</span></div>
              {inspectedItem.jobUrl && (
                <div className="break-all">
                  <span className="text-[#92949A]">URL:</span>{' '}
                  <span className="text-sky-300 font-mono">{inspectedItem.jobUrl}</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-[#0D1014] border border-white/10 text-rose-200 font-mono text-[11px]">
                {inspectedItem.failureReason || 'No error string recorded.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
