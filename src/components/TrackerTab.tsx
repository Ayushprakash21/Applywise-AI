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
      label: 'Draft & Prepared',
      statuses: ['DISCOVERED', 'VALIDATED', 'MATCHED', 'RESUME_GENERATED', 'APPLICATION_PREPARED'],
      color: 'border-slate-200 bg-white text-slate-700',
    },
    {
      id: 'approval',
      label: 'Ready to Review',
      statuses: ['AWAITING_APPROVAL', 'AUTHORIZED_TO_SUBMIT'],
      color: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    {
      id: 'submitted',
      label: 'Applied',
      statuses: ['SUBMITTING', 'SUBMITTED', 'CONFIRMATION_VERIFIED', 'TRACKED'],
      color: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      id: 'interview',
      label: 'Interviewing',
      statuses: ['INTERVIEWING'],
      color: 'border-purple-200 bg-purple-50 text-purple-700',
    },
    {
      id: 'offer',
      label: 'Offers & Outcomes',
      statuses: ['OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'],
      color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Application Tracker</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep track of your active job applications, interview stages, and follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Export CSV */}
          <a
            href="/api/applications/export-csv"
            download="applywise_applications.csv"
            className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <Download className="h-4 w-4 text-slate-500" />
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
            placeholder="Search by company, role, or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none w-full sm:w-auto shadow-xs"
        >
          <option value="all">All Stages</option>
          <option value="AWAITING_APPROVAL">Awaiting Review</option>
          <option value="APPLICATION_PREPARED">Application Ready</option>
          <option value="SUBMITTED">Applied</option>
          <option value="INTERVIEWING">Interviewing</option>
          <option value="OFFER_RECEIVED">Offer Received</option>
        </select>
      </div>

      {/* Main View: Board vs List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colApps = filteredApps.filter(a => col.statuses.includes(a.status));

            return (
              <div
                key={col.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-3 flex flex-col min-w-[240px]"
              >
                {/* Column Header */}
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-semibold ${col.color}`}>
                  <span>{col.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                    {colApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colApps.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                      No applications
                    </div>
                  ) : (
                    colApps.map(app => (
                      <div
                        key={app.id}
                        onClick={() => onSelectApplication(app)}
                        className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2 hover:border-blue-400 hover:shadow-md transition cursor-pointer shadow-xs"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 text-xs">{app.company}</span>
                          <span className="text-[11px] font-bold text-blue-600 font-mono">
                            {app.matchScore}% match
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 font-medium line-clamp-1">{app.role}</div>

                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <span>{app.location}</span>
                        </div>

                        {app.submissionEvidence?.confirmationNumber && (
                          <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded truncate font-medium">
                            Confirmation: {app.submissionEvidence.confirmationNumber}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                          <span className="text-blue-600 font-medium capitalize">{app.status.toLowerCase().replace(/_/g, ' ')}</span>
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Confirmation</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map(app => (
                <tr
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="hover:bg-slate-50 transition cursor-pointer"
                >
                  <td className="px-4 py-3.5 font-bold text-slate-900">{app.company}</td>
                  <td className="px-4 py-3.5 text-slate-800">{app.role}</td>
                  <td className="px-4 py-3.5 text-slate-500">{app.location}</td>
                  <td className="px-4 py-3.5 font-bold text-blue-600 font-mono">{app.matchScore}%</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-medium capitalize">
                      {app.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {app.submissionEvidence?.confirmationNumber || 'Pending'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button className="text-blue-600 hover:text-blue-700 font-semibold">
                      View
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
