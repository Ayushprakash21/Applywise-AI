import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { getAvailableLanguagesList } from '../utils/languageCatalogue.ts';
import { LanguageCatalogEntry } from '../types/localization.ts';

export interface HeaderLanguageSelectorProps {
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

export const HeaderLanguageSelector: React.FC<HeaderLanguageSelectorProps> = ({
  plan = 'black',
  className = '',
}) => {
  const { currentLocale, setLocale, metadata, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // All 30 supported languages from the central catalogue
  const allLanguages = useMemo(() => getAvailableLanguagesList(), []);

  // Filtered by search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return allLanguages;
    const q = searchQuery.toLowerCase().trim();
    return allLanguages.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(q) ||
        l.englishName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.scriptFamily.toLowerCase().includes(q)
    );
  }, [allLanguages, searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      // Auto-focus search input when opened
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectLanguage = async (code: string) => {
    await setLocale(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isBlack = plan === 'black';

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Header Trigger Button: Compact 40px height matching Active Safe & Notification bell */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Current language: ${metadata.nativeName}. Click to select from 30 languages.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`h-10 px-2.5 sm:px-3 rounded-xl border flex items-center space-x-1.5 sm:space-x-2 text-xs font-medium transition-all duration-200 cursor-pointer select-none shadow-2xs ${
          isBlack
            ? 'bg-[var(--be-bg-input,#101318)] hover:bg-[var(--be-hover-bg,#141820)] border-[var(--be-border-subtle,rgba(255,255,255,0.08))] hover:border-[var(--be-border-focus,rgba(198,166,106,0.30))] text-[var(--be-text-primary,#F2F0EA)]'
            : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:text-slate-900 shadow-2xs'
        }`}
        style={{
          backgroundColor: 'var(--be-bg-input, var(--surface-input))',
          borderColor: isOpen ? 'var(--be-accent, var(--accent-primary))' : 'var(--be-border-subtle, var(--border-subtle))',
          color: 'var(--be-text-primary, var(--text-primary))',
        }}
      >
        <Globe
          className="h-4 w-4 shrink-0 transition-colors"
          style={{ color: 'var(--be-accent, #C6A66A)' }}
        />
        <span className="hidden sm:inline font-semibold max-w-[90px] truncate text-left">
          {metadata.nativeName}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ color: 'var(--be-text-muted, currentColor)' }}
        />
      </button>

      {/* Compact Anchored Popover / Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available platform languages"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1"
          style={{
            backgroundColor: 'var(--be-bg-card, #FFFFFF)',
            borderColor: 'var(--be-border-focus, var(--be-border-subtle, rgba(0,0,0,0.12)))',
            color: 'var(--be-text-primary, #20242B)',
            boxShadow: 'var(--be-shadow-elevated, 0 16px 40px -8px rgba(0, 0, 0, 0.4))',
          }}
        >
          {/* Search Header */}
          <div
            className="p-2.5 border-b"
            style={{
              backgroundColor: 'var(--be-bg-elevated, rgba(0,0,0,0.02))',
              borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
            }}
          >
            <div className="relative flex items-center">
              <Search
                className="absolute left-3 h-3.5 w-3.5 pointer-events-none"
                style={{ color: 'var(--be-text-muted, #707782)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('language.search_placeholder') || 'Search 30 languages...'}
                className="w-full h-8 pl-8 pr-7 rounded-lg text-xs font-medium border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--be-bg-input, #FFFFFF)',
                  borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.12))',
                  color: 'var(--be-text-primary, #20242B)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 p-0.5 rounded hover:opacity-75 cursor-pointer"
                  style={{ color: 'var(--be-text-muted, #707782)' }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Language List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredLanguages.length === 0 ? (
              <div
                className="py-6 text-center text-xs"
                style={{ color: 'var(--be-text-muted, #707782)' }}
              >
                No matching languages found
              </div>
            ) : (
              filteredLanguages.map((lang: LanguageCatalogEntry) => {
                const isSelected = lang.code === currentLocale;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group text-xs select-none"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--be-nav-active-bg, rgba(198,166,106,0.14))'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--be-accent, #C6A66A)'
                        : 'var(--be-text-primary, #20242B)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--be-hover-bg, rgba(0,0,0,0.05))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 border"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--be-accent, #C6A66A)'
                            : 'var(--be-bg-elevated, rgba(0,0,0,0.04))',
                          borderColor: isSelected
                            ? 'var(--be-accent, #C6A66A)'
                            : 'var(--be-border-subtle, rgba(0,0,0,0.08))',
                          color: isSelected
                            ? 'var(--be-accent-contrast, #000000)'
                            : 'var(--be-text-secondary, #555C66)',
                        }}
                      >
                        {lang.iso639_1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-xs truncate">
                            {lang.nativeName}
                          </span>
                          {lang.direction === 'rtl' && (
                            <span
                              className="px-1 py-0.2 rounded text-[9px] font-mono border"
                              style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                borderColor: 'rgba(168, 85, 247, 0.3)',
                                color: '#A855F7',
                              }}
                            >
                              RTL
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[10px] truncate"
                          style={{ color: 'var(--be-text-muted, #707782)' }}
                        >
                          {lang.englishName}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        className="h-4 w-4 shrink-0 stroke-[2.5]"
                        style={{ color: 'var(--be-accent, #C6A66A)' }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div
            className="px-3 py-2 border-t flex items-center justify-between text-[10px]"
            style={{
              backgroundColor: 'var(--be-bg-elevated, rgba(0,0,0,0.02))',
              borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
              color: 'var(--be-text-muted, #707782)',
            }}
          >
            <span>{allLanguages.length} Languages Supported</span>
            <span>Self-Hosted Translation Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};
