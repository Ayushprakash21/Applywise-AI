import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Search,
  Check,
  X,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  searchLocations as searchLocalLocations,
  normalizeLocationToken,
} from '../../data/globalLocations.ts';
import { api } from '../../services/api.ts';
import type { StructuredLocation } from '../../types/index.ts';

export type SelectTheme = 'auto' | 'light' | 'dark' | 'black-elite';

export interface SelectOption<T = any> {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  keywords?: string;
  disabled?: boolean;
  meta?: T;
}

export interface PopoverPlacement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  direction: 'down' | 'up';
}

export function computePopoverPlacement(
  rect: { top: number; bottom: number; left: number; width: number },
  viewport: { width: number; height: number },
  preferredMaxHeight = 280,
  minWidth = 200
): PopoverPlacement {
  const gap = 6;
  const padding = 10;
  const width = Math.max(rect.width, Math.min(minWidth, viewport.width - padding * 2));
  const clampedLeft = Math.max(
    padding,
    Math.min(rect.left, viewport.width - width - padding)
  );

  const spaceBelow = Math.max(0, viewport.height - rect.bottom - gap - padding);
  const spaceAbove = Math.max(0, rect.top - gap - padding);

  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableSpace = openUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(preferredMaxHeight, availableSpace));
  const top = openUp
    ? Math.max(padding, rect.top - gap - maxHeight)
    : Math.min(viewport.height - maxHeight - padding, rect.bottom + gap);

  return {
    top,
    left: clampedLeft,
    width,
    maxHeight,
    direction: openUp ? 'up' : 'down',
  };
}

export function detectResolvedTheme(theme: SelectTheme = 'auto'): 'light' | 'dark' | 'black-elite' {
  if (theme !== 'auto') return theme;
  if (typeof document !== 'undefined') {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (
      htmlTheme === 'black' ||
      document.documentElement.classList.contains('theme-black') ||
      document.body.classList.contains('theme-black')
    ) {
      return 'black-elite';
    }
    if (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')) {
      return 'dark';
    }
  }
  return 'light';
}

function getThemeClasses(resolved: 'light' | 'dark' | 'black-elite') {
  if (resolved === 'black-elite') {
    return {
      trigger:
        'bg-[#0D1014] border border-[rgba(198,166,106,0.28)] text-[#F2F0EA] hover:border-[rgba(198,166,106,0.55)] focus-visible:border-[#C6A66A] focus-visible:ring-2 focus-visible:ring-[#C6A66A]/25 placeholder-[#737780]',
      triggerOpen: 'border-[#C6A66A] ring-2 ring-[#C6A66A]/25',
      menu:
        'bg-[#14171C] border border-[rgba(198,166,106,0.34)] text-[#F2F0EA] shadow-[0_18px_48px_rgba(0,0,0,0.72)]',
      searchBox:
        'bg-[#0D1014] border-b border-[rgba(255,255,255,0.08)] text-[#F2F0EA] placeholder-[#737780]',
      searchInput:
        'bg-[#191D23] border border-[rgba(198,166,106,0.25)] text-[#F2F0EA] placeholder-[#737780] focus:border-[#C6A66A]',
      optionDefault: 'text-[#E5E1D8] hover:bg-[rgba(198,166,106,0.10)]',
      optionHighlighted: 'bg-[rgba(198,166,106,0.14)] text-[#F2F0EA]',
      optionSelected: 'bg-[rgba(198,166,106,0.18)] text-[#E6C78B] font-semibold',
      subtext: 'text-[#92949A]',
      badge: 'bg-[#191D23] text-[#C6A66A] border border-[rgba(198,166,106,0.28)]',
      mutedIcon: 'text-[#A98B57]',
      divider: 'border-[rgba(255,255,255,0.08)]',
    };
  }
  if (resolved === 'dark') {
    return {
      trigger:
        'bg-slate-900 border border-slate-700 text-slate-100 hover:border-slate-500 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/25 placeholder-slate-400',
      triggerOpen: 'border-indigo-400 ring-2 ring-indigo-500/25',
      menu: 'bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl shadow-black/60',
      searchBox: 'bg-slate-950/70 border-b border-slate-800 text-slate-100 placeholder-slate-500',
      searchInput:
        'bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-indigo-500',
      optionDefault: 'text-slate-200 hover:bg-slate-800/80',
      optionHighlighted: 'bg-slate-800 text-white',
      optionSelected: 'bg-indigo-600/25 text-indigo-300 font-semibold',
      subtext: 'text-slate-400',
      badge: 'bg-slate-800 text-slate-300 border border-slate-700',
      mutedIcon: 'text-slate-400',
      divider: 'border-slate-800',
    };
  }
  return {
    trigger:
      'bg-white border border-slate-200 text-slate-900 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 placeholder-slate-400 shadow-xs',
    triggerOpen: 'border-blue-500 ring-2 ring-blue-500/20',
    menu: 'bg-white border border-slate-200 text-slate-900 shadow-xl shadow-slate-900/10',
    searchBox: 'bg-slate-50 border-b border-slate-100 text-slate-900 placeholder-slate-400',
    searchInput:
      'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500',
    optionDefault: 'text-slate-700 hover:bg-slate-100',
    optionHighlighted: 'bg-blue-50 text-slate-900',
    optionSelected: 'bg-blue-50/90 text-blue-700 font-semibold',
    subtext: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-600 border border-slate-200',
    mutedIcon: 'text-slate-400',
    divider: 'border-slate-100',
  };
}

function usePortalPosition(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  menuWidth?: number,
  maxHeight = 280
) {
  const [placement, setPlacement] = useState<PopoverPlacement>({
    top: 0,
    left: 0,
    width: menuWidth || 240,
    maxHeight,
    direction: 'down',
  });

  const update = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPlacement(
      computePopoverPlacement(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        maxHeight,
        menuWidth || rect.width || 220
      )
    );
  }, [triggerRef, maxHeight, menuWidth]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && triggerRef.current) {
      observer = new ResizeObserver(update);
      observer.observe(triggerRef.current);
    }
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer?.disconnect();
    };
  }, [isOpen, update, triggerRef]);

  return placement;
}

function useClickOutside(
  isOpen: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const isInside = refs.some((ref) => ref.current && ref.current.contains(target));
      if (!isInside) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen, refs, onClose]);
}

function filterOptionsByQuery<T>(options: SelectOption<T>[], query: string): SelectOption<T>[] {
  const q = normalizeLocationToken(query);
  if (!q) return options;
  return options.filter((opt) => {
    const label = normalizeLocationToken(opt.label);
    const val = normalizeLocationToken(opt.value);
    const desc = normalizeLocationToken(opt.description || '');
    const kw = normalizeLocationToken(opt.keywords || '');
    return label.includes(q) || val.includes(q) || desc.includes(q) || kw.includes(q);
  });
}

// ============================================================================
// 1. SearchableSelect — Accessible single-select dropdown with portal & search
// ============================================================================

export interface SearchableSelectProps<T = any> {
  value: string;
  onChange: (value: string, option?: SelectOption<T>) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  theme?: SelectTheme;
  className?: string;
  triggerClassName?: string;
  id?: string;
  ariaLabel?: string;
  leadingIcon?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  maxHeight?: number;
}

export function SearchableSelect<T = any>({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No matching options',
  searchable,
  clearable = false,
  disabled = false,
  loading = false,
  error = null,
  onRetry,
  theme = 'auto',
  className = '',
  triggerClassName = '',
  id,
  ariaLabel,
  leadingIcon,
  size = 'md',
  maxHeight = 280,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const resolvedTheme = detectResolvedTheme(theme);
  const t = getThemeClasses(resolvedTheme);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const showSearch = searchable ?? options.length >= 6;
  const filteredOptions = useMemo(
    () => (showSearch ? filterOptionsByQuery(options, searchQuery) : options),
    [options, searchQuery, showSearch]
  );

  const placement = usePortalPosition(isOpen, triggerRef, undefined, maxHeight);
  useClickOutside(isOpen, [triggerRef, menuRef], () => setIsOpen(false));

  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex((o) => o.value === value && !o.disabled);
      setHighlightIndex(idx >= 0 ? idx : 0);
      if (showSearch) {
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery]);

  const selectOption = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value, opt);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) =>
        filteredOptions.length === 0 ? 0 : (i + 1) % filteredOptions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) =>
        filteredOptions.length === 0
          ? 0
          : (i - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlightIndex(Math.max(0, filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const candidate = filteredOptions[highlightIndex];
      if (candidate) selectOption(candidate);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const sizeClass =
    size === 'xs'
      ? 'px-2.5 py-1.5 text-xs rounded-lg'
      : size === 'sm'
      ? 'px-3 py-2 text-xs rounded-xl'
      : 'px-3.5 py-2.5 text-sm rounded-xl';

  const menuPortal =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: placement.top,
              left: placement.left,
              width: placement.width,
              zIndex: 9999,
            }}
            className={`rounded-xl overflow-hidden flex flex-col ${t.menu}`}
            data-testid="select-popover"
          >
            {showSearch && (
              <div className={`p-2 ${t.searchBox}`}>
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${t.mutedIcon}`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg outline-none transition-colors ${t.searchInput}`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear filter"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.mutedIcon} hover:opacity-80`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              id={listId}
              role="listbox"
              aria-label={ariaLabel || placeholder}
              style={{ maxHeight: placement.maxHeight - (showSearch ? 52 : 0) }}
              className="overflow-y-auto py-1"
            >
              {loading ? (
                <div className={`px-3 py-4 text-xs flex items-center justify-center gap-2 ${t.subtext}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading options...</span>
                </div>
              ) : error ? (
                <div className="px-3 py-3 text-xs flex items-center justify-between gap-2 text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1 font-semibold underline shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className={`px-3 py-4 text-xs text-center ${t.subtext}`}>
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      id={`${listId}-opt-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectOption(opt);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                        opt.disabled
                          ? 'opacity-45 cursor-not-allowed'
                          : isSelected
                          ? t.optionSelected
                          : isHighlighted
                          ? t.optionHighlighted
                          : t.optionDefault
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs leading-snug truncate">{opt.label}</div>
                        {opt.description && (
                          <div className={`text-[10px] truncate mt-0.5 ${t.subtext}`}>
                            {opt.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.badge}`}>
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel || placeholder}
        aria-activedescendant={isOpen && filteredOptions[highlightIndex] ? `${listId}-opt-${highlightIndex}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 text-left transition-all outline-none ${sizeClass} ${
          t.trigger
        } ${isOpen ? t.triggerOpen : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {leadingIcon && <span className={`shrink-0 ${t.mutedIcon}`}>{leadingIcon}</span>}
          <span className={`truncate ${selectedOption ? '' : 'opacity-65'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className={`p-0.5 rounded hover:bg-black/10 ${t.mutedIcon}`}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${t.mutedIcon} ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {menuPortal}
    </div>
  );
}

// ============================================================================
// 2. FilterSelect — Compact toolbar preset around SearchableSelect
// ============================================================================

export type FilterSelectProps<T = any> = Omit<SearchableSelectProps<T>, 'size'>;

export function FilterSelect<T = any>(props: FilterSelectProps<T>) {
  return <SearchableSelect size="sm" {...props} />;
}

// ============================================================================
// 3. MultiSelect — Multi-value selector with chips, search & toggle actions
// ============================================================================

export interface MultiSelectProps<T = any> {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  theme?: SelectTheme;
  className?: string;
  ariaLabel?: string;
  allowCustom?: boolean;
}

export function MultiSelect<T = any>({
  values,
  onChange,
  options,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search or filter...',
  emptyMessage = 'No matching options',
  disabled = false,
  theme = 'auto',
  className = '',
  ariaLabel,
  allowCustom = false,
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const resolvedTheme = detectResolvedTheme(theme);
  const t = getThemeClasses(resolvedTheme);

  const placement = usePortalPosition(isOpen, triggerRef, undefined, 290);
  useClickOutside(isOpen, [triggerRef, menuRef], () => setIsOpen(false));

  const selectedSet = useMemo(() => new Set(values), [values]);
  const filteredOptions = useMemo(
    () => filterOptionsByQuery(options, searchQuery),
    [options, searchQuery]
  );

  const toggleValue = (val: string) => {
    const next = new Set(values);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    onChange(Array.from(next));
  };

  const handleAddCustom = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (!selectedSet.has(trimmed)) {
      onChange([...values, trimmed]);
    }
    setSearchQuery('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl flex items-center justify-between gap-2 text-left transition-all outline-none ${
          t.trigger
        } ${isOpen ? t.triggerOpen : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${values.length > 0 ? '' : 'opacity-65'}`}>
          {values.length > 0
            ? `${values.length} selected (${values.slice(0, 2).join(', ')}${values.length > 2 ? ` +${values.length - 2}` : ''})`
            : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${t.mutedIcon} ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: placement.top,
              left: placement.left,
              width: placement.width,
              zIndex: 9999,
            }}
            className={`rounded-xl overflow-hidden flex flex-col ${t.menu}`}
          >
            <div className={`p-2 flex items-center gap-1.5 ${t.searchBox}`}>
              <div className="relative flex-1">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${t.mutedIcon}`} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsOpen(false);
                    if (e.key === 'Enter' && allowCustom && searchQuery.trim()) {
                      e.preventDefault();
                      handleAddCustom();
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none ${t.searchInput}`}
                />
              </div>
              {values.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-semibold px-2 py-1 rounded hover:bg-rose-500/10 text-rose-500 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            <div
              id={listId}
              role="listbox"
              aria-multiselectable="true"
              style={{ maxHeight: placement.maxHeight - 52 }}
              className="overflow-y-auto py-1"
            >
              {allowCustom &&
                searchQuery.trim() &&
                !filteredOptions.some(
                  (o) => normalizeLocationToken(o.label) === normalizeLocationToken(searchQuery)
                ) && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddCustom();
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold ${t.optionHighlighted}`}
                  >
                    + Add "{searchQuery.trim()}"
                  </button>
                )}

              {filteredOptions.length === 0 ? (
                <div className={`px-3 py-4 text-xs text-center ${t.subtext}`}>{emptyMessage}</div>
              ) : (
                filteredOptions.map((opt) => {
                  const checked = selectedSet.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        toggleValue(opt.value);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 ${
                        checked ? t.optionSelected : t.optionDefault
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          checked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-400/50'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================================================
// 4. Autocomplete — Combobox supporting both suggestion selection & free input
// ============================================================================

export interface AutocompleteProps<T = any> {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: SelectOption<T>) => void;
  onSubmitValue?: (value: string) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  emptyMessage?: string;
  theme?: SelectTheme;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  leadingIcon?: React.ReactNode;
  allowFreeText?: boolean;
  clearable?: boolean;
  id?: string;
  ariaLabel?: string;
}

export function Autocomplete<T = any>({
  value,
  onChange,
  onSelectOption,
  onSubmitValue,
  options,
  placeholder = 'Type to search...',
  emptyMessage = 'No matching suggestions',
  theme = 'auto',
  className = '',
  inputClassName = '',
  disabled = false,
  loading = false,
  error = null,
  onRetry,
  leadingIcon,
  allowFreeText = true,
  clearable = true,
  id,
  ariaLabel,
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const resolvedTheme = detectResolvedTheme(theme);
  const t = getThemeClasses(resolvedTheme);

  const placement = usePortalPosition(isOpen, wrapperRef, undefined, 260);
  useClickOutside(isOpen, [wrapperRef, menuRef], () => setIsOpen(false));

  useEffect(() => {
    setHighlightIndex(options.length > 0 ? 0 : -1);
  }, [options.length]);

  const commitOption = (opt: SelectOption<T>) => {
    onChange(opt.value);
    onSelectOption?.(opt);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else if (options.length > 0) setHighlightIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen && options.length > 0) {
        setHighlightIndex((i) => (i - 1 + options.length) % options.length);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      if (isOpen && highlightIndex >= 0 && options[highlightIndex]) {
        e.preventDefault();
        commitOption(options[highlightIndex]);
      } else if (allowFreeText && onSubmitValue && value.trim()) {
        e.preventDefault();
        onSubmitValue(value.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className={`absolute left-3 pointer-events-none ${t.mutedIcon}`}>{leadingIcon}</span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-label={ariaLabel || placeholder}
          aria-activedescendant={
            isOpen && highlightIndex >= 0 && options[highlightIndex]
              ? `${listId}-opt-${highlightIndex}`
              : undefined
          }
          disabled={disabled}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full py-2.5 text-sm rounded-xl outline-none transition-all ${
            leadingIcon ? 'pl-9' : 'pl-3.5'
          } ${clearable && value ? 'pr-8' : 'pr-3.5'} ${t.trigger} ${
            isOpen ? t.triggerOpen : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
        />
        {loading ? (
          <Loader2 className={`w-3.5 h-3.5 animate-spin absolute right-3 ${t.mutedIcon}`} />
        ) : (
          clearable &&
          value &&
          !disabled && (
            <button
              type="button"
              aria-label="Clear input"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className={`absolute right-2.5 p-0.5 rounded hover:bg-black/10 ${t.mutedIcon}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: placement.top,
              left: placement.left,
              width: placement.width,
              zIndex: 9999,
            }}
            className={`rounded-xl overflow-hidden ${t.menu}`}
            data-testid="autocomplete-popover"
          >
            <div
              id={listId}
              role="listbox"
              style={{ maxHeight: placement.maxHeight }}
              className="overflow-y-auto py-1"
            >
              {loading && options.length === 0 ? (
                <div className={`px-3 py-3 text-xs flex items-center gap-2 ${t.subtext}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : error ? (
                <div className="px-3 py-3 text-xs flex items-center justify-between gap-2 text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </span>
                  {onRetry && (
                    <button type="button" onClick={onRetry} className="underline font-semibold">
                      Retry
                    </button>
                  )}
                </div>
              ) : options.length === 0 ? (
                <div className={`px-3 py-3 text-xs ${t.subtext}`}>{emptyMessage}</div>
              ) : (
                options.map((opt, idx) => (
                  <button
                    key={`${opt.value}-${idx}`}
                    id={`${listId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitOption(opt);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                      idx === highlightIndex ? t.optionHighlighted : t.optionDefault
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{opt.label}</div>
                      {opt.description && (
                        <div className={`text-[10px] truncate ${t.subtext}`}>{opt.description}</div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${t.badge}`}>
                        {opt.badge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ============================================================================
// 5. AsyncSelect — Generic debounced async search select with stale-cancel
// ============================================================================

export interface AsyncSelectProps<T = any> {
  value: string;
  onChange: (value: string, option?: SelectOption<T>) => void;
  loadOptions: (query: string, signal: AbortSignal) => Promise<SelectOption<T>[]>;
  initialOptions?: SelectOption<T>[];
  debounceMs?: number;
  placeholder?: string;
  emptyMessage?: string;
  theme?: SelectTheme;
  className?: string;
  leadingIcon?: React.ReactNode;
  allowFreeText?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function AsyncSelect<T = any>({
  value,
  onChange,
  loadOptions,
  initialOptions = [],
  debounceMs = 180,
  placeholder = 'Search...',
  emptyMessage = 'No matching results found',
  theme = 'auto',
  className = '',
  leadingIcon,
  allowFreeText = true,
  disabled = false,
  ariaLabel,
}: AsyncSelectProps<T>) {
  const [options, setOptions] = useState<SelectOption<T>[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const res = await loadOptions(value, controller.signal);
        if (!controller.signal.aborted && mountedRef.current) {
          setOptions(res);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && mountedRef.current) {
          setError(err?.message || 'Failed to fetch suggestions');
        }
      } finally {
        if (!controller.signal.aborted && mountedRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, debounceMs, retryTick, loadOptions]);

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      onSelectOption={(opt) => onChange(opt.value, opt)}
      options={options}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      theme={theme}
      className={className}
      leadingIcon={leadingIcon}
      loading={loading}
      error={error}
      onRetry={() => setRetryTick((n) => n + 1)}
      allowFreeText={allowFreeText}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
}

// ============================================================================
// 6. LocationAutocomplete — City / State / Country / Remote structured selector
// ============================================================================

export interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, structured?: StructuredLocation | null) => void;
  placeholder?: string;
  types?: Array<StructuredLocation['locationType']>;
  countryCode?: string;
  includeRemote?: boolean;
  theme?: SelectTheme;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search city, state, or country (e.g. Indore, London, San Francisco)...',
  types,
  countryCode,
  includeRemote = false,
  theme = 'auto',
  className = '',
  inputClassName = '',
  disabled = false,
  id,
  ariaLabel,
}: LocationAutocompleteProps) {
  // Instant synchronous local seed + debounced live backend refinement
  const localSeed = useMemo(
    () =>
      searchLocalLocations(value, {
        types,
        countryCode,
        includeRemote,
        limit: 12,
      }),
    [value, types, countryCode, includeRemote]
  );

  const [remoteResults, setRemoteResults] = useState<typeof localSeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchLocations(value, {
          types,
          countryCode,
          includeRemote,
          limit: 15,
          signal: controller.signal,
        });
        if (!controller.signal.aborted && res?.results) {
          setRemoteResults(res.results);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setRemoteResults(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, types?.join(','), countryCode, includeRemote, retryTick]);

  const activeResults = remoteResults ?? localSeed;

  const options: SelectOption<StructuredLocation>[] = useMemo(
    () =>
      activeResults.map((item) => ({
        value: item.formattedAddress,
        label: item.formattedAddress,
        description: item.subtitle,
        badge: item.countryCode === 'REMOTE' ? 'REMOTE' : item.locationType.toUpperCase(),
        meta: {
          city: item.city,
          region: item.region,
          country: item.country,
          countryCode: item.countryCode,
          formattedAddress: item.formattedAddress,
          locationType: item.locationType,
        },
      })),
    [activeResults]
  );

  return (
    <Autocomplete<StructuredLocation>
      id={id}
      value={value}
      onChange={(nextVal) => onChange(nextVal, null)}
      onSelectOption={(opt) => onChange(opt.value, opt.meta || null)}
      options={options}
      placeholder={placeholder}
      emptyMessage="No matching city, state, or country found — press Enter or keep typing custom location."
      theme={theme}
      className={className}
      inputClassName={inputClassName}
      disabled={disabled}
      loading={loading && options.length === 0}
      error={error}
      onRetry={() => setRetryTick((n) => n + 1)}
      leadingIcon={<MapPin className="w-4 h-4" />}
      ariaLabel={ariaLabel || 'Location search'}
    />
  );
}

// ============================================================================
// 7, 8, 9. Cascading CountrySelect -> StateSelect -> CitySelect
// ============================================================================

export function resolveNextCascadingState(
  nextCountry: string,
  currentState: string,
  currentCity: string
): { state: string; city: string } {
  if (!nextCountry) return { state: '', city: '' };
  const validStates = getStatesByCountry(nextCountry);
  const stateStillValid = validStates.some(
    (s) =>
      normalizeLocationToken(s.name) === normalizeLocationToken(currentState) ||
      normalizeLocationToken(s.code) === normalizeLocationToken(currentState)
  );
  const nextState = stateStillValid ? currentState : '';
  const validCities = getCitiesByState(nextCountry, nextState || undefined);
  const cityStillValid = validCities.some(
    (c) => normalizeLocationToken(c.name) === normalizeLocationToken(currentCity)
  );
  return { state: nextState, city: cityStillValid ? currentCity : '' };
}

export interface CountrySelectProps {
  value: string;
  onChange: (countryName: string, meta?: { code: string; name: string; currency: string }) => void;
  placeholder?: string;
  includeAllOption?: boolean;
  allLabel?: string;
  includeRemote?: boolean;
  extraCountries?: string[];
  clearable?: boolean;
  disabled?: boolean;
  theme?: SelectTheme;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country...',
  includeAllOption = false,
  allLabel = 'All Countries',
  includeRemote = false,
  extraCountries = [],
  clearable = true,
  disabled = false,
  theme = 'auto',
  className = '',
  size = 'md',
  ariaLabel,
}: CountrySelectProps) {
  const options = useMemo<SelectOption[]>(() => {
    const base = getCountries({ includeRemote });
    const seen = new Set(base.map((c) => normalizeLocationToken(c.name)));
    const result: SelectOption[] = [];

    if (includeAllOption) {
      result.push({ value: 'all', label: allLabel, badge: 'ALL' });
    }
    for (const extra of extraCountries) {
      const trimmed = extra.trim();
      const norm = normalizeLocationToken(trimmed);
      if (trimmed && norm !== 'all' && !seen.has(norm)) {
        seen.add(norm);
        result.push({ value: trimmed, label: trimmed });
      }
    }
    for (const c of base) {
      result.push({
        value: c.name,
        label: c.name,
        badge: c.code,
        keywords: `${c.code} ${c.currency}`,
        meta: c,
      });
    }
    return result;
  }, [includeAllOption, allLabel, includeRemote, extraCountries.join('|')]);

  return (
    <SearchableSelect
      value={value}
      onChange={(val, opt) => onChange(val, opt?.meta)}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search country or ISO code..."
      searchable={true}
      clearable={clearable && !includeAllOption}
      disabled={disabled}
      theme={theme}
      className={className}
      size={size}
      leadingIcon={<Globe className="w-3.5 h-3.5" />}
      ariaLabel={ariaLabel || placeholder}
    />
  );
}

export interface StateSelectProps {
  country: string;
  value: string;
  onChange: (stateName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  theme?: SelectTheme;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
}

export function StateSelect({
  country,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = true,
  theme = 'auto',
  className = '',
  size = 'md',
  ariaLabel,
}: StateSelectProps) {
  const states = useMemo(() => (country ? getStatesByCountry(country) : []), [country]);
  const options = useMemo<SelectOption[]>(
    () => states.map((s) => ({ value: s.name, label: s.name, badge: s.code.split('-')[1] || s.code })),
    [states]
  );

  // If the selected country has no predefined state subdivisions, let users type or leave optional
  if (country && options.length === 0) {
    return (
      <Autocomplete
        value={value}
        onChange={onChange}
        options={[]}
        placeholder={placeholder || 'State / Region (optional)...'}
        emptyMessage="Type a state or province name"
        theme={theme}
        className={className}
        disabled={disabled}
        ariaLabel={ariaLabel || 'State or province'}
      />
    );
  }

  return (
    <SearchableSelect
      value={value}
      onChange={(val) => onChange(val)}
      options={options}
      placeholder={placeholder || (country ? 'Select state / region...' : 'Select country first...')}
      searchPlaceholder="Search state / province..."
      searchable={true}
      clearable={clearable}
      disabled={disabled || !country}
      theme={theme}
      className={className}
      size={size}
      ariaLabel={ariaLabel || 'State / Region'}
    />
  );
}

export interface CitySelectProps {
  country: string;
  state?: string;
  value: string;
  onChange: (cityName: string, structured?: StructuredLocation) => void;
  placeholder?: string;
  disabled?: boolean;
  theme?: SelectTheme;
  className?: string;
  ariaLabel?: string;
}

export function CitySelect({
  country,
  state,
  value,
  onChange,
  placeholder,
  disabled = false,
  theme = 'auto',
  className = '',
  ariaLabel,
}: CitySelectProps) {
  const cities = useMemo(
    () => (country ? getCitiesByState(country, state, undefined) : []),
    [country, state]
  );

  const options = useMemo<SelectOption<StructuredLocation>[]>(
    () =>
      cities.map((c) => ({
        value: c.name,
        label: c.name,
        description: c.region,
        badge: c.countryCode,
        meta: {
          city: c.name,
          region: c.region,
          country,
          countryCode: c.countryCode,
          formattedAddress: `${c.name}, ${c.region}, ${country}`,
          locationType: 'city',
        },
      })),
    [cities, country]
  );

  return (
    <Autocomplete<StructuredLocation>
      value={value}
      onChange={(nextVal) => onChange(nextVal)}
      onSelectOption={(opt) => onChange(opt.value, opt.meta)}
      options={filterOptionsByQuery(options, value)}
      placeholder={placeholder || (country ? 'Search or select city...' : 'Select country first...')}
      emptyMessage={country ? 'Type custom city name or clear filter' : 'Select a country first'}
      theme={theme}
      className={className}
      disabled={disabled || !country}
      leadingIcon={<MapPin className="w-3.5 h-3.5" />}
      ariaLabel={ariaLabel || 'City'}
    />
  );
}

// ============================================================================
// 10. DateSelect — Structured Year-Month selector (plus optional "Present")
// ============================================================================

export interface DateSelectProps {
  value: string; // e.g. '2024-09' or 'Present'
  onChange: (value: string) => void;
  allowPresent?: boolean;
  minYear?: number;
  maxYear?: number;
  theme?: SelectTheme;
  className?: string;
  disabled?: boolean;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function DateSelect({
  value,
  onChange,
  allowPresent = false,
  minYear = 1980,
  maxYear = new Date().getFullYear() + 4,
  theme = 'auto',
  className = '',
  disabled = false,
}: DateSelectProps) {
  const isPresent = String(value || '').toLowerCase() === 'present';
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(String(value || '').trim());
  const selectedYear = match ? match[1] : '';
  const selectedMonth = match?.[2] || '';

  const yearOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    if (allowPresent) opts.push({ value: 'Present', label: 'Present' });
    for (let y = maxYear; y >= minYear; y--) {
      opts.push({ value: String(y), label: String(y) });
    }
    return opts;
  }, [allowPresent, minYear, maxYear]);

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <SearchableSelect
        value={isPresent ? 'Present' : selectedYear}
        onChange={(yr) => {
          if (yr === 'Present') {
            onChange('Present');
          } else if (yr) {
            onChange(selectedMonth ? `${yr}-${selectedMonth}` : yr);
          } else {
            onChange('');
          }
        }}
        options={yearOptions}
        placeholder="Year"
        searchable={true}
        clearable={true}
        disabled={disabled}
        theme={theme}
        size="sm"
        ariaLabel="Select year"
      />
      <SearchableSelect
        value={isPresent ? '' : selectedMonth}
        onChange={(mo) => {
          if (isPresent || !selectedYear) return;
          onChange(mo ? `${selectedYear}-${mo}` : selectedYear);
        }}
        options={MONTHS}
        placeholder={isPresent ? 'Current' : 'Month'}
        searchable={false}
        clearable={true}
        disabled={disabled || isPresent || !selectedYear}
        theme={theme}
        size="sm"
        ariaLabel="Select month"
      />
    </div>
  );
}
