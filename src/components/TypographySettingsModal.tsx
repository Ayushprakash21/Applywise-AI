// src/components/TypographySettingsModal.tsx
// Global Typography & Font Management System Modal for ApplyVise AI

import React, { useState, useEffect } from 'react';
import { Type, Check, RefreshCw, X, Sparkles, Sliders } from 'lucide-react';
import {
  FontFamilyId,
  FontProfile,
  getAllFontProfiles,
  getFontProfile,
  getSavedFontFamily,
  applyGlobalFontFamily,
  getSemanticTypographyStyle,
  DEFAULT_FONT_FAMILY,
} from '../utils/typographySystem.ts';

interface TypographySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBlack?: boolean;
}

export const TypographySettingsModal: React.FC<TypographySettingsModalProps> = ({
  isOpen,
  onClose,
  isBlack = true,
}) => {
  const [selectedFont, setSelectedFont] = useState<FontFamilyId>(() => getSavedFontFamily());
  const [previewProfile, setPreviewProfile] = useState<FontProfile>(() => getFontProfile(getSavedFontFamily()));
  const [applied, setApplied] = useState(false);

  const allProfiles = getAllFontProfiles();

  useEffect(() => {
    if (isOpen) {
      const current = getSavedFontFamily();
      setSelectedFont(current);
      setPreviewProfile(getFontProfile(current));
      setApplied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const profile = getFontProfile(selectedFont);
    setPreviewProfile(profile);
  }, [selectedFont]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectFont = (id: FontFamilyId) => {
    setSelectedFont(id);
    const profile = applyGlobalFontFamily(id);
    setPreviewProfile(profile);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleResetDefault = () => {
    setSelectedFont(DEFAULT_FONT_FAMILY);
    const profile = applyGlobalFontFamily(DEFAULT_FONT_FAMILY);
    setPreviewProfile(profile);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="typography-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto transition-colors ${
          isBlack
            ? 'bg-[#111318] border-[rgba(255,255,255,0.12)] text-[#F2F0EA]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`p-5 sm:p-6 pb-4 border-b flex items-center justify-between shrink-0 ${
            isBlack
              ? 'bg-[#14171C] border-[rgba(255,255,255,0.08)]'
              : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.3)]'
                  : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}
            >
              <Type className="h-5 w-5" />
            </div>
            <div>
              <h2 id="typography-modal-title" className="text-base font-bold tracking-tight">
                Global Typography & Appearance
              </h2>
              <p className={`text-xs ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>
                10 curated font families with intelligent weight clamping and automatic tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                isBlack
                  ? 'bg-[#191D23] hover:bg-[#222730] text-[#C0BDB5] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.1)]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Reset to default Poppins font"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset to Default</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`h-8 w-8 rounded-xl flex items-center justify-center transition cursor-pointer border ${
                isBlack
                  ? 'bg-[#191D23] hover:bg-[#222730] text-[#92949A] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.1)]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border-slate-200'
              }`}
              aria-label="Close typography modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Real-time Interactive Typography Preview Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isBlack
                ? 'bg-[#161920] border-[rgba(198,166,106,0.3)] shadow-lg'
                : 'bg-slate-50 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#C6A66A]" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#C6A66A]">
                  Active Preview — {previewProfile.name}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isBlack
                      ? 'bg-[#1F242D] text-[#92949A]'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {previewProfile.category}
                </span>
              </div>
              <span className={`text-[11px] ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>
                Weights: {previewProfile.supportedWeights.join(', ')}
              </span>
            </div>

            {/* Specimen Showcase */}
            <div className="space-y-4">
              {/* Hero Heading Specimen */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                  Hero Heading (Role: heroHeading)
                </span>
                <h1
                  style={getSemanticTypographyStyle('heroHeading', previewProfile)}
                  className={`text-2xl sm:text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}
                >
                  Career Intelligence Redefined
                </h1>
              </div>

              {/* Section Heading Specimen */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                  Section Heading (Role: sectionHeading)
                </span>
                <h2
                  style={getSemanticTypographyStyle('sectionHeading', previewProfile)}
                  className={`text-lg sm:text-xl font-bold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-800'}`}
                >
                  Verified Executive Opportunities & Precision Fact Engine
                </h2>
              </div>

              {/* Body Copy Specimen */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                  Body Copy (Role: body)
                </span>
                <p
                  style={getSemanticTypographyStyle('body', previewProfile)}
                  className={`text-xs sm:text-sm leading-relaxed ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-600'}`}
                >
                  ApplyVise AI pairs algorithmic candidate fact-verification with continuous discovery across global job repositories. Tailored materials preserve candidate truth without hallucinated credentials.
                </p>
              </div>

              {/* Interactive Elements Specimen: Button, Nav, KPI, Badge */}
              <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                {/* Button Specimen */}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                    Action Button
                  </span>
                  <button
                    type="button"
                    style={getSemanticTypographyStyle('button', previewProfile)}
                    className="w-full h-9 px-3 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] text-xs font-bold shadow-sm transition flex items-center justify-center cursor-default"
                  >
                    Apply with Autopilot
                  </button>
                </div>

                {/* Nav Link Specimen */}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                    Nav Link
                  </span>
                  <div
                    style={getSemanticTypographyStyle('nav', previewProfile)}
                    className={`h-9 px-3 rounded-xl flex items-center space-x-2 text-xs font-medium border ${
                      isBlack
                        ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-[#F2F0EA]'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C6A66A]" />
                    <span>Career Desk</span>
                  </div>
                </div>

                {/* KPI Specimen */}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                    KPI Metric
                  </span>
                  <div
                    style={getSemanticTypographyStyle('kpi', previewProfile)}
                    className="text-lg font-extrabold text-[#C6A66A]"
                  >
                    $142,500 / yr
                  </div>
                </div>

                {/* Badge Specimen */}
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#92949A] block mb-1">
                    Status Badge
                  </span>
                  <span
                    style={getSemanticTypographyStyle('badge', previewProfile)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[rgba(53,184,135,0.15)] border border-[rgba(53,184,135,0.3)] text-[#35B887] text-[10px] font-mono"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#35B887] animate-pulse" />
                    <span>ACTIVE SAFE</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 10 Selectable Font Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#92949A]">
                Selectable Font Families ({allProfiles.length})
              </h3>
              {applied && (
                <span className="text-xs text-[#35B887] flex items-center space-x-1 font-semibold animate-in fade-in">
                  <Check className="h-3.5 w-3.5" />
                  <span>Applied Globally</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {allProfiles.map((p) => {
                const isSelected = selectedFont === p.id;
                const isDefault = p.id === DEFAULT_FONT_FAMILY;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectFont(p.id)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative ${
                      isSelected
                        ? isBlack
                          ? 'bg-[#1A1F29] border-[#C6A66A] ring-1 ring-[#C6A66A]/40 shadow-md'
                          : 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/30'
                        : isBlack
                          ? 'bg-[#14171C] hover:bg-[#181D25] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Top Row: Font Name & Check */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-base font-bold ${
                            isSelected
                              ? 'text-[#C6A66A]'
                              : isBlack
                                ? 'text-[#F2F0EA]'
                                : 'text-slate-900'
                          }`}
                          style={{ fontFamily: `${p.family}, ${p.fallback}` }}
                        >
                          {p.name}
                        </span>
                        {isDefault && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[rgba(198,166,106,0.2)] text-[#C6A66A] border border-[rgba(198,166,106,0.3)]">
                            DEFAULT
                          </span>
                        )}
                        {p.isDisplayOnly && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            DISPLAY 400
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-[#C6A66A] text-[#17130C] flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Category & Description */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-mono ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>
                          {p.category}
                        </span>
                        <span className="text-[#92949A] text-[10px]">•</span>
                        <span className={`text-[10px] ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>
                          Weights: {p.supportedWeights.join(', ')}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-600'}`}>
                        {p.description}
                      </p>
                    </div>

                    {/* Live Sentence Sample in Font */}
                    <div
                      className={`mt-2.5 pt-2 border-t text-xs truncate ${
                        isBlack
                          ? 'border-[rgba(255,255,255,0.06)] text-[#F2F0EA]'
                          : 'border-slate-100 text-slate-800'
                      }`}
                      style={{
                        fontFamily: `${p.family}, ${p.fallback}`,
                        letterSpacing: p.trackingAdjustments.body,
                      }}
                    >
                      The quick brown fox jumps over the lazy dog.
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex items-center justify-between shrink-0 ${
            isBlack
              ? 'bg-[#14171C] border-[rgba(255,255,255,0.08)]'
              : 'bg-slate-50 border-slate-100'
          }`}
        >
          <div className="flex items-center space-x-2 text-xs text-[#92949A]">
            <Sliders className="h-4 w-4 text-[#C6A66A]" />
            <span>Applied persistently across all views. Resume DOCX exports remain isolated.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
