import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Briefcase, Sparkles, Building2, ArrowRight, Compass } from 'lucide-react';

export interface SearchSuggestionItem {
  id: string;
  type: 'job' | 'skill' | 'company' | 'navigation';
  title: string;
  subtitle?: string;
  tabTarget?: string;
  queryParam?: string;
}

export interface GlobalSearchBarProps {
  plan?: 'free' | 'pro' | 'black';
  placeholder?: string;
  onSelectTab?: (tab: any) => void;
  onSearch?: (query: string) => void;
  isAdmin?: boolean;
  onSelectAdminTab?: (tab: string) => void;
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  plan = 'free',
  placeholder = 'Search verified opportunities, skills, companies...',
  onSelectTab,
  onSearch,
  isAdmin = false,
  onSelectAdminTab,
  className = '',
}) => {
  const isBlack = plan === 'black';
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect Operating System for shortcut label (⌘ K on Mac, Ctrl K on Windows/Linux)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
      setIsMac(mac);
    }
  }, []);

  // Global Keyboard shortcut listener for ⌘K and Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Click outside listener to close autocomplete popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Base suggestions for Candidate view
  const candidateSuggestions: SearchSuggestionItem[] = [
    { id: 'job-1', type: 'job', title: 'Senior Process Associate - Supply Chain Operations', subtitle: 'Tata Consultancy Services (TCS) • 94% Match', tabTarget: 'jobs', queryParam: 'Supply Chain Operations' },
    { id: 'job-2', type: 'job', title: 'Lead Operations Process Specialist', subtitle: 'Verified Enterprise • 88% Match', tabTarget: 'jobs', queryParam: 'Process Specialist' },
    { id: 'job-3', type: 'job', title: 'Full Stack Engineer - TypeScript & React', subtitle: 'Cloudflare Careers • Remote', tabTarget: 'jobs', queryParam: 'Full Stack Engineer' },
    { id: 'skill-1', type: 'skill', title: 'Supply Chain Operations & Logistics', subtitle: 'Verified Candidate Competency', tabTarget: 'radar', queryParam: 'Supply Chain' },
    { id: 'skill-2', type: 'skill', title: 'ERP Systems & SAP Integration', subtitle: 'Verified Ground-Truth Fact', tabTarget: 'radar', queryParam: 'SAP ERP' },
    { id: 'company-1', type: 'company', title: 'Linear Careers', subtitle: 'Verified Live Greenhouse Connector', tabTarget: 'jobs', queryParam: 'Linear' },
    { id: 'company-2', type: 'company', title: 'Cloudflare', subtitle: 'Global Infrastructure & Remote Roles', tabTarget: 'jobs', queryParam: 'Cloudflare' },
    { id: 'nav-1', type: 'navigation', title: 'Career Atlas 2.0', subtitle: 'Interactive Career Path Trajectories & Gap Intelligence', tabTarget: 'atlas' },
    { id: 'nav-2', type: 'navigation', title: 'Opportunity Radar', subtitle: '3D Constellation & Live Opportunity Discovery', tabTarget: 'radar' },
    { id: 'nav-3', type: 'navigation', title: 'AI HR Outreach', subtitle: 'Direct Recruiter & Verified Mailbox Ingestion', tabTarget: 'hr_outreach' },
  ];

  // Base suggestions for Admin view
  const adminSuggestions: SearchSuggestionItem[] = [
    { id: 'admin-1', type: 'navigation', title: 'Global Career Discovery Engine (GCDE)', subtitle: 'Manage 12 Live ATS Connectors & Ingestion', tabTarget: 'gcde' },
    { id: 'admin-2', type: 'navigation', title: 'Autonomous Growth Engine', subtitle: 'AI Marketing Department & SEO Intelligence', tabTarget: 'growth_engine' },
    { id: 'admin-3', type: 'navigation', title: 'Users & Roles Management', subtitle: 'Provision, search, and manage candidate accounts', tabTarget: 'users' },
    { id: 'admin-4', type: 'navigation', title: 'Resume Operations & Audit', subtitle: 'Inspect ATS extractions & Fact Registries', tabTarget: 'resumes' },
    { id: 'admin-5', type: 'navigation', title: 'System Health & Edge Telemetry', subtitle: 'Database latency, memory, and Worker status', tabTarget: 'health' },
  ];

  const allSuggestions = isAdmin ? adminSuggestions : candidateSuggestions;

  // Filter suggestions based on current query
  const filteredSuggestions = query.trim()
    ? allSuggestions.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
      )
    : allSuggestions.slice(0, 6);

  const handleSelectSuggestion = (item: SearchSuggestionItem) => {
    setIsOpen(false);
    if (isAdmin && onSelectAdminTab && item.tabTarget) {
      onSelectAdminTab(item.tabTarget);
    } else if (onSelectTab && item.tabTarget) {
      onSelectTab(item.tabTarget);
    }

    if (item.queryParam) {
      setQuery(item.queryParam);
      if (onSearch) onSearch(item.queryParam);
    } else if (item.type === 'job' || item.type === 'skill') {
      setQuery(item.title);
      if (onSearch) onSearch(item.title);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
      handleSelectSuggestion(filteredSuggestions[selectedIndex]);
      return;
    }

    setIsOpen(false);
    if (isAdmin) {
      if (onSelectAdminTab) onSelectAdminTab('users');
      if (onSearch && query) onSearch(query);
    } else {
      if (onSelectTab) onSelectTab('jobs');
      if (onSearch && query) onSearch(query);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        handleSelectSuggestion(filteredSuggestions[selectedIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const shortcutDisplay = isMac ? '⌘ K' : 'Ctrl K';

  return (
    <div
      ref={containerRef}
      role="search"
      className={`relative w-full transition-all duration-200 ${className}`}
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div
          onClick={() => {
            inputRef.current?.focus();
            setIsOpen(true);
          }}
          className={`w-full h-9 px-3.5 rounded-full flex items-center justify-between transition-all duration-200 cursor-text group ${
            isBlack
              ? 'bg-[#101318] hover:bg-[#141820] focus-within:bg-[#12161E] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(198,166,106,0.30)] focus-within:border-[rgba(198,166,106,0.50)] focus-within:ring-1 focus-within:ring-[rgba(198,166,106,0.25)] shadow-inner shadow-black/40'
              : 'bg-white/80 hover:bg-white focus-within:bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400/20 shadow-2xs'
          }`}
          style={
            isBlack
              ? {
                  backgroundColor: 'var(--be-bg-input, #101318)',
                  borderColor: isOpen
                    ? 'var(--be-accent-primary, #C6A66A)'
                    : 'var(--be-border-subtle, rgba(255, 255, 255, 0.08))',
                }
              : undefined
          }
        >
          {/* Left: Elegant Search Icon & Text Input */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <Search
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                isBlack
                  ? 'text-[#92949A] group-hover:text-[#C6A66A] group-focus-within:text-[#C6A66A]'
                  : 'text-slate-400 group-hover:text-slate-600 group-focus-within:text-slate-800'
              }`}
              style={
                isBlack
                  ? {
                      color: isOpen ? 'var(--be-accent-primary, #C6A66A)' : 'var(--be-accent-muted, #92949A)',
                    }
                  : undefined
              }
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              aria-label="Global search"
              className={`w-full bg-transparent border-0 outline-none text-xs leading-none p-0 tracking-normal ${
                isBlack
                  ? 'text-[#F2F0EA] placeholder:text-[#92949A]'
                  : 'text-slate-900 placeholder:text-slate-400'
              }`}
              style={
                isBlack
                  ? {
                      color: 'var(--be-text-primary, #F2F0EA)',
                    }
                  : undefined
              }
            />
          </div>

          {/* Right: Integrated Compact Keyboard Shortcut Hint */}
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setQuery('');
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                className={`p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors ${
                  isBlack ? 'text-[#92949A] hover:text-[#F2F0EA]' : 'text-slate-400 hover:text-slate-600'
                }`}
                aria-label="Clear search input"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            <kbd
              aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
              aria-label={isMac ? 'Shortcut: Command K' : 'Shortcut: Control K'}
              title={isMac ? 'Command + K' : 'Control + K'}
              className={`inline-flex items-center justify-center font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded-md transition-all duration-200 select-none border ${
                isBlack
                  ? 'bg-white/[0.04] border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(198,166,106,0.30)] text-[#C6A66A]'
                  : 'bg-slate-100 text-slate-500 border-slate-200/90 group-hover:border-slate-300'
              }`}
              style={
                isBlack
                  ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.08))',
                      color: 'var(--be-accent-primary, #C6A66A)',
                    }
                  : undefined
              }
            >
              <span className="sr-only">⌘K</span>
              <span className="leading-none font-medium">{shortcutDisplay}</span>
            </kbd>
          </div>
        </div>
      </form>

      {/* Autocomplete & Instant Discovery Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl backdrop-blur-xl z-50 overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1 ${
            isBlack
              ? 'bg-[#101318]/95 border-[rgba(255,255,255,0.10)] text-[#F2F0EA]'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
          style={
            isBlack
              ? {
                  backgroundColor: 'var(--be-bg-card, #101318)',
                  borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.10))',
                  color: 'var(--be-text-primary, #F2F0EA)',
                }
              : undefined
          }
        >
          {/* Header count info */}
          <div
            className={`px-3.5 py-2 border-b flex items-center justify-between text-[11px] font-mono ${
              isBlack
                ? 'border-[rgba(255,255,255,0.06)] text-[#92949A]'
                : 'border-slate-100 text-slate-500'
            }`}
          >
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {query ? `Search Results (${filteredSuggestions.length})` : 'Quick Jump & Discovery'}
            </span>
            <span className="text-[10px] text-slate-400">
              {isAdmin ? 'Admin Console' : 'ApplyVise Intelligence'}
            </span>
          </div>

          {/* Suggestions List */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filteredSuggestions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                <Search className="w-5 h-5 mx-auto mb-2 opacity-40" />
                <p>No verified records match &ldquo;{query}&rdquo;</p>
                <p className="text-[10px] text-slate-500 mt-1">Press Enter to search live job discovery</p>
              </div>
            ) : (
              filteredSuggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const icon =
                  item.type === 'job' ? (
                    <Briefcase className="w-3.5 h-3.5 text-[#C6A66A]" />
                  ) : item.type === 'skill' ? (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  ) : item.type === 'company' ? (
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 text-purple-400" />
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? isBlack
                          ? 'bg-[rgba(198,166,106,0.12)] text-[#F2F0EA]'
                          : 'bg-slate-100 text-slate-900'
                        : isBlack
                        ? 'hover:bg-white/[0.04] text-[#C0BDB5]'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="p-1 rounded-md bg-white/[0.04] border border-white/[0.06] shrink-0">
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-xs text-[#F2F0EA]">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[10px] text-[#92949A] truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#92949A] shrink-0 opacity-60" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer instruction bar */}
          <div
            className={`px-3.5 py-1.5 border-t flex items-center justify-between text-[10px] font-mono ${
              isBlack
                ? 'border-[rgba(255,255,255,0.06)] bg-[#0C0E12] text-[#92949A]'
                : 'border-slate-100 bg-slate-50 text-slate-500'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span>
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px]">↵</kbd> select
              </span>
              <span>
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px]">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px]">esc</kbd> close
              </span>
            </div>
            <span className="text-[9px] text-[#C6A66A]">
              ApplyVise Command
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
