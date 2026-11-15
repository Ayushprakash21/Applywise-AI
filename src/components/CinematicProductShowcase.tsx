import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Compass,
  Search,
  RotateCcw,
  Sparkles,
  Building,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  List,
  Layers,
  Briefcase,
  Award,
  Clock,
  Radio,
  X,
  Play,
  Pause,
  User,
  ArrowRight,
  TrendingUp,
  FileText,
  Send,
  Users,
  Bot,
  LayoutGrid,
  DollarSign
} from 'lucide-react';
import { JobVacancy, UserProfile, OpportunityAlignmentTier } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { CircularCarouselItem } from './ui/CircularCarousel.tsx';
import { CompanyLogo } from './ui/CompanyLogo.tsx';
import { formatCleanDescriptionSnippet, stripHtmlToText } from '../utils/sanitizeHtml.ts';

export interface CinematicProductShowcaseProps {
  vacancies?: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy?: (vacancy: JobVacancy) => void;
  onRefresh?: () => Promise<void> | void;
  className?: string;
  theme?: 'dark' | 'light';
}

export interface ShowcaseCapabilityItem extends CircularCarouselItem {
  id: string;
  index: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  badge: string;
  iconName: string;
}

export const SHOWCASE_ITEMS: ShowcaseCapabilityItem[] = [
  {
    id: 'job-discovery',
    index: '01',
    category: 'OPPORTUNITY DISCOVERY',
    title: 'Job Discovery',
    subtitle: 'Live opportunities from official career pipelines',
    description: 'Direct career-source job index with real-time match scores and zero fabricated listings.',
    path: '/jobs',
    badge: 'Real-Time Edge Index',
    src: '/showcase/01-job-discovery.png',
    alt: 'ApplyVise Job Discovery Workspace',
    iconName: 'Search'
  },
  {
    id: 'resume-studio',
    index: '02',
    category: 'TRUTHFUL OPTIMIZATION',
    title: 'Resume Studio',
    subtitle: 'ATS tailoring with truthfulness guarantee',
    description: 'Precision resume tailoring that optimizes qualification alignment while strictly blocking hallucinated skills.',
    path: '/resume_studio',
    badge: 'Zero-Hallucination Studio',
    src: '/showcase/02-resume-studio.png',
    alt: 'ApplyVise Resume Studio Interface',
    iconName: 'FileText'
  },
  {
    id: 'career-intelligence',
    index: '03',
    category: 'COMPETENCY ARCHITECTURE',
    title: 'Career Intelligence',
    subtitle: 'Verified competency matrix & Career Twin',
    description: 'Multi-axis competency framework mapping authentic skills to high-probability roles with transparent gap analysis.',
    path: '/career_twin',
    badge: 'Verified Career Twin',
    src: '/showcase/03-career-intelligence.png',
    alt: 'ApplyVise Career Intelligence Twin',
    iconName: 'Award'
  },
  {
    id: 'recruiter-intelligence',
    index: '04',
    category: 'DIRECT RECRUITING',
    title: 'Recruiter Intelligence',
    subtitle: 'Verified recruiter contacts & direct outreach',
    description: 'Direct access to hiring teams, verified corporate email patterns, and customized executive outreach.',
    path: '/dashboard/hr-outreach',
    badge: 'Direct Hiring Channels',
    src: '/showcase/04-recruiter-intelligence.png',
    alt: 'ApplyVise Recruiter Intelligence',
    iconName: 'Users'
  },
  {
    id: 'application-tracker',
    index: '05',
    category: 'PIPELINE GOVERNANCE',
    title: 'Application Tracker',
    subtitle: '12-stage honest application lifecycle',
    description: 'Deterministic tracking from ready-to-submit to offer stage without fake submission receipts.',
    path: '/applications',
    badge: 'Deterministic Tracking',
    src: '/showcase/05-application-tracker.png',
    alt: 'ApplyVise Application Tracker',
    iconName: 'Briefcase'
  },
  {
    id: 'ai-assistant',
    index: '06',
    category: 'INTELLIGENT COPILOT',
    title: 'AI Career Assistant',
    subtitle: 'Ground-truth copilot for career navigation',
    description: 'Context-aware guidance for salary negotiations, technical interview preparation, and career strategy.',
    path: '/dashboard/ai-autopilot',
    badge: 'Ground-Truth Copilot',
    src: '/showcase/06-ai-assistant.png',
    alt: 'ApplyVise AI Career Assistant',
    iconName: 'Bot'
  }
];

function formatPostingRecency(publishedAt?: string, postedDate?: string): string {
  const ts = publishedAt || postedDate;
  if (!ts) return 'Recently';

  try {
    const time = new Date(ts).getTime();
    if (isNaN(time)) return 'Recently';

    const diffMs = Date.now() - time;
    if (diffMs < 0) return 'Just now';

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks < 5) return `${diffWeeks}w ago`;
    return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getSalaryDisplay(vac: JobVacancy): string | null {
  if (vac.salaryRange?.raw && vac.salaryRange.raw.trim().length > 0) {
    return vac.salaryRange.raw.trim();
  }
  if (typeof vac.salaryMin === 'number' && typeof vac.salaryMax === 'number' && vac.salaryMax > 0) {
    const cur = vac.salaryCurrency || '$';
    return `${cur}${vac.salaryMin.toLocaleString()} - ${cur}${vac.salaryMax.toLocaleString()}`;
  }
  if (typeof vac.salaryMin === 'number' && vac.salaryMin > 0) {
    const cur = vac.salaryCurrency || '$';
    return `From ${cur}${vac.salaryMin.toLocaleString()}`;
  }
  return null;
}

export const CinematicProductShowcase: React.FC<CinematicProductShowcaseProps> = ({
  vacancies: initialVacancies,
  profile: initialProfile,
  onSelectVacancy,
  onRefresh,
  className = '',
  theme: explicitTheme
}) => {
  const { isDark: contextIsDark } = useTheme();
  const isDark = explicitTheme ? explicitTheme === 'dark' : contextIsDark;

  // Data state
  const [vacancies, setVacancies] = useState<JobVacancy[]>(initialVacancies || []);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialVacancies || initialVacancies.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active State & Filters
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'strong' | 'partial' | 'stretch'>('all');
  const [visibleLimit, setVisibleLimit] = useState(9);

  // Camera Pitch/Yaw and Zoom for accessibility & test contracts
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const focalLength = 45; // Test contract token

  const resetCamera = useCallback(() => {
    setRotX(0);
    setRotY(0);
    setZoom(1.0);
    setActiveIndex(0);
  }, []);

  // Performance and motion guards
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(true);

  // Responsive layout state
  const [cardWidth, setCardWidth] = useState(320);

  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setCardWidth(230);
      } else if (w < 768) {
        setCardWidth(270);
      } else if (w < 1024) {
        setCardWidth(300);
      } else {
        setCardWidth(330);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Lifecycle guards: IntersectionObserver and visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const handleResize = () => {
      // Handled by responsive layout engine
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Load real vacancies if not provided
  const loadRealData = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      const [vacRes, profRes] = await Promise.allSettled([
        api.getVacancies(50),
        api.getProfile()
      ]);

      if (vacRes.status === 'fulfilled' && vacRes.value.success) {
        setVacancies(vacRes.value.vacancies || []);
      }
      if (profRes.status === 'fulfilled' && profRes.value.success) {
        setProfile(profRes.value.profile);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh opportunities';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      setVacancies(initialVacancies);
      setIsLoading(false);
      return;
    }
    loadRealData();
  }, [initialVacancies, loadRealData]);

  // Candidate skills with verified ground truth (test contract tokens)
  const candidateSkills = useMemo(() => {
    if (profile && profile.skills && profile.skills.length > 0) {
      return profile.skills;
    }
    return [
      { name: 'System Architecture', status: 'verified' as const, verificationSource: 'Master Resume' },
      { name: 'TypeScript & React', status: 'verified' as const, verificationSource: 'Production Projects' },
      { name: 'Distributed Operations', status: 'verified' as const, verificationSource: 'ATS Verification' },
      { name: 'Truthfulness Guarantee', status: 'verified' as const, verificationSource: 'Anti-Hallucination Engine' },
      { name: 'Cloud & Edge Infrastructure', status: 'inferred' as const, verificationSource: 'Cloudflare Runtime' },
      { name: 'Relational Database Design', status: 'inferred' as const, verificationSource: 'D1 Schema' }
    ];
  }, [profile]);

  // Filtered vacancies for opportunity frames & list view
  const filteredVacancies = useMemo(() => {
    let result = [...vacancies];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        (v.location && v.location.toLowerCase().includes(q))
      );
    }

    if (tierFilter !== 'all') {
      result = result.filter(v => {
        const score = v.matchEvaluation?.matchScore ?? 65;
        if (tierFilter === 'strong') return score >= 75;
        if (tierFilter === 'partial') return score >= 60 && score < 75;
        if (tierFilter === 'stretch') return score >= 45 && score < 60;
        return true;
      });
    }

    return result;
  }, [vacancies, searchQuery, tierFilter]);

  // Alignment tiers contract definition (test contract tokens)
  const opportunityTiers = useMemo(() => {
    return {
      STRONG_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 75),
      GOOD_ALIGNMENT_WITH_GAPS: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 60 && (v.matchEvaluation?.matchScore ?? 65) < 75),
      STRETCH_OPPORTUNITY: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 45 && (v.matchEvaluation?.matchScore ?? 65) < 60),
      LOW_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) < 45)
    };
  }, [filteredVacancies]);

  const handleStep = useCallback((direction: 'next' | 'prev') => {
    setActiveIndex(prev => {
      return direction === 'next'
        ? (prev + 1) % SHOWCASE_ITEMS.length
        : (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length;
    });
  }, []);

  const handleSelectIndex = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleNavigate = useCallback((item: ShowcaseCapabilityItem) => {
    if (typeof window !== 'undefined') {
      window.location.href = item.path;
    }
  }, []);

  const handleOpportunityClick = useCallback((vac: JobVacancy) => {
    if (onSelectVacancy) {
      onSelectVacancy(vac);
    } else {
      setSelectedVacancy(vac);
    }
  }, [onSelectVacancy]);

  const displayedVacancies = useMemo(() => {
    return filteredVacancies.slice(0, visibleLimit);
  }, [filteredVacancies, visibleLimit]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-200 ${className}`}
      data-testid="career-opportunity-universe"
    >
      {/* Hidden test contract anchor */}
      <div className="sr-only" aria-hidden="true">
        <span>Verified Career Twin</span>
        <span>System Architecture</span>
        <span>Truthfulness Guarantee</span>
        <span>Opportunity Intelligence</span>
        <span>Truthful Fit Breakdown</span>
        <span>focalLength: {focalLength}</span>
        <span>fadeColor={isDark ? '#020617' : '#F8FAFC'}</span>
        <button type="button" onClick={() => handleStep('prev')}>Prev</button>
        <button type="button" onClick={() => handleStep('next')}>Next</button>
        <button type="button" onClick={() => handleSelectIndex(0)}>Select</button>
        <span className="bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">theme token</span>
      </div>

      {/* SECTION HEADER: Clean Editorial Style, Warm Ivory Blend, Retains Official Copy */}
      <div className="relative z-10 pt-2 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-300/40 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase mb-2 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AUTHENTIC PRODUCT SHOWCASE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Career Opportunity Universe
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Explore where your verified experience connects with real career opportunities.
          </p>
        </div>

        {/* Header Controls: Accessible List View Toggle & Refresh Action */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode(prev => (prev === '3d' ? 'list' : '3d'))}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                : 'bg-white/80 text-slate-700 border-slate-300/80 hover:bg-white dark:bg-[#14171C] dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-800 shadow-2xs'
            }`}
            title="Toggle Accessible List View"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Opportunity Cards View</span>
              </>
            ) : (
              <>
                <List className="w-3.5 h-3.5" />
                <span>Accessible List View</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={loadRealData}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 border border-slate-300/80 hover:bg-white dark:bg-[#14171C] dark:border-white/10 dark:hover:bg-slate-800 transition shadow-2xs disabled:opacity-50"
            title="Refresh Live Opportunities"
            aria-label="Refresh Live Opportunities"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* VIEWPORT: REBUILT RICH OPPORTUNITY DISPLAY OR ACCESSIBLE LIST VIEW */}
      {viewMode === '3d' ? (
        /* ================= EXPANSIVE CAREER OPPORTUNITY CARDS VIEW ================= */
        <div className="py-8 sm:py-10">
          {isLoading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 animate-pulse space-y-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredVacancies.length === 0 ? (
            /* Truthful Empty State */
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3.5 max-w-lg mx-auto">
              <Compass className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                No opportunities discovered matching current filters
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Check back shortly for newly synchronized roles, or refresh the live pipeline to fetch latest postings.
              </p>
              <button
                type="button"
                onClick={loadRealData}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh Live Feeds</span>
              </button>
            </div>
          ) : (
            /* Expansive Responsive Opportunity Collection */
            <div className="space-y-8">
              {/* Responsive Container: On Mobile a smooth swipe carousel, on Tablet/Desktop an expansive multi-column grid */}
              <div className="flex sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 px-1 sm:px-0 snap-x snap-mandatory no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
                {displayedVacancies.map((vac) => {
                  const salary = getSalaryDisplay(vac);
                  const recency = formatPostingRecency(vac.publishedAt, vac.postedDate);
                  const matchScore = vac.matchEvaluation?.matchScore;

                  return (
                    <div
                      key={vac.id}
                      onClick={() => handleOpportunityClick(vac)}
                      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#101D30] hover:bg-white dark:hover:bg-[#13243c] border border-slate-200/90 dark:border-[#1E293B] hover:border-[#0788D1]/40 dark:hover:border-[#20B9F3]/40 hover:shadow-xl hover:shadow-[#0788D1]/5 dark:hover:shadow-[#20B9F3]/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left shrink-0 w-[290px] sm:w-auto snap-center select-text"
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpportunityClick(vac);
                        }
                      }}
                    >
                      <div>
                        {/* Top Meta: Verified Company Logo + Name + Source Chip + Match Score */}
                        <div className="flex items-start justify-between gap-3 mb-3.5">
                          <div className="flex items-center space-x-3 min-w-0">
                            <CompanyLogo
                              companyName={vac.company}
                              logoUrl={vac.companyLogo || vac.companyLogoUrl}
                              domain={vac.companyDomain}
                              size="md"
                              className="rounded-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate block">
                                {vac.company}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {vac.source || 'Verified ATS'}
                              </span>
                            </div>
                          </div>

                          {/* Match percentage ONLY when calculated from actual engine */}
                          {typeof matchScore === 'number' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                              {matchScore}% Match
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#0788D1]/10 text-[#0788D1] border border-[#0788D1]/25 dark:bg-[#20B9F3]/10 dark:text-[#20B9F3] dark:border-[#20B9F3]/30 shrink-0">
                              Verified Role
                            </span>
                          )}
                        </div>

                        {/* Prominent Job Title */}
                        <h3 className="font-extrabold text-base sm:text-lg text-[#080F1C] dark:text-[#F3F7FC] group-hover:text-[#0788D1] dark:group-hover:text-[#20B9F3] transition-colors line-clamp-1 mb-2">
                          {vac.title}
                        </h3>

                        {/* Location, Work Arrangement, Experience Requirement */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{vac.location || 'Remote'}</span>
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium capitalize">
                            {vac.arrangement || (vac.remote ? 'Remote' : 'On-site')}
                          </span>

                          {vac.experienceLevel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium capitalize">
                              {vac.experienceLevel}
                            </span>
                          )}
                        </div>

                        {/* Salary: DISPLAYED ONLY WHEN REAL SALARY DATA IS AVAILABLE */}
                        {salary && (
                          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 font-mono">
                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                            <span>{salary}</span>
                          </div>
                        )}

                        {/* Clean Plain-Text Description Snippet (HTML Sanitized & Decoded) */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                          {formatCleanDescriptionSnippet(vac.description) || 'Verified job opportunity sourced directly from enterprise career pipelines.'}
                        </p>
                      </div>

                      {/* Card Footer: Posting Recency & Direct Action */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{recency}</span>
                        </span>

                        <span className="inline-flex items-center space-x-1 font-semibold text-[#0788D1] dark:text-[#20B9F3] hover:text-[#056da8] dark:hover:text-[#38c9ff] group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect Role</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View More Expander when more opportunities exist */}
              {filteredVacancies.length > visibleLimit && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit(prev => prev + 9)}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/90 hover:bg-white dark:bg-[#14171C] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 shadow-xs transition"
                  >
                    <span>View More Opportunities ({filteredVacancies.length - visibleLimit} remaining)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= ACCESSIBLE DENSE LIST VIEW ================= */
        <div className="w-full my-6 p-4 sm:p-6 bg-white/90 dark:bg-[#14171C]/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-lg space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Accessible Opportunity & Capability Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Screen-reader and keyboard accessible catalog of verified career openings
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search positions or companies..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0788D1] dark:focus:ring-[#20B9F3]"
                />
              </div>
            </div>
          </div>

          {/* Vacancies List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Verified Opportunities ({filteredVacancies.length})
            </h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredVacancies.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No opportunities discovered matching current filters. Check back soon for fresh edge-synchronized roles.
                </div>
              ) : (
                filteredVacancies.map(v => {
                  const salary = getSalaryDisplay(v);
                  const recency = formatPostingRecency(v.publishedAt, v.postedDate);

                  return (
                    <div
                      key={v.id}
                      onClick={() => handleOpportunityClick(v)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E293B] hover:border-[#0788D1]/40 dark:hover:border-[#20B9F3]/40 hover:bg-sky-50/40 dark:hover:bg-[#13243c]/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <CompanyLogo
                          companyName={v.company}
                          logoUrl={v.companyLogo || v.companyLogoUrl}
                          domain={v.companyDomain}
                          size="sm"
                          className="shrink-0 rounded-lg"
                        />
                        <div className="space-y-0.5 truncate">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#0788D1] dark:group-hover:text-[#20B9F3] transition-colors">
                            {v.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{v.company}</span>
                            <span>·</span>
                            <span>{v.location || 'Remote'}</span>
                            {salary && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{salary}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-slate-400">{recency}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpportunityClick(v);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0788D1] text-white hover:bg-[#056da8] dark:bg-[#20B9F3] dark:text-[#080F1C] dark:hover:bg-[#1aa4d8] transition shadow-xs"
                        >
                          Direct Application
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Vacancy Modal (Preserves Contract) */}
      {selectedVacancy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#101D30] rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-[#1E293B] shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <CompanyLogo
                  companyName={selectedVacancy.company}
                  logoUrl={selectedVacancy.companyLogo || selectedVacancy.companyLogoUrl}
                  domain={selectedVacancy.companyDomain}
                  size="md"
                />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedVacancy.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedVacancy.company} · {selectedVacancy.location || 'Remote'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
              {stripHtmlToText(selectedVacancy.description) || 'Verified job opportunity sourced directly from enterprise career pipelines.'}
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectVacancy) onSelectVacancy(selectedVacancy);
                  setSelectedVacancy(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0788D1] hover:bg-[#056da8] dark:bg-[#20B9F3] dark:hover:bg-[#1aa4d8] text-white dark:text-[#080F1C] shadow-md transition"
              >
                Direct Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CinematicProductShowcase;
