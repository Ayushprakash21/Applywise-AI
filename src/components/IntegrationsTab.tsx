import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SourceIntegrationStatus } from '../types/index.ts';

interface IntegrationsTabProps {
  integrations: SourceIntegrationStatus[];
  onTestIntegrations: () => void;
  isTesting: boolean;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  integrations,
  onTestIntegrations,
  isTesting,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Source Adapters & Integrations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real employment endpoints, public job APIs, ATS webhooks, and manual ingestion adapters.
          </p>
        </div>

        <button
          onClick={onTestIntegrations}
          disabled={isTesting}
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testing Health...' : 'Check All Adapters'}</span>
        </button>
      </div>

      {/* Integration Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(int => (
          <div
            key={int.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/40 font-bold">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{int.name}</h3>
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">{int.type.replace('_', ' ')}</span>
                </div>
              </div>

              <span className="flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{int.status.toUpperCase()}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
              {int.description}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Jobs Ingested:</span>
                <span className="font-mono font-bold text-white">{int.totalJobsFetched}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rate Limit Status:</span>
                <span className="font-mono text-[11px] text-slate-300">{int.rateLimitLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Synced:</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(int.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance & Robots Notice */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>Terms of Service, Robots.txt & API Rate Policy</span>
        </div>
        <p className="leading-relaxed">
          ApplyWise AI strictly respects official employer API limits, robots.txt exclusions, and webmaster terms of service. The platform never bypasses access barriers, solves non-permitted CAPTCHAs, or transmits unsolicited duplicate applications.
        </p>
      </div>
    </div>
  );
};
