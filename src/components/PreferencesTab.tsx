import React, { useState } from 'react';
import {
  Globe,
  DollarSign,
  Building2,
  ShieldAlert,
  Save,
  Check,
  Plus,
  Trash2,
  Briefcase,
  SlidersHorizontal
} from 'lucide-react';
import { CareerPreferences, WorkArrangement, EmploymentType } from '../types/index.ts';
import { CountrySelect, SearchableSelect } from './ui/SelectSystem.tsx';
import { RELOCATION_OPTIONS } from '../data/platformOptions.ts';

interface PreferencesTabProps {
  preferences: CareerPreferences | null;
  onUpdatePreferences: (updated: Partial<CareerPreferences>) => Promise<void>;
}

export const PreferencesTab: React.FC<PreferencesTabProps> = ({
  preferences,
  onUpdatePreferences,
}) => {
  const [formData, setFormData] = useState<CareerPreferences | null>(preferences);
  const [newExcludedComp, setNewExcludedComp] = useState('');
  const [newPreferredComp, setNewPreferredComp] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    setFormData(preferences);
  }, [preferences]);

  if (!formData || !preferences) {
    return <div className="p-8 text-center text-slate-400">Loading preferences...</div>;
  }

  const handleSave = async () => {
    await onUpdatePreferences(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleArrangement = (arr: WorkArrangement) => {
    const current = [...formData.workArrangement];
    const exists = current.includes(arr);
    const updated = exists ? current.filter(a => a !== arr) : [...current, arr];
    setFormData({ ...formData, workArrangement: updated });
  };

  const addExcludedCompany = () => {
    if (!newExcludedComp.trim()) return;
    setFormData({
      ...formData,
      excludedCompanies: [...formData.excludedCompanies, newExcludedComp.trim()],
    });
    setNewExcludedComp('');
  };

  const removeExcludedCompany = (comp: string) => {
    setFormData({
      ...formData,
      excludedCompanies: formData.excludedCompanies.filter(c => c !== comp),
    });
  };

  const addPreferredCompany = () => {
    if (!newPreferredComp.trim()) return;
    setFormData({
      ...formData,
      preferredCompanies: [...formData.preferredCompanies, newPreferredComp.trim()],
    });
    setNewPreferredComp('');
  };

  const removePreferredCompany = (comp: string) => {
    setFormData({
      ...formData,
      preferredCompanies: formData.preferredCompanies.filter(c => c !== comp),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Career & Targeting Preferences</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Define target locations, salary floors by currency, work arrangements, and blacklisted employers.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
        >
          {isSaved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
          <span>{isSaved ? 'Preferences Saved' : 'Save Preferences'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Countries, Titles & Arrangement */}
        <div className="space-y-6">
          {/* Target Countries & Cities */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span>Target Countries & Regions</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.targetCountries.map((country, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 font-medium"
                >
                  <span>{country}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        targetCountries: formData.targetCountries.filter((c) => c !== country),
                      })
                    }
                    className="text-indigo-400 hover:text-rose-400 transition"
                    aria-label={`Remove ${country}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <div className="flex-1">
                <CountrySelect
                  value={newCountry}
                  includeRemote={true}
                  theme="dark"
                  size="sm"
                  placeholder="Select target country (e.g. India, Germany, Remote Worldwide)..."
                  onChange={(countryName) => {
                    if (countryName && !formData.targetCountries.includes(countryName)) {
                      setFormData({
                        ...formData,
                        targetCountries: [...formData.targetCountries, countryName],
                      });
                    }
                    setNewCountry('');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Work Arrangement & Relocation */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-emerald-400" />
              <span>Work Arrangements & Relocation</span>
            </h3>

            <div className="space-y-2 text-xs">
              <label className="text-slate-400 font-medium">Permitted Work Formats:</label>
              <div className="flex flex-wrap gap-3">
                {(['remote', 'hybrid', 'onsite'] as WorkArrangement[]).map(arr => {
                  const checked = formData.workArrangement.includes(arr);
                  return (
                    <button
                      key={arr}
                      type="button"
                      onClick={() => toggleArrangement(arr)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${
                        checked
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {arr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div>
                <div className="font-semibold text-white">Visa Sponsorship Required</div>
                <div className="text-[11px] text-slate-400">Flag or filter out roles that cannot sponsor visas</div>
              </div>
              <input
                type="checkbox"
                checked={formData.visaSponsorshipRequired}
                onChange={e => setFormData({ ...formData, visaSponsorshipRequired: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
              <div>
                <div className="font-semibold text-white">Willingness to Relocate</div>
                <div className="text-[11px] text-slate-400">Open to moving for right opportunity</div>
              </div>
              <div className="w-56 shrink-0">
                <SearchableSelect
                  value={formData.willingnessToRelocate}
                  onChange={val => setFormData({ ...formData, willingnessToRelocate: val as any })}
                  options={RELOCATION_OPTIONS}
                  theme="dark"
                  size="xs"
                  searchable={false}
                  ariaLabel="Willingness to Relocate"
                />
              </div>
            </div>
          </div>

          {/* Salary Matrix by Currency */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span>Minimum Acceptable Salary by Currency</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(formData.minSalaryByCurrency).map(([curr, amount]) => (
                <div key={curr} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1">
                  <span className="font-bold text-indigo-400 font-mono">{curr}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">$</span>
                    <input
                      type="number"
                      step={5000}
                      value={amount}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setFormData({
                          ...formData,
                          minSalaryByCurrency: { ...formData.minSalaryByCurrency, [curr]: val },
                        });
                      }}
                      className="w-full bg-transparent text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">Per annum floor</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Excluded Companies & Whitelist */}
        <div className="space-y-6">
          {/* Excluded Companies (Blacklist) */}
          <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-300 flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span>Excluded Companies (Hard Blacklist)</span>
              </h3>
              <span className="text-xs font-mono text-red-400">{formData.excludedCompanies.length}</span>
            </div>
            <p className="text-xs text-slate-400">
              ApplyVise AI will never recommend or apply to these companies. All matching vacancies are discarded automatically.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add company name to blacklist..."
                value={newExcludedComp}
                onChange={e => setNewExcludedComp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExcludedCompany()}
                className="flex-1 rounded-lg border border-red-900/60 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={addExcludedCompany}
                className="rounded-lg bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Exclude
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.excludedCompanies.map((comp, idx) => (
                <span
                  key={idx}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-red-950/50 text-red-300 border border-red-800/60"
                >
                  <span>{comp}</span>
                  <button
                    onClick={() => removeExcludedCompany(comp)}
                    className="text-red-400 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Excluded Keywords */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              <span>Excluded Role Keywords</span>
            </h3>
            <p className="text-xs text-slate-400">
              Vacancies with these terms in title or requirements are rejected.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add keyword (e.g. gambling, cold calling)..."
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newKeyword.trim()) {
                    setFormData({
                      ...formData,
                      excludedKeywords: [...formData.excludedKeywords, newKeyword.trim()],
                    });
                    setNewKeyword('');
                  }
                }}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newKeyword.trim()) {
                    setFormData({
                      ...formData,
                      excludedKeywords: [...formData.excludedKeywords, newKeyword.trim()],
                    });
                    setNewKeyword('');
                  }
                }}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.excludedKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-950 text-slate-300 border border-slate-800"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        excludedKeywords: formData.excludedKeywords.filter(k => k !== kw),
                      })
                    }
                    className="text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Companies */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>Preferred Target Employers</span>
            </h3>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add preferred company (e.g. Vercel, Linear)..."
                value={newPreferredComp}
                onChange={e => setNewPreferredComp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPreferredCompany()}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={addPreferredCompany}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.preferredCompanies.map((comp, idx) => (
                <span
                  key={idx}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-950/50 text-indigo-300 border border-indigo-800/60"
                >
                  <span>{comp}</span>
                  <button
                    onClick={() => removePreferredCompany(comp)}
                    className="text-indigo-400 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
