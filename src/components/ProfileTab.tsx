import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Sparkles,
  ShieldCheck,
  Upload,
  FileText,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  X
} from 'lucide-react';
import { UserProfile, VerifiedSkill, ExperienceItem } from '../types/index.ts';
import { getUserInitials } from './ProfileIdentityComponent.tsx';
import { ProfilePhotoCropModal } from './ProfilePhotoCropModal.tsx';
import { formatExperiencePeriod } from '../utils/structuralEmploymentParser.ts';

interface ProfileTabProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onParseResumeText: (text: string) => Promise<void>;
  isParsingResume: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  onUpdateProfile,
  onParseResumeText,
  isParsingResume,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(profile);
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Inline Experience Editing State
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expEditForm, setExpEditForm] = useState<{
    role: string;
    company: string;
    startDate: string;
    endDate: string;
    current: boolean;
    location: string;
  }>({
    role: '',
    company: '',
    startDate: '',
    endDate: '',
    current: false,
    location: '',
  });

  const handleStartEditExp = (exp: ExperienceItem) => {
    setEditingExpId(exp.id || null);
    setExpEditForm({
      role: exp.role || '',
      company: exp.company || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      current: Boolean(exp.current),
      location: exp.location || '',
    });
  };

  const handleCancelEditExp = () => {
    setEditingExpId(null);
  };

  const handleSaveExp = async (expId: string) => {
    if (!profile) return;
    const updatedExperiences = (profile.experiences || []).map((e) => {
      if (e.id === expId) {
        return {
          ...e,
          role: expEditForm.role.trim(),
          company: expEditForm.company.trim(),
          startDate: expEditForm.startDate.trim(),
          endDate: expEditForm.current ? undefined : expEditForm.endDate.trim() || undefined,
          current: expEditForm.current,
          location: expEditForm.location.trim(),
          needsVerification: false,
          isDateUncertain: false,
        };
      }
      return e;
    });
    await onUpdateProfile({ experiences: updatedExperiences });
    setEditingExpId(null);
  };

  // Sync state if profile changes
  React.useEffect(() => {
    setFormData(profile);
  }, [profile]);

  if (!formData || !profile) {
    return <div className="text-slate-400 p-8 text-center text-sm">Loading verified profile...</div>;
  }

  const handleSave = async () => {
    await onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleParseSubmit = async () => {
    if (!resumeTextInput.trim()) return;
    await onParseResumeText(resumeTextInput);
    setShowUploadModal(false);
    setResumeTextInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Verified Master Career Profile</h1>
            <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ATS Source of Truth</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            This profile is the verified foundation for all tailored resumes. ApplyVise AI never hallucinates credentials outside this record.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 rounded-xl border border-indigo-700/80 bg-indigo-950/40 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition"
          >
            <Upload className="h-4 w-4" />
            <span>Upload / Parse Resume</span>
          </button>

          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal, Contact & Work Authorization */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-lg text-white shadow-md">
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{profile.fullName}</h2>
                <p className="text-xs text-indigo-400 font-medium">{profile.currentTitle}</p>
                <p className="text-[11px] text-slate-400">{profile.currentEmployer} · {profile.location}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center text-slate-400"><Mail className="h-3.5 w-3.5 mr-2" /> Email</span>
                <span className="font-mono">{profile.email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center text-slate-400"><Phone className="h-3.5 w-3.5 mr-2" /> Phone</span>
                <span className="font-mono">{profile.phone}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center text-slate-400"><MapPin className="h-3.5 w-3.5 mr-2" /> Location</span>
                <span>{profile.location}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center text-slate-400"><Briefcase className="h-3.5 w-3.5 mr-2" /> Total Exp</span>
                <span className="font-semibold text-white">{profile.totalExperienceYears} Years</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Notice Period</span>
                <span>{profile.noticePeriodDays} Days</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Earliest Start</span>
                <span>{profile.earliestJoinDate}</span>
              </div>
            </div>

            {/* Work Authorization Notice */}
            <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-3 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Work Authorization</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {profile.workAuthorizationStatus} ({profile.workAuthorizationCountry})
              </p>
            </div>

            {/* Links */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Online Profiles</div>
              <div className="flex flex-col space-y-1">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span>LinkedIn Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span>GitHub Portfolio</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span>Personal Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Education & Certifications */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-1.5">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              <span>Education & Credentials</span>
            </h3>

            <div className="space-y-3">
              {profile.education.map(edu => (
                <div key={edu.id} className="text-xs border-l-2 border-indigo-500 pl-3 space-y-0.5">
                  <div className="font-semibold text-slate-100">{edu.degree}</div>
                  <div className="text-slate-400">{edu.institution} · Class of {edu.graduationYear}</div>
                  {edu.gpa && <div className="text-[11px] text-indigo-400/90 font-mono">GPA: {edu.gpa}</div>}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <Award className="h-4 w-4 text-amber-400" />
                <span>Certifications</span>
              </div>
              <div className="space-y-2">
                {profile.certifications.map(cert => (
                  <div key={cert.id} className="text-xs p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                    <div className="font-medium text-slate-200">{cert.name}</div>
                    <div className="text-[11px] text-slate-400">{cert.issuingOrg} · {cert.issueYear}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2 spans): Summary, Verified Skills & Experiences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Executive Summary</h3>
              {profile.masterResumeFileName && (
                <span className="text-[11px] text-slate-400 font-mono flex items-center">
                  <FileText className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  {profile.masterResumeFileName}
                </span>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={formData.professionalSummary}
                onChange={e => setFormData({ ...formData, professionalSummary: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-xs text-white leading-relaxed focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {profile.professionalSummary}
              </p>
            )}
          </div>

          {/* Verified Skills Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Verified Skills Inventory</h3>
                <p className="text-xs text-slate-400">Skills categorized with verified experience depth</p>
              </div>
              <span className="text-xs text-indigo-400 font-mono">{profile.skills.length} Skills</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {profile.skills.map((skill, index) => {
                const badgeColor =
                  skill.proficiency === 'expert'
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60 font-semibold'
                    : 'bg-slate-950/50 text-slate-300 border-slate-800';

                return (
                  <span
                    key={index}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs border ${badgeColor}`}
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>{skill.name}</span>
                    <span className="text-[10px] text-slate-400">({skill.yearsExperience}y)</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Verified Work Experiences */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Verified Career History</h3>
                <p className="text-xs text-slate-400">All achievements and employment periods are fact-verified</p>
              </div>
            </div>

            <div className="space-y-4">
              {profile.experiences.map((exp) => {
                const isEditingThisExp = editingExpId === exp.id;
                const formattedPeriod = formatExperiencePeriod(exp.startDate, exp.endDate, exp.current);

                if (isEditingThisExp) {
                  return (
                    <div
                      key={exp.id}
                      className="rounded-xl border border-indigo-500/50 bg-slate-900/90 p-4 space-y-3.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Edit Employment History & Verified Dates
                        </span>
                        <button
                          onClick={handleCancelEditExp}
                          className="text-slate-400 hover:text-white text-xs p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Job Title</label>
                          <input
                            type="text"
                            value={expEditForm.role}
                            onChange={(e) => setExpEditForm({ ...expEditForm, role: e.target.value })}
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                            placeholder="e.g. Senior Process Associate"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Company Name</label>
                          <input
                            type="text"
                            value={expEditForm.company}
                            onChange={(e) => setExpEditForm({ ...expEditForm, company: e.target.value })}
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                            placeholder="e.g. Tata Consultancy Services"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Date</label>
                          <input
                            type="text"
                            value={expEditForm.startDate}
                            onChange={(e) => setExpEditForm({ ...expEditForm, startDate: e.target.value })}
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-hidden"
                            placeholder="e.g. Sep 2024 or 2024-09"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-300">End Date</label>
                            <label className="inline-flex items-center space-x-1.5 text-[11px] text-indigo-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={expEditForm.current}
                                onChange={(e) =>
                                  setExpEditForm({ ...expEditForm, current: e.target.checked, endDate: e.target.checked ? '' : expEditForm.endDate })
                                }
                                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                              />
                              <span>Currently working here</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            disabled={expEditForm.current}
                            value={expEditForm.current ? 'Present' : expEditForm.endDate}
                            onChange={(e) => setExpEditForm({ ...expEditForm, endDate: e.target.value })}
                            className={`w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-hidden ${
                              expEditForm.current ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            placeholder="e.g. Aug 2024 or 2024-08"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={handleCancelEditExp}
                          className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveExp(exp.id!)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs flex items-center space-x-1 transition"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Save & Confirm</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={exp.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2.5 transition hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">{exp.role}</h4>
                          <button
                            onClick={() => handleStartEditExp(exp)}
                            className="p-1 text-slate-400 hover:text-indigo-300 rounded transition"
                            title="Edit Role & Dates"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-indigo-300 font-medium">
                          {exp.company} {exp.location ? <><span className="text-slate-500">·</span> {exp.location}</> : null}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 self-start sm:self-auto">
                        <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {formattedPeriod || 'Dates not specified'}
                        </span>
                      </div>
                    </div>

                    {(exp.needsVerification || exp.isDateUncertain) && (
                      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-amber-300">
                        <div className="flex items-center space-x-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>Employment dates need verification to prevent ATS filtering.</span>
                        </div>
                        <button
                          onClick={() => handleStartEditExp(exp)}
                          className="text-[11px] font-semibold text-amber-200 underline hover:text-white shrink-0 ml-2"
                        >
                          Confirm Dates
                        </button>
                      </div>
                    )}

                    {exp.description && (
                      <p className="text-xs text-slate-400 leading-relaxed">{exp.description}</p>
                    )}

                    {(exp.achievements || []).length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Verified Achievements
                        </div>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {exp.achievements!.map((ach, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-indigo-400 font-bold">›</span>
                              <span className="leading-relaxed">{ach}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(exp.verifiedSkillsUsed || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
                        {exp.verifiedSkillsUsed!.map((sk, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Resume Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Parse Resume with Gemini AI</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Paste your raw resume text (from PDF or DOCX) below. ApplyVise AI's Resume Intelligence Engine will automatically extract your contact info, total experience, skills, education, certifications, and verified achievements.
            </p>

            <textarea
              value={resumeTextInput}
              onChange={e => setResumeTextInput(e.target.value)}
              placeholder="Paste master resume text here (e.g. Experience, Education, Skills)..."
              rows={10}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Min 50 characters · Zero hallucination parsing
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseSubmit}
                  disabled={isParsingResume || resumeTextInput.trim().length < 50}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isParsingResume ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Parsing with Gemini...</span>
                    </>
                  ) : (
                    <span>Analyze & Update Profile</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ProfilePhotoCropModal
        isOpen={cropModalOpen}
        imageFile={selectedFileForCrop}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
        onSaveCroppedImage={async (croppedDataUrl) => {
          if (profile?.id && typeof localStorage !== "undefined") {
            localStorage.setItem(`applyvise_user_photo_${profile.id}`, croppedDataUrl);
          }
          await onUpdateProfile({ photoUrl: croppedDataUrl });
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
      />
    </div>
  );
};
