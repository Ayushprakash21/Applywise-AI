import React, { useState } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Calendar,
  Sparkles,
  ArrowRight,
  Eye,
  DollarSign
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/index.ts';

interface TrackerTabProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onTransitionStatus: (id: string, newStatus: ApplicationStatus, note?: string) => Promise<void>;
}

export const TrackerTab: React.FC<TrackerTabProps> = ({
  applications,
  onSelectApplication,
  onTransitionStatus,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApps = applications.filter(app => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      app.company.toLowerCase().includes(term) ||
      app.role.toLowerCase().includes(term) ||
      app.location.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const kanbanColumns: Array<{ id: string; label: string; statuses: ApplicationStatus[]; color: string }> = [
    {
      id: 'discovered',
      label: 'Discovered & Prepared',
      statuses: ['DISCOVERED', 'VALIDATED', 'MATCHED', 'RESUME_GENERATED', 'APPLICATION_PREPARED'],
      color: 'border-slate-700 bg-slate-900/40 text-slate-300',
    },
    {
      id: 'approval',
      label: 'Awaiting Approval',
      statuses: ['AWAITING_APPROVAL', 'AUTHORIZED_TO_SUBMIT'],
      color: 'border-amber-800/60 bg-amber-950/20 text-amber-300',
    },
    {
      id: 'submitted',
      label: 'Submitted & Confirmed',
      statuses: ['SUBMITTING', 'SUBMITTED', 'CONFIRMATION_VERIFIED', 'TRACKED'],
      color: 'border-emerald-800/60 bg-emerald-950/20 text-emerald-300',
    },
    {
      id: 'interview',
      label: 'Interviews & Next Steps',
      statuses: ['INTERVIEWING'],
      color: 'border-purple-800/60 bg-purple-950/20 text-purple-300',
    },
    {
      id: 'offer',
      label: 'Offers & Outcomes',
      statuses: ['OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'],
      color: 'border-indigo-800/60 bg-indigo-950/20 text-indigo-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Application Tracker & Lifecycle</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full end-to-end audit history, verification receipts, and follow-up schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Export CSV */}
          <a
            href="/api/applications/export-csv"
            download="orion_applications.csv"
            className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search applied company, role, or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900/60 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">All Lifecycle Stages</option>
          <option value="AWAITING_APPROVAL">Awaiting Approval</option>
          <option value="APPLICATION_PREPARED">Application Prepared</option>
          <option value="CONFIRMATION_VERIFIED">Confirmed Verified</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="INTERVIEWING">Interviewing</option>
          <option value="OFFER_RECEIVED">Offer Received</option>
        </select>
      </div>

      {/* Main View: Kanban vs Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colApps = filteredApps.filter(a => col.statuses.includes(a.status));

            return (
              <div
                key={col.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-3 flex flex-col min-w-[240px]"
              >
                {/* Column Header */}
                <div className={`p-2.5 rounded-xl border font-medium text-xs flex items-center justify-between ${col.color}`}>
                  <span className="font-semibold">{col.label}</span>
                  <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-black/30">
                    {colApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colApps.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                      Empty
                    </div>
                  ) : (
                    colApps.map(app => (
                      <div
                        key={app.id}
                        onClick={() => onSelectApplication(app)}
                        className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2 hover:border-slate-700 hover:bg-slate-900 transition cursor-pointer shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white text-xs">{app.company}</span>
                          <span className="text-[11px] font-bold text-emerald-400 font-mono">
                            {app.matchScore}%
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 font-medium line-clamp-1">{app.role}</div>

                        <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <span>{app.location}</span>
                        </div>

                        {app.submissionEvidence?.confirmationNumber && (
                          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded truncate">
                            Receipt: {app.submissionEvidence.confirmationNumber}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                          <span className="font-mono text-indigo-400">{app.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt / Evidence</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredApps.map(app => (
                <tr
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                >
                  <td className="px-4 py-3.5 font-bold text-white">{app.company}</td>
                  <td className="px-4 py-3.5 text-slate-200">{app.role}</td>
                  <td className="px-4 py-3.5 text-slate-400">{app.location}</td>
                  <td className="px-4 py-3.5 font-bold font-mono text-indigo-400">{app.matchScore}%</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-emerald-400">
                    {app.submissionEvidence?.confirmationNumber || 'Pending'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 font-medium">
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
  );
};
