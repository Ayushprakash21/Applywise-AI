import React, { useState } from 'react';
import {
  User,
  Sliders,
  ShieldCheck,
  Upload,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Building,
  DollarSign
} from 'lucide-react';
import { UserProfile, CareerPreferences } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  LocationAutocomplete,
  Autocomplete,
  SearchableSelect,
  MultiSelect,
  CountrySelect,
  StateSelect,
  CitySelect,
  resolveNextCascadingState,
} from './ui/SelectSystem.tsx';
import {
  SKILLS_CATALOG,
  ROLE_TITLES_CATALOG,
  RELOCATION_OPTIONS,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../data/platformOptions.ts';

interface ProfileAndPreferencesPageProps {
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  onUpdateProfile: (p: UserProfile) => void;
  onUpdatePreferences: (pref: CareerPreferences) => void;
  onOpenOnboarding: () => void;
}

export const ProfileAndPreferencesPage: React.FC<ProfileAndPreferencesPageProps> = ({
  profile,
  preferences,
  onUpdateProfile,
  onUpdatePreferences,
  onOpenOnboarding,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'preferences'>('profile');
  const [profileData, setProfileData] = useState<UserProfile | null>(profile);
  const [prefData, setPrefData] = useState<CareerPreferences | null>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New item inputs
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newExcludedCompany, setNewExcludedCompany] = useState('');
  const [newExcludedKeyword, setNewExcludedKeyword] = useState('');

  React.useEffect(() => {
    if (profile) setProfileData(profile);
  }, [profile]);

  React.useEffect(() => {
    if (preferences) setPrefData(preferences);
  }, [preferences]);

  if (!profileData || !prefData) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading career profile...</div>;
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const res = await api.updateProfile(profileData);
      onUpdateProfile(res.profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsSaving(true);
      const res = await api.updatePreferences(prefData);
      onUpdatePreferences(res.preferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = (overrideSkill?: string) => {
    const val = (overrideSkill ?? newSkill).trim();
    if (!val) return;
    if (profileData.skills.some(s => s.name.toLowerCase() === val.toLowerCase())) {
      setNewSkill('');
      return;
    }
    setProfileData({
      ...profileData,
      skills: [
        ...profileData.skills,
        { name: val, category: 'general', proficiency: 'proficient', yearsExperience: 2, verified: true },
      ],
    });
    setNewSkill('');
  };

  const removeSkill = (index: number) => {
    setProfileData({
      ...profileData,
      skills: profileData.skills.filter((_, i) => i !== index),
    });
  };

  const addTargetRole = (overrideRole?: string) => {
    const val = (overrideRole ?? newRole).trim();
    if (!val) return;
    const current = prefData.targetRoles || prefData.preferredTitles || [];
    if (current.some(r => r.toLowerCase() === val.toLowerCase())) {
      setNewRole('');
      return;
    }
    setPrefData({
      ...prefData,
      targetRoles: [...current, val],
      preferredTitles: [...current, val],
    });
    setNewRole('');
  };

  const removeTargetRole = (role: string) => {
    const current = prefData.targetRoles || prefData.preferredTitles || [];
    const updated = current.filter(r => r !== role);
    setPrefData({
      ...prefData,
      targetRoles: updated,
      preferredTitles: updated,
    });
  };

  const addExcludedCompany = () => {
    if (!newExcludedCompany.trim()) return;
    setPrefData({
      ...prefData,
      excludedCompanies: [...prefData.excludedCompanies, newExcludedCompany.trim()],
    });
    setNewExcludedCompany('');
  };

  const removeExcludedCompany = (comp: string) => {
    setPrefData({
      ...prefData,
      excludedCompanies: prefData.excludedCompanies.filter(c => c !== comp),
    });
  };

  const addExcludedKeyword = () => {
    if (!newExcludedKeyword.trim()) return;
    setPrefData({
      ...prefData,
      excludedKeywords: [...prefData.excludedKeywords, newExcludedKeyword.trim()],
    });
    setNewExcludedKeyword('');
  };

  const removeExcludedKeyword = (kw: string) => {
    setPrefData({
      ...prefData,
      excludedKeywords: prefData.excludedKeywords.filter(k => k !== kw),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="neu-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Profile & Career Preferences</h1>
            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ATS Source of Truth</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            This verified record is the factual foundation for all tailored applications. ApplyVise AI never fabricates details outside this profile.
          </p>
        </div>

        <button
          onClick={onOpenOnboarding}
          className="px-4 py-2 neu-button rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Upload / Replace Resume</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition min-h-[40px] touch-target ${
            activeSubTab === 'profile'
              ? 'neu-button-primary'
              : 'neu-chip'
          }`}
        >
          Verified Career Profile
        </button>
        <button
          onClick={() => setActiveSubTab('preferences')}
          className={`px-4 py-2.5 rounded-xl font-semibold transition min-h-[40px] touch-target ${
            activeSubTab === 'preferences'
              ? 'neu-button-primary'
              : 'neu-chip'
          }`}
        >
          Career Preferences & Targets
        </button>
      </div>

      {/* SUBTAB 1: Profile */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          {/* Identity & Contact Card */}
          <div className="neu-panel p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal & Contact Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Current / Target Title</label>
                <input
                  type="text"
                  value={profileData.currentTitle}
                  onChange={e => setProfileData({ ...profileData, currentTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Phone</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Location</label>
                <LocationAutocomplete
                  id="profile-location-autocomplete"
                  value={profileData.location}
                  onChange={(nextValue, structured) => {
                    setProfileData({
                      ...profileData,
                      location: nextValue,
                      structuredLocation: structured || undefined,
                      preferredCountry: structured?.country || profileData.preferredCountry,
                      preferredState: structured?.region || profileData.preferredState,
                      preferredCity: structured?.city || profileData.preferredCity,
                    });
                  }}
                  placeholder="Search city, state, or country (e.g. Indore, Mumbai, London)..."
                  ariaLabel="Candidate Location"
                />
                {profileData.structuredLocation && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Verified location: {profileData.structuredLocation.formattedAddress} ({profileData.structuredLocation.countryCode})
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Years of Total Experience</label>
                <input
                  type="number"
                  value={profileData.totalExperienceYears}
                  onChange={e => setProfileData({ ...profileData, totalExperienceYears: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 block">Country, State & City Breakdown (Optional)</label>
                <span className="text-[11px] text-slate-500">Cascading Country → State → City sync</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <CountrySelect
                  value={profileData.preferredCountry || profileData.structuredLocation?.country || ''}
                  onChange={(countryName, meta) => {
                    const reset = resolveNextCascadingState(
                      countryName,
                      profileData.preferredState || '',
                      profileData.preferredCity || ''
                    );
                    const nextFormatted = countryName
                      ? [reset.city, reset.state, countryName].filter(Boolean).join(', ')
                      : profileData.location;
                    setProfileData({
                      ...profileData,
                      preferredCountry: countryName,
                      preferredState: reset.state,
                      preferredCity: reset.city,
                      location: countryName ? nextFormatted : profileData.location,
                      structuredLocation: countryName && meta
                        ? {
                            city: reset.city || undefined,
                            region: reset.state || undefined,
                            country: meta.name,
                            countryCode: meta.code,
                            formattedAddress: nextFormatted,
                            locationType: reset.city ? 'city' : reset.state ? 'region' : 'country',
                          }
                        : profileData.structuredLocation,
                    });
                  }}
                  placeholder="Select country..."
                  ariaLabel="Profile Country"
                />
                <StateSelect
                  country={profileData.preferredCountry || profileData.structuredLocation?.country || ''}
                  value={profileData.preferredState || profileData.structuredLocation?.region || ''}
                  onChange={(stateName) => {
                    const country = profileData.preferredCountry || profileData.structuredLocation?.country || '';
                    const reset = resolveNextCascadingState(country, stateName, '');
                    const nextFormatted = [reset.state, country].filter(Boolean).join(', ');
                    setProfileData({
                      ...profileData,
                      preferredState: stateName,
                      preferredCity: '',
                      location: nextFormatted || profileData.location,
                    });
                  }}
                  ariaLabel="Profile State or Region"
                />
                <CitySelect
                  country={profileData.preferredCountry || profileData.structuredLocation?.country || ''}
                  state={profileData.preferredState || profileData.structuredLocation?.region || ''}
                  value={profileData.preferredCity || profileData.structuredLocation?.city || ''}
                  onChange={(cityName, structured) => {
                    const country = profileData.preferredCountry || profileData.structuredLocation?.country || '';
                    const state = profileData.preferredState || profileData.structuredLocation?.region || structured?.region || '';
                    const formatted = [cityName, state, country].filter(Boolean).join(', ');
                    setProfileData({
                      ...profileData,
                      preferredCity: cityName,
                      preferredState: state,
                      location: formatted || profileData.location,
                      structuredLocation: structured || profileData.structuredLocation,
                    });
                  }}
                  ariaLabel="Profile City"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <label className="font-semibold text-slate-700 mb-1.5 block text-xs">Spoken / Working Languages</label>
              <MultiSelect
                values={profileData.languages || []}
                onChange={(langs) => setProfileData({ ...profileData, languages: langs })}
                options={LANGUAGE_OPTIONS}
                placeholder="Select languages (e.g. English, Hindi, German)..."
                allowCustom={true}
                ariaLabel="Languages"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block text-xs">Professional Summary</label>
              <textarea
                rows={3}
                value={profileData.professionalSummary}
                onChange={e => setProfileData({ ...profileData, professionalSummary: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl neu-input text-xs text-slate-900 leading-relaxed"
              />
            </div>
          </div>

          {/* Verified Skills */}
          <div className="neu-panel p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Verified Technical & Core Skills ({profileData.skills.length})
            </h2>

            <div className="flex gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <Autocomplete
                  value={newSkill}
                  onChange={setNewSkill}
                  options={SKILLS_CATALOG.filter(
                    (opt) =>
                      !newSkill.trim() ||
                      opt.label.toLowerCase().includes(newSkill.trim().toLowerCase())
                  )}
                  onSelectOption={(opt) => addSkill(opt.value)}
                  onSubmitValue={(val) => addSkill(val)}
                  placeholder="Add verified skill (e.g. TypeScript, SAP, Power BI, SQL)..."
                  ariaLabel="Add verified skill"
                />
              </div>
              <button
                type="button"
                onClick={() => addSkill()}
                className="shrink-0 px-4 py-2 min-h-[44px] be-btn-primary neu-button rounded-xl font-bold transition touch-target flex items-center space-x-1 cursor-pointer"
              >
                <span>Add Skill</span>
                <span>+</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {profileData.skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 neu-chip text-slate-800 rounded-xl text-xs font-medium"
                >
                  <span>{s.name}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(idx)}
                    className="p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-slate-400 hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Save Profile Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center space-x-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Profile updated successfully!</span>
              </span>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-3 min-h-[44px] neu-button-primary rounded-xl text-xs font-semibold disabled:opacity-50 transition flex items-center justify-center space-x-1.5 touch-target"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Preferences */}
      {activeSubTab === 'preferences' && (
        <div className="space-y-6">
          {/* Target Roles & Countries */}
          <div className="neu-panel p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Career Targeting</h2>

            {/* Target Roles */}
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Target Job Titles</label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Autocomplete
                    value={newRole}
                    onChange={setNewRole}
                    options={ROLE_TITLES_CATALOG.filter(
                      (opt) =>
                        !newRole.trim() ||
                        opt.label.toLowerCase().includes(newRole.trim().toLowerCase())
                    )}
                    onSelectOption={(opt) => addTargetRole(opt.value)}
                    onSubmitValue={(val) => addTargetRole(val)}
                    placeholder="e.g. Senior Software Engineer, Supply Chain Analyst..."
                    ariaLabel="Target Job Title"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addTargetRole()}
                  className="shrink-0 px-4 py-2 min-h-[44px] neu-button rounded-xl font-semibold transition touch-target"
                >
                  Add Role
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(prefData.targetRoles || prefData.preferredTitles || []).map(r => (
                  <span
                    key={r}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 neu-chip text-blue-700 rounded-xl text-xs font-medium"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => removeTargetRole(r)}
                      className="text-blue-400 hover:text-red-500 transition ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Target Industries, Relocation & Target Countries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200/60">
              <div>
                <label className="font-semibold text-slate-700 mb-1.5 block">Preferred Industries</label>
                <MultiSelect
                  values={prefData.preferredIndustries || []}
                  onChange={(industries) => setPrefData({ ...prefData, preferredIndustries: industries })}
                  options={INDUSTRY_OPTIONS}
                  placeholder="Select target industries..."
                  allowCustom={true}
                  ariaLabel="Preferred Industries"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1.5 block">Willingness to Relocate</label>
                <SearchableSelect
                  value={prefData.willingnessToRelocate || 'negotiable'}
                  onChange={(val) => setPrefData({ ...prefData, willingnessToRelocate: val as any })}
                  options={RELOCATION_OPTIONS}
                  placeholder="Select relocation preference..."
                  ariaLabel="Willingness to Relocate"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs pt-3 border-t border-slate-200/60">
              <label className="font-semibold text-slate-700 block">Target Countries & Regions</label>
              <CountrySelect
                value=""
                includeRemote={true}
                clearable={false}
                placeholder="Add target country or Remote Worldwide..."
                onChange={(countryName) => {
                  if (!countryName) return;
                  if (!prefData.targetCountries.includes(countryName)) {
                    setPrefData({
                      ...prefData,
                      targetCountries: [...prefData.targetCountries, countryName],
                    });
                  }
                }}
                ariaLabel="Add Target Country"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {prefData.targetCountries.map((country) => (
                  <span
                    key={country}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 neu-chip text-slate-800 rounded-lg text-[11px] font-medium"
                  >
                    <span>{country}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPrefData({
                          ...prefData,
                          targetCountries: prefData.targetCountries.filter((c) => c !== country),
                        })
                      }
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Salary & Visa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200/60">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Minimum Annual Salary Floor ($USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    value={prefData.minSalaryUSD || 80000}
                    onChange={e => setPrefData({ ...prefData, minSalaryUSD: Number(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl neu-input text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Visa Sponsorship Requirement</label>
                <div className="flex items-center space-x-3 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer neu-chip px-3 py-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={!!prefData.requiresVisaSponsorship || !!prefData.visaSponsorshipRequired}
                      onChange={e => setPrefData({
                        ...prefData,
                        requiresVisaSponsorship: e.target.checked,
                        visaSponsorshipRequired: e.target.checked,
                      })}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span className="text-slate-700 font-medium">I require visa sponsorship for international roles</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Excluded Companies & Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200/60">
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Excluded Companies</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExcludedCompany}
                    onChange={e => setNewExcludedCompany(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExcludedCompany())}
                    placeholder="e.g. Unwanted Employer..."
                    className="flex-1 px-3.5 py-2 rounded-xl neu-input text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addExcludedCompany}
                    className="px-3.5 py-2 neu-button rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prefData.excludedCompanies.map(c => (
                    <span key={c} className="px-2.5 py-1 neu-chip text-red-700 rounded-lg text-[11px] inline-flex items-center space-x-1">
                      <span>{c}</span>
                      <button onClick={() => removeExcludedCompany(c)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Excluded Keywords</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExcludedKeyword}
                    onChange={e => setNewExcludedKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExcludedKeyword())}
                    placeholder="e.g. internship, unpaid..."
                    className="flex-1 px-3.5 py-2 rounded-xl neu-input text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addExcludedKeyword}
                    className="px-3.5 py-2 neu-button rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prefData.excludedKeywords.map(k => (
                    <span key={k} className="px-2.5 py-1 neu-chip text-red-700 rounded-lg text-[11px] inline-flex items-center space-x-1">
                      <span>{k}</span>
                      <button onClick={() => removeExcludedKeyword(k)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Preferences Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center space-x-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Preferences saved successfully!</span>
              </span>
            )}
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="px-6 py-3 min-h-[44px] neu-button-primary rounded-xl text-xs font-semibold disabled:opacity-50 transition flex items-center justify-center space-x-1.5 touch-target"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
