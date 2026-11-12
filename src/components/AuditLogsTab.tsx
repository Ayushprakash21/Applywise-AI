import React, { useState } from 'react';
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  Clock,
  RotateCcw
} from 'lucide-react';
import { AuditLogEntry } from '../types/index.ts';
import { FilterSelect } from './ui/SelectSystem.tsx';
import { AUDIT_SEVERITY_OPTIONS } from '../data/platformOptions.ts';

interface AuditLogsTabProps {
  auditLogs: AuditLogEntry[];
  onResetDemo: () => Promise<void>;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ auditLogs, onResetDemo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  const filteredLogs = auditLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      log.action.toLowerCase().includes(term) ||
      log.target.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.actor.toLowerCase().includes(term);

    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleReset = async () => {
    if (window.confirm('Reset application database to initial clean demo state?')) {
      setIsResetting(true);
      try {
        await onResetDemo();
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Security & Audit Event Stream</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all autonomous agent decisions, truthfulness checks, and submission proofs.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
        >
          <RotateCcw className="h-4 w-4 text-amber-400" />
          <span>Reset Demo Store</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, target, actor, or details..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-44">
          <FilterSelect
            value={severityFilter}
            onChange={val => setSeverityFilter(val || 'all')}
            searchable={false}
            options={AUDIT_SEVERITY_OPTIONS}
            theme="dark"
            ariaLabel="Filter audit logs by severity"
          />
        </div>
      </div>

      {/* Audit Stream Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Event Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.map(log => {
              const severityBadge: Record<string, string> = {
                info: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
                warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                security: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
                critical: 'bg-red-500/10 text-red-300 border-red-500/20',
              };

              return (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border uppercase ${severityBadge[log.severity] || severityBadge.info}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">{log.actor}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-400 whitespace-nowrap">{log.action}</td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{log.target}</td>
                  <td className="px-4 py-3 text-slate-300 leading-relaxed max-w-md">{log.details}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
