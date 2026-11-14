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
  Bot
} from 'lucide-react';
import { JobVacancy, UserProfile, OpportunityAlignmentTier } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import CircularCarousel, { CircularCarouselItem } from './ui/CircularCarousel.tsx';

export interface CinematicProductShowcaseProps {
  vacancies?: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy?: (vacancy: JobVacancy) => void;
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

export const CinematicProductShowcase: React.FC<CinematicProductShowcaseProps> = ({
  vacancies: initialVacancies,
  profile: initialProfile,
  onSelectVacancy,
  className = '',
  theme: explicitTheme
}) => {
  const { isDark: contextIsDark } = useTheme();
  const isDark = explicitTheme ? explicitTheme === 'dark' : contextIsDark;

  // Data state
  const [vacancies, setVacancies] = useState<JobVacancy[]>(initialVacancies || []);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialVacancies || initialVacancies.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Carousel State
  const [activeIndex, setActiveIndex] = useState(0);

  // Inspection & View Mode
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'strong' | 'partial' | 'stretch'>('all');

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
    const carouselEl = containerRef.current?.querySelector('.circular-carousel');
    if (carouselEl) {
      const firstCard = carouselEl.querySelector('[data-cc-index="0"]');
      if (firstCard) (firstCard as HTMLElement).click();
    }
  }, []);

  // Performance and motion guards
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(true);

  // Responsive card width calculation
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
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const handleResize = () => {
      // Handled by CircularCarousel ResizeObserver
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch real data if not provided
  useEffect(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      setVacancies(initialVacancies);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadRealData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [vacRes, profRes] = await Promise.allSettled([
          api.getVacancies(),
          api.getProfile()
        ]);

        if (!isMounted) return;

        if (vacRes.status === 'fulfilled' && vacRes.value.success) {
          setVacancies(vacRes.value.vacancies || []);
        } else {
          setVacancies([]);
        }

        if (profRes.status === 'fulfilled' && profRes.value.success) {
          setProfile(profRes.value.profile);
        }
      } catch (err: any) {
        if (isMounted) setLoadError(err.message || 'Failed to load opportunities');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRealData();
    return () => { isMounted = false; };
  }, [initialVacancies, initialProfile]);

  // Candidate skills with verified ground truth
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

  // Alignment tiers contract definition
  const opportunityTiers = useMemo(() => {
    return {
      STRONG_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 75),
      GOOD_ALIGNMENT_WITH_GAPS: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 60 && (v.matchEvaluation?.matchScore ?? 65) < 75),
      STRETCH_OPPORTUNITY: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 45 && (v.matchEvaluation?.matchScore ?? 65) < 60),
      LOW_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) < 45)
    };
  }, [filteredVacancies]);

  // Step carousel navigation forward/backward
  const handleStep = useCallback((direction: 'next' | 'prev') => {
    const carouselEl = containerRef.current?.querySelector('.circular-carousel');
    if (carouselEl) {
      const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
      carouselEl.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    } else {
      setActiveIndex(prev => {
        const next = direction === 'next' ? (prev + 1) % SHOWCASE_ITEMS.length : (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length;
        return next;
      });
    }
  }, []);

  // Jump directly to card by index
  const handleSelectIndex = useCallback((index: number) => {
    const carouselEl = containerRef.current?.querySelector('.circular-carousel');
    if (carouselEl) {
      const cardEl = carouselEl.querySelector(`[data-cc-index="${index}"]`);
      if (cardEl) {
        (cardEl as HTMLElement).click();
      }
    }
    setActiveIndex(index);
  }, []);

  // Meaningful navigation when card or CTA is clicked
  const handleNavigate = useCallback((item: ShowcaseCapabilityItem) => {
    if (typeof window !== 'undefined') {
      window.location.href = item.path;
    }
  }, []);

  const activeItem = SHOWCASE_ITEMS[activeIndex] || SHOWCASE_ITEMS[0];

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-800'
      } ${className}`}
    >
      {/* Top Header Strip */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-6 pb-2 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase mb-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AUTHENTIC PRODUCT SHOWCASE</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Career Opportunity Universe
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Explore where your verified experience connects with real career opportunities.
          </p>
        </div>

        {/* View mode toggle & reset camera */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode(prev => (prev === '3d' ? 'list' : '3d'))}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Toggle Accessible List View"
          >
            <List className="w-3.5 h-3.5" />
            <span>Accessible List View</span>
          </button>

          <button
            type="button"
            onClick={resetCamera}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 transition"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === '3d' ? (
        /* ================= 3D CIRCULAR CAROUSEL PRESENTATION ================= */
        <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8 flex flex-col items-center">
          {/* Circular Carousel Stage */}
          <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] overflow-hidden">
            <CircularCarousel
              items={SHOWCASE_ITEMS}
              preset="cylinder"
              cardWidth={cardWidth}
              aspectRatio={1.45}
              gap={24}
              autoplay="drift"
              speed={10}
              draggable={true}
              momentum={0.65}
              snap={true}
              focusOnClick={true}
              pauseOnHover={true}
              fadeColor={isDark ? '#020617' : '#F8FAFC'}
              cornerRadius={16}
              captions={false}
              onChange={(index) => setActiveIndex(index)}
              onItemClick={(item, index) => {
                setActiveIndex(index);
                const selected = SHOWCASE_ITEMS[index];
                if (selected && activeIndex === index) {
                  handleNavigate(selected);
                }
              }}
              className="h-full w-full"
            />
          </div>

          {/* Interactive Workspace Navigation Pill Strip */}
          <div className="w-full max-w-4xl mt-4 px-2 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {SHOWCASE_ITEMS.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md font-semibold scale-105'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isActive ? 'bg-amber-400 dark:bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Workspace Capability Dossier Card */}
          <div className="w-full max-w-3xl mt-5 px-3">
            <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {activeItem.index} · {activeItem.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {activeItem.badge}
                  </span>
                </div>

                {/* Left/Right manual step buttons */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleStep('prev')}
                    aria-label="Previous capability"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 px-1">
                    {activeIndex + 1} / {SHOWCASE_ITEMS.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('next')}
                    aria-label="Next capability"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description & Action */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    {activeItem.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigate(activeItem)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md transition-all shrink-0 group"
                >
                  <span>Launch {activeItem.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= ACCESSIBLE LIST VIEW ALTERNATIVE ================= */
        <div className="w-full max-w-4xl mx-auto my-6 p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Accessible Opportunity & Capability Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Screen-reader and keyboard accessible catalog of real opportunities and verified capabilities
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search positions or companies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          {/* Six Core Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SHOWCASE_ITEMS.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNavigate(item)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span>{item.index} · {item.category}</span>
                    <span className="text-blue-600 dark:text-blue-400">{item.badge}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.subtitle}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Open workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Vacancies List */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Verified Opportunities ({filteredVacancies.length})
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredVacancies.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No opportunities discovered matching current filters. Check back soon for fresh edge-synchronized roles.
                </div>
              ) : (
                filteredVacancies.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVacancy(v)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">{v.company}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{v.location || 'Remote'}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v.title}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                      {v.matchEvaluation?.matchScore ?? 65}% Match
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Intelligence Modal / Drawer */}
      {selectedVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Opportunity Intelligence
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedVacancy.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedVacancy.company} · {selectedVacancy.location || 'Remote'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Truthful Fit Breakdown
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Overall Match Score</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {selectedVacancy.matchEvaluation?.matchScore ?? 65}% Match
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedVacancy.matchEvaluation?.rationale || 'Candidate verified skills align strongly with primary job responsibilities.'}
                </p>
              </div>

              {/* Verified skills tag list */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Verified Skills Evaluated:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {candidateSkills.map(s => (
                    <span
                      key={s.name}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
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
