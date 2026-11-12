import React, { useState } from 'react';
import { PlusCircle, Building2, MapPin, DollarSign, Globe, FileText } from 'lucide-react';
import { WorkArrangement } from '../types/index.ts';
import { LocationAutocomplete, SearchableSelect } from './ui/SelectSystem.tsx';
import { FORM_WORK_ARRANGEMENT_OPTIONS } from '../data/platformOptions.ts';

interface ManualJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: {
    title: string;
    company: string;
    url: string;
    location: string;
    arrangement: WorkArrangement;
    remote: boolean;
    description: string;
    salaryRaw?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const ManualJobModal: React.FC<ManualJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('Remote (Worldwide)');
  const [arrangement, setArrangement] = useState<WorkArrangement>('remote');
  const [salaryRaw, setSalaryRaw] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;

    await onSubmit({
      title: title.trim(),
      company: company.trim(),
      url: url.trim() || 'https://careers.company.com',
      location: location.trim(),
      arrangement,
      remote: arrangement === 'remote',
      description: description.trim() || `${title} role at ${company}.`,
      salaryRaw: salaryRaw.trim() || undefined,
    });

    onClose();
    setTitle('');
    setCompany('');
    setUrl('');
    setDescription('');
    setSalaryRaw('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Add Custom Job Vacancy</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-300 font-medium">Job Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Full Stack Engineer"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Stripe, OpenAI"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Job URL</label>
              <input
                type="url"
                placeholder="https://company.com/jobs/123"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Location</label>
              <LocationAutocomplete
                value={location}
                onChange={(val) => setLocation(val)}
                includeRemote={true}
                placeholder="San Francisco / Remote"
                theme="dark"
                ariaLabel="Manual Job Location"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Arrangement</label>
              <SearchableSelect
                value={arrangement}
                onChange={val => setArrangement(val as WorkArrangement)}
                options={FORM_WORK_ARRANGEMENT_OPTIONS}
                searchable={false}
                theme="dark"
                size="sm"
                ariaLabel="Work Arrangement"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium">Salary Range</label>
              <input
                type="text"
                placeholder="$160k - $210k USD"
                value={salaryRaw}
                onChange={e => setSalaryRaw(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium">Job Description & Requirements</label>
            <textarea
              rows={4}
              placeholder="Paste job description or requirements here..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !company.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Importing...' : 'Ingest & Evaluate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
