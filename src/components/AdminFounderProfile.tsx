// src/components/AdminFounderProfile.tsx
// Comprehensive Founder Profile & Photograph Management Module for ApplyVise AI Admin Console

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Linkedin,
  Quote,
  Save,
  Send,
  RotateCcw,
  Plus,
  X,
  Image as ImageIcon,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.ts';
import { FounderProfile } from '../types/index.ts';
import { DEFAULT_FOUNDER_PROFILE } from '../data/defaultFounderProfile.ts';
import { FounderSection } from './FounderSection.tsx';

interface AdminFounderProfileProps {
  onNotify?: (message: string) => void;
}

export const AdminFounderProfile: React.FC<AdminFounderProfileProps> = ({ onNotify }) => {
  const [profile, setProfile] = useState<FounderProfile>(DEFAULT_FOUNDER_PROFILE);
  const [publishedProfile, setPublishedProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New tag input
  const [newTagInput, setNewTagInput] = useState('');

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
      if (onNotify) onNotify(msg);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4500);
  };

  const loadFounderData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFounderProfile();
      if (res && res.draft) {
        setProfile(res.draft);
        if (res.published) {
          setPublishedProfile(res.published);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load founder profile: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFounderData();
  }, []);

  // Form field update helper
  const updateField = <K extends keyof FounderProfile>(key: K, value: FounderProfile[K]) => {
    setProfile(prev => ({
      ...prev,
      [key]: value,
      isPublished: false // Any change marks draft as having unpublished changes
    }));
  };

  // Bio paragraph update helper
  const updateBioParagraph = (index: number, text: string) => {
    const updated = [...(profile.bioParagraphs || [])];
    updated[index] = text;
    updateField('bioParagraphs', updated);
  };

  // Expertise tag helpers
  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || newTagInput).trim();
    if (!tag) return;
    const currentTags = profile.expertiseTags || [];
    if (currentTags.includes(tag)) {
      showToast(`Tag "${tag}" already exists.`, true);
      return;
    }
    updateField('expertiseTags', [...currentTags, tag]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = profile.expertiseTags || [];
    updateField('expertiseTags', currentTags.filter(t => t !== tagToRemove));
  };

  // Photo upload handler
  const handlePhotoFile = async (file: File) => {
    // Client-side validations
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Unsupported format. Please upload JPG, PNG, or WebP.', true);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      showToast('Photograph exceeds maximum size of 5 MB.', true);
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(25);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 100);

      const res = await api.uploadFounderPhoto(file);
      clearInterval(progressTimer);
      setUploadProgress(100);

      // Update state with new photo URL
      setProfile(prev => ({
        ...prev,
        photoUrl: res.photoUrl,
        photoAssetId: res.assetId,
        isPublished: false
      }));

      showToast('Photograph uploaded successfully to draft!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Photo upload failed: ${msg}`, true);
    } finally {
      setTimeout(() => {
        setUploadingPhoto(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Photo remove handler
  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove the founder photograph? The profile will revert to the AP monogram mark.')) {
      return;
    }

    try {
      await api.removeFounderPhoto();
      setProfile(prev => ({
        ...prev,
        photoUrl: null,
        photoAssetId: null,
        isPublished: false
      }));
      showToast('Photograph removed. AP monogram will be displayed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to remove photo: ${msg}`, true);
    }
  };

  // Drag and drop event listeners
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await api.updateFounderProfileDraft(profile);
      if (res && res.draft) {
        setProfile(res.draft);
      }
      showToast('Draft changes saved successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to save draft: ${msg}`, true);
    } finally {
      setSaving(false);
    }
  };

  // Publish Changes
  const handlePublish = async () => {
    if (!window.confirm('Publish these changes to the live ApplyVise AI website?')) {
      return;
    }

    setPublishing(true);
    try {
      // First ensure current form draft is saved
      await api.updateFounderProfileDraft(profile);
      // Then publish
      const res = await api.publishFounderProfile();
      if (res && res.profile) {
        setProfile(res.profile);
        setPublishedProfile(res.profile);
      }
      showToast('Founder profile published successfully! Public website is now updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Publishing failed: ${msg}`, true);
    } finally {
      setPublishing(false);
    }
  };

  // Revert to Last Published
  const handleRevert = async () => {
    if (!window.confirm('Revert all draft changes? Any unsaved or unpublished modifications will be discarded.')) {
      return;
    }

    setReverting(true);
    try {
      const res = await api.revertFounderProfileDraft();
      if (res && res.draft) {
        setProfile(res.draft);
        setPublishedProfile(res.draft);
      }
      showToast('Reverted to last published version.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Revert failed: ${msg}`, true);
    } finally {
      setReverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Founder Profile Management...</p>
      </div>
    );
  }

  const isPublishedLive = profile.isPublished;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Website Management</span>
            <span>&rarr;</span>
            <span className="text-indigo-600 font-bold">Founder Profile</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Founder Profile & Photograph Management</span>
            {isPublishedLive ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Published Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                <span>Unpublished Draft</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your verified founder biography, credentials, quotation, and high-resolution photograph across the public landing page and about page.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition ${
              previewOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-indigo-600" />
            <span>{previewOpen ? 'Hide Preview' : 'Live Preview'}</span>
          </button>

          <button
            onClick={handleRevert}
            disabled={reverting || saving || publishing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Discard current draft and restore last published version"
          >
            <RotateCcw className={`h-3.5 w-3.5 text-slate-500 ${reverting ? 'animate-spin' : ''}`} />
            <span>Revert</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 text-slate-200 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing || saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
          >
            <Send className={`h-3.5 w-3.5 text-white ${publishing ? 'animate-spin' : ''}`} />
            <span>{publishing ? 'Publishing...' : 'Publish to Live'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Live Preview Drawer / Accordion */}
      {previewOpen && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Live Website Preview (Interactive)</span>
              <span className="text-xs text-slate-400 font-mono">
                {previewTheme === 'dark' ? 'Dark Mode (About Page)' : 'Light Mode (Landing Page)'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition"
              >
                {previewTheme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Switch to Light Theme</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Switch to Dark Theme</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-slate-950 p-2 border border-slate-800/80">
            <FounderSection
              theme={previewTheme}
              initialProfile={profile}
              className="py-10 md:py-16"
            />
          </div>
        </div>
      )}

      {/* Main Grid: Left Column Photograph Management | Right Column Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Photograph Management */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Profile Photograph</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                Aspect: 1:1 Square
              </span>
            </div>

            {/* Current Photo Preview Card */}
            <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
              <div className="relative group">
                <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
                  {profile.photoUrl ? (
                    <div className="w-full h-full rounded-[14px] bg-slate-950 overflow-hidden relative">
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                      <div className="absolute inset-0 border border-white/20 rounded-[14px] pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center text-white relative">
                      <span className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-100 to-blue-300">
                        AP
                      </span>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-400 mt-2 font-semibold">
                        Founder & Architect
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {profile.photoUrl ? 'Active Photograph' : 'Default Monogram Placeholder'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {profile.photoUrl
                    ? 'Uploaded photo is linked to draft profile'
                    : 'No photograph uploaded yet. The AP monogram is shown.'}
                </p>
              </div>

              {profile.photoUrl && (
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs flex items-center space-x-1.5 transition"
                  >
                    <Upload className="h-3 w-3 text-slate-500" />
                    <span>Replace Photo</span>
                  </button>

                  <button
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center space-x-1.5 transition"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                    <span>Remove Photo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drag and Drop Upload Area */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoFile(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Upload className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Click to browse or drag and drop photograph
                </p>
                <p className="text-[11px] text-slate-500">
                  Supports JPG, JPEG, PNG, and WebP (Max 5 MB)
                </p>
              </div>

              <div className="inline-flex items-center space-x-1.5 text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-md">
                <ShieldCheck className="h-3 w-3" />
                <span>Zero loss, responsive 1:1 presentation</span>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploadingPhoto && (
              <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="flex justify-between text-xs text-indigo-900 font-semibold">
                  <span>Uploading photograph...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-indigo-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Founder Information Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Founder Details & Identity</h3>
              </div>
              <span className="text-[11px] text-slate-400">All fields fully customizable</span>
            </div>

            {/* Core Identity Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Ayush Prakash"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Brand Name
                </label>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. ApplyVise AI"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.designation}
                  onChange={e => updateField('designation', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Founder & Product Architect, ApplyVise AI"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtitle & Credentials
                </label>
                <input
                  type="text"
                  value={profile.subtitle || ''}
                  onChange={e => updateField('subtitle', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. MBA (Marketing & IT) • Project Management • AI Enthusiast"
                />
              </div>
            </div>

            {/* Three Bio Paragraphs */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Professional Biography (3 Paragraphs)
              </label>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-500">Paragraph 1 — Background & Focus</span>
                  <textarea
                    rows={3}
                    value={profile.bioParagraphs?.[0] || ''}
                    onChange={e => updateBioParagraph(0, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500">Paragraph 2 — Multi-Disciplinary Rigor</span>
                  <textarea
                    rows={3}
                    value={profile.bioParagraphs?.[1] || ''}
                    onChange={e => updateBioParagraph(1, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500">Paragraph 3 — ApplyVise AI Vision & Mission</span>
                  <textarea
                    rows={3}
                    value={profile.bioParagraphs?.[2] || ''}
                    onChange={e => updateBioParagraph(2, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Quotation & Attribution */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                <Quote className="h-3.5 w-3.5 text-indigo-600" />
                <span>Founder Personal Quotation</span>
              </div>
              <textarea
                rows={3}
                value={profile.quote}
                onChange={e => updateField('quote', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 italic"
                placeholder="Quote text..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Quotation Attribution
                  </label>
                  <input
                    type="text"
                    value={profile.quoteAuthor || ''}
                    onChange={e => updateField('quoteAuthor', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Ayush Prakash"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Founder Story URL
                  </label>
                  <input
                    type="text"
                    value={profile.storyUrl || '/about'}
                    onChange={e => updateField('storyUrl', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. /about"
                  />
                </div>
              </div>
            </div>

            {/* Expertise Tags Editor */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Key Areas of Expertise (Tags)
              </label>

              <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {(profile.expertiseTags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs shadow-xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                <div className="inline-flex items-center space-x-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag..."
                    className="px-2 py-1 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Quick Suggestion Pills */}
              <div className="flex items-center space-x-1 text-[11px] text-slate-500 pt-1">
                <span>Quick add:</span>
                {['Supply Chain & Operations', 'Digital Product Strategy', 'Applied AI Workflows', 'SaaS Architecture'].map(
                  (suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddTag(suggestion)}
                      className="text-indigo-600 hover:underline hover:text-indigo-800"
                    >
                      +{suggestion}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Verified LinkedIn URL */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                <span>Verified LinkedIn Profile URL</span>
              </label>
              <input
                type="url"
                value={profile.linkedinUrl}
                onChange={e => updateField('linkedinUrl', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                placeholder="https://www.linkedin.com/in/ayushprakash21/"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Public visitors clicking "Connect on LinkedIn" are directed to this verified link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
