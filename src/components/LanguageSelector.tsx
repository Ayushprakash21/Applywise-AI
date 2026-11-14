import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Check,
  Sparkles,
  AlertCircle,
  X,
  ChevronRight,
  Cpu
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  LANGUAGE_CATALOGUE,
  getAvailableLanguagesList,
  getPublishedLanguagesList,
} from '../utils/languageCatalogue.ts';
import { LanguageCatalogEntry } from '../types/localization.ts';

export interface LanguageSelectorProps {
  variant?: 'dropdown' | 'modal' | 'pill' | 'compact';
  isBlack?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  isBlack = true,
  isOpen = false,
  onClose,
  className = '',
}) => {
  const { currentLocale, setLocale, metadata, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'published'>('all');

  const languages = useMemo(() => {
    const list = filterMode === 'published' ? getPublishedLanguagesList() : getAvailableLanguagesList();
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(query) ||
        l.englishName.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query) ||
        l.scriptFamily.toLowerCase().includes(query)
    );
  }, [searchQuery, filterMode]);

  const handleSelect = async (code: string) => {
    await setLocale(code);
    if (onClose) onClose();
  };

  // Compact / Pill view (trigger button)
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClose}
        className={`h-8 px-2.5 rounded-xl border flex items-center space-x-1.5 text-xs font-medium transition cursor-pointer select-none ${
          isBlack
            ? 'bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.12)]'
            : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
        } ${className}`}
        title="Change application language"
      >
        <Globe className="h-3.5 w-3.5 text-[#C6A66A]" />
        <span className="font-semibold">{metadata.nativeName}</span>
      </button>
    );
  }

  // Modal variant (e.g. for Onboarding or Navigation Bar)
  if (variant === 'modal') {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
        <div
          className={`w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isBlack
              ? 'bg-[#14171C] border-[rgba(255,255,255,0.14)] text-[#F2F0EA]'
              : 'bg-white border-slate-200 text-slate-900'
          } ${className}`}
          style={
            isBlack
              ? {
                  backgroundColor: 'var(--be-bg-card, #14171C)',
                  borderColor: 'var(--be-border-subtle, rgba(255,255,255,0.14))',
                }
              : undefined
          }
        >
          {/* Header */}
          <div className="p-5 border-b border-inherit flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Globe className="h-5 w-5 text-[#C6A66A]" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">
                  {t('language.select_title')}
                </h3>
                <p className="text-xs text-[#92949A] mt-0.5">
                  {t('language.switch_notice')}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#92949A] hover:text-[#F2F0EA] hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-inherit bg-black/10">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-[#92949A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('language.search_placeholder')}
                className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs font-medium border focus:outline-none transition ${
                  isBlack
                    ? 'bg-[#191D23] border-[rgba(255,255,255,0.12)] text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                }`}
                autoFocus
              />
            </div>
          </div>

          {/* Languages Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
            {languages.map((lang) => {
              const isSelected = lang.code === currentLocale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between border transition-all cursor-pointer group select-none text-left ${
                    isSelected
                      ? isBlack
                        ? 'bg-[#1E232B] border-[rgba(198,166,106,0.50)] ring-1 ring-[rgba(198,166,106,0.30)]'
                        : 'bg-blue-50/80 border-blue-500/40 ring-1 ring-blue-500/20'
                      : isBlack
                      ? 'bg-[#191D23]/60 hover:bg-[#1E232B] border-transparent hover:border-[rgba(255,255,255,0.08)]'
                      : 'bg-slate-50/60 hover:bg-slate-100 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase font-mono border ${
                        isSelected
                          ? 'bg-[#C6A66A] text-black border-[#C6A66A]'
                          : isBlack
                          ? 'bg-[#111318] text-[#C0BDB5] border-[rgba(255,255,255,0.08)]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {lang.iso639_1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm tracking-tight truncate">
                          {lang.nativeName}
                        </span>
                        {lang.direction === 'rtl' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            RTL
                          </span>
                        )}
                        {lang.uiCompleteness < 90 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {lang.uiCompleteness}% UI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#92949A] truncate mt-0.5">
                        {lang.englishName} · {lang.scriptFamily} Script
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#C6A66A] flex items-center justify-center text-black">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#737780] group-hover:text-[#F2F0EA] transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-inherit bg-black/15 flex items-center justify-between text-[11px] text-[#92949A]">
            <div className="flex items-center space-x-1.5">
              <Cpu className="h-3.5 w-3.5 text-[#35B887]" />
              <span>{t('language.machine_translation')}</span>
            </div>
            <span>30 Planned World Languages</span>
          </div>
        </div>
      </div>
    );
  }

  // Dropdown / Account Menu Section Variant
  return (
    <div
      className={`p-3 rounded-2xl border space-y-2.5 ${
        isBlack
          ? 'bg-[#111318] border-[rgba(255,255,255,0.08)]'
          : 'bg-slate-50 border-slate-200/90'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-3.5 w-3.5 text-[#C6A66A]" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C6A66A]">
            Language & Locale
          </span>
        </div>
        <span className="text-[10px] font-medium text-[#92949A]">
          {metadata.nativeName}
        </span>
      </div>

      {/* Quick Select Buttons for popular languages */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { code: 'en-US', label: 'English' },
          { code: 'hi-IN', label: 'हिन्दी' },
          { code: 'es-ES', label: 'Español' },
          { code: 'ar-SA', label: 'العربية' },
          { code: 'fr-FR', label: 'Français' },
          { code: 'ja-JP', label: '日本語' },
        ].map((item) => {
          const isSelected = currentLocale === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item.code)}
              className={`h-7 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center transition border cursor-pointer ${
                isSelected
                  ? isBlack
                    ? 'bg-[#C6A66A]/20 text-[#C6A66A] border-[rgba(198,166,106,0.40)] font-semibold'
                    : 'bg-blue-100 text-blue-800 border-blue-300 font-semibold'
                  : isBlack
                  ? 'bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] border-transparent'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Button to open full 30-language picker */}
      <button
        type="button"
        onClick={onClose}
        className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-between transition border cursor-pointer ${
          isBlack
            ? 'bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.06)]'
            : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
        }`}
      >
        <span>All 30 World Languages...</span>
        <ChevronRight className="h-3 w-3 text-[#92949A]" />
      </button>
    </div>
  );
};
