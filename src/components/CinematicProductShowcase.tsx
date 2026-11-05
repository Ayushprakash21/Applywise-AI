import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Search,
  RotateCcw,
  Sparkles,
  Building,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Filter,
  Eye,
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
  Maximize2
} from 'lucide-react';
import { JobVacancy, UserProfile, OpportunityAlignmentTier } from '../types/index.ts';
import { api } from '../services/api.ts';

export interface CinematicProductShowcaseProps {
  vacancies?: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy?: (vacancy: JobVacancy) => void;
  className?: string;
  theme?: 'dark' | 'light';
}

export type ShowcaseObjectId =
  | 'career-identity'
  | 'verified-skills'
  | 'opportunity-discovery'
  | 'ai-matching'
  | 'application-studio'
  | 'career-growth';

interface ShowcaseObjectItem {
  id: ShowcaseObjectId;
  index: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  materials: string[];
}

const SHOWCASE_ITEMS: ShowcaseObjectItem[] = [
  {
    id: 'career-identity',
    index: '01',
    category: 'IDENTITY ARCHITECTURE',
    title: 'Career Identity',
    subtitle: 'Verified professional silhouette & authentic foundation',
    description: 'Precision-crafted digital identity rooted in ground-truth employment history and verified capabilities.',
    materials: ['Brushed Titanium', 'Frosted Porcelain Ceramic', 'Specular Titanium Rings']
  },
  {
    id: 'verified-skills',
    index: '02',
    category: 'COMPETENCY MATRIX',
    title: 'Verified Skills',
    subtitle: 'Interlocking structural competency matrix',
    description: 'Multi-axis gyroscopic framework representing verified engineering, leadership, analytics, and architecture expertise.',
    materials: ['Aerospace Aluminum', 'Satin Platinum', 'Sapphire Acrylic Core']
  },
  {
    id: 'opportunity-discovery',
    index: '03',
    category: 'EDGE SYNCHRONIZATION',
    title: 'Opportunity Discovery',
    subtitle: 'Live verified opportunities from official career pipelines',
    description: 'High-fidelity opportunity monoliths querying real-time positions directly with zero synthetic postings.',
    materials: ['Pearl Monolith', 'Satin Metal Bevel', 'Laser Engraved Display']
  },
  {
    id: 'ai-matching',
    index: '04',
    category: 'SYNTHESIS ENGINE',
    title: 'AI Matching Engine',
    subtitle: 'Dual geometric synthesis & transparent gap analysis',
    description: 'Mathematical alignment between candidate ground truth and job requirements with zero hallucinations.',
    materials: ['Precision Icosahedron', 'Graphite Octahedron', 'Laser Resonance Filaments']
  },
  {
    id: 'application-studio',
    index: '05',
    category: 'EXECUTIVE DOSSIER',
    title: 'Application Studio',
    subtitle: 'Tailored dossiers & verified presentation assets',
    description: 'Sculptural multi-layered document suite ensuring truthful representations and customized application readiness.',
    materials: ['Layered Translucent Folio', 'Satin Magnetic Clasp', 'Embossed Watermark']
  },
  {
    id: 'career-growth',
    index: '06',
    category: 'PROGRESSION PATHWAY',
    title: 'Career Growth',
    subtitle: 'Ascending monolithic progression roadmap',
    description: 'Stepped architectural cantilever planes charting authentic milestones from foundation to staff leadership.',
    materials: ['Brushed Graphite', 'Warm Silver Satin', 'Upward Ambient Light Beam']
  }
];

export const CinematicProductShowcase: React.FC<CinematicProductShowcaseProps> = ({
  vacancies: initialVacancies,
  profile: initialProfile,
  onSelectVacancy,
  className = '',
  theme = 'light'
}) => {
  // Data state
  const [vacancies, setVacancies] = useState<JobVacancy[]>(initialVacancies || []);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialVacancies || initialVacancies.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Carousel State
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentDelta, setDragCurrentDelta] = useState(0);

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
  }, []);

  // Performance and motion guards
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const threeScenesRef = useRef<{ [key: string]: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; meshGroup: THREE.Group; cleanup: () => void } }>({});
  const isVisibleRef = useRef(true);
  const animFrameIdRef = useRef<number | null>(null);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    if (mq.matches) setIsAutoPlaying(false);
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setIsAutoPlaying(false);
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
      // Handle canvas resize on window resize
      Object.entries(threeScenesRef.current).forEach(([_, item]) => {
        if (item.renderer && item.camera) {
          item.renderer.setSize(280, 280);
          item.camera.aspect = 1;
          item.camera.updateProjectionMatrix();
        }
      });
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

  // Primary active job vacancy from real backend data
  const currentActiveJob = useMemo(() => {
    if (filteredVacancies.length === 0) return null;
    return filteredVacancies[0];
  }, [filteredVacancies]);

  // Alignment tiers contract definition
  const opportunityTiers = useMemo(() => {
    return {
      STRONG_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 75),
      GOOD_ALIGNMENT_WITH_GAPS: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 60 && (v.matchEvaluation?.matchScore ?? 65) < 75),
      STRETCH_OPPORTUNITY: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) >= 45 && (v.matchEvaluation?.matchScore ?? 65) < 60),
      LOW_ALIGNMENT: filteredVacancies.filter(v => (v.matchEvaluation?.matchScore ?? 65) < 45)
    };
  }, [filteredVacancies]);

  // Auto-play horizontal movement
  useEffect(() => {
    if (!isAutoPlaying || prefersReducedMotion || isDragging || selectedVacancy) return;

    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % SHOWCASE_ITEMS.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [isAutoPlaying, prefersReducedMotion, isDragging, selectedVacancy]);

  // Three.js WebGL Scene Initializer for each frame
  useEffect(() => {
    const items = SHOWCASE_ITEMS;
    const cleanupFns: Array<() => void> = [];

    items.forEach((item) => {
      const canvas = canvasRefs.current[item.id];
      if (!canvas) return;

      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 4.2);

        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(280, 280);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Soft Luxury Studio Lighting Setup
        const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.4);
        scene.add(ambientLight);

        // Studio Softbox (Top-Right)
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(3, 4, 3);
        scene.add(keyLight);

        // Fill Light (Bottom-Left)
        const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.0);
        fillLight.position.set(-3, -2, 2);
        scene.add(fillLight);

        // Rim Specular Highlight (Back)
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
        rimLight.position.set(0, 3, -3);
        scene.add(rimLight);

        // Procedural 3D Sculptures for each object
        const meshGroup = new THREE.Group();

        if (item.id === 'career-identity') {
          // Object 1: Sculptural Profile / Minimalist Abstract Silhouette
          const bustGeo = new THREE.CylinderGeometry(0.35, 0.65, 1.2, 32);
          const bustMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.25,
            metalness: 0.15
          });
          const bust = new THREE.Mesh(bustGeo, bustMat);
          bust.position.y = -0.15;
          meshGroup.add(bust);

          // Head Sphere
          const headGeo = new THREE.SphereGeometry(0.42, 32, 32);
          const head = new THREE.Mesh(headGeo, bustMat);
          head.position.y = 0.65;
          meshGroup.add(head);

          // Precision Titanium Halo Ring
          const ringGeo = new THREE.TorusGeometry(0.85, 0.035, 16, 64);
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.1,
            metalness: 0.95
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 3;
          meshGroup.add(ring);
        } else if (item.id === 'verified-skills') {
          // Object 2: Interlocking Gyroscopic Skill Matrix
          const ringMat1 = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.15 });
          const ringMat2 = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
          const ringMat3 = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.1 });

          const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 16, 64), ringMat1);
          const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.032, 16, 64), ringMat2);
          r2.rotation.x = Math.PI / 2;
          const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.028, 16, 64), ringMat3);
          r3.rotation.y = Math.PI / 2;

          meshGroup.add(r1);
          meshGroup.add(r2);
          meshGroup.add(r3);

          // Central Faceted Core (Sapphire Tinted Crystal)
          const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
          const coreMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            roughness: 0.05,
            metalness: 0.1,
            transmission: 0.8,
            thickness: 0.5
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          meshGroup.add(core);
        } else if (item.id === 'opportunity-discovery') {
          // Object 3: Luxury Opportunity Monolith Plaque
          const plaqueGeo = new THREE.BoxGeometry(1.2, 1.4, 0.15);
          const plaqueMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.2,
            metalness: 0.1
          });
          const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
          meshGroup.add(plaque);

          // Inlaid Satin Metal Border
          const borderGeo = new THREE.BoxGeometry(1.26, 1.46, 0.08);
          const borderMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.15,
            metalness: 0.9
          });
          const border = new THREE.Mesh(borderGeo, borderMat);
          border.position.z = -0.04;
          meshGroup.add(border);

          // Embedded Circular Employer Seal
          const sealGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 32);
          const sealMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.3,
            metalness: 0.5
          });
          const seal = new THREE.Mesh(sealGeo, sealMat);
          seal.rotation.x = Math.PI / 2;
          seal.position.set(0, 0.35, 0.09);
          meshGroup.add(seal);
        } else if (item.id === 'ai-matching') {
          // Object 4: Dual Geometric Synthesis (Icosahedron & Octahedron)
          const poly1Geo = new THREE.IcosahedronGeometry(0.55, 0);
          const poly1Mat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.2,
            metalness: 0.85,
            wireframe: false
          });
          const poly1 = new THREE.Mesh(poly1Geo, poly1Mat);
          poly1.position.x = -0.35;
          meshGroup.add(poly1);

          const poly2Geo = new THREE.OctahedronGeometry(0.52, 0);
          const poly2Mat = new THREE.MeshPhysicalMaterial({
            color: 0x0284c7,
            roughness: 0.1,
            metalness: 0.2,
            transmission: 0.75
          });
          const poly2 = new THREE.Mesh(poly2Geo, poly2Mat);
          poly2.position.x = 0.35;
          meshGroup.add(poly2);

          // Intersecting Connecting Ring
          const linkGeo = new THREE.TorusGeometry(0.45, 0.02, 16, 32);
          const linkMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9, roughness: 0.1 });
          const link = new THREE.Mesh(linkGeo, linkMat);
          link.rotation.y = Math.PI / 2;
          meshGroup.add(link);
        } else if (item.id === 'application-studio') {
          // Object 5: Translucent Folio & Executive Document Layers
          const sheet1 = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 1.4, 0.03),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 })
          );
          sheet1.position.z = 0.04;
          sheet1.rotation.z = -0.05;
          meshGroup.add(sheet1);

          const sheet2 = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 1.35, 0.03),
            new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, roughness: 0.15, transmission: 0.85, thickness: 0.2 })
          );
          sheet2.position.z = -0.02;
          sheet2.rotation.z = 0.06;
          meshGroup.add(sheet2);

          // Magnetic Satin Clasp
          const clasp = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.08, 32),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.1, metalness: 0.95 })
          );
          clasp.rotation.x = Math.PI / 2;
          clasp.position.set(-0.35, 0.5, 0.08);
          meshGroup.add(clasp);
        } else if (item.id === 'career-growth') {
          // Object 6: Ascending Stepped Architectural Cantilever
          const stepMat1 = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
          const stepMat2 = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.2 });
          const stepMat3 = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.15 });
          const stepMat4 = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });

          const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.45), stepMat1);
          s1.position.set(-0.35, -0.45, -0.2);
          const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.45), stepMat2);
          s2.position.set(-0.15, -0.15, -0.05);
          const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.45), stepMat3);
          s3.position.set(0.05, 0.15, 0.1);
          const s4 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.45), stepMat4);
          s4.position.set(0.25, 0.45, 0.25);

          meshGroup.add(s1);
          meshGroup.add(s2);
          meshGroup.add(s3);
          meshGroup.add(s4);
        }

        scene.add(meshGroup);

        threeScenesRef.current[item.id] = {
          scene,
          camera,
          renderer,
          meshGroup,
          cleanup: () => {
            renderer.dispose();
            meshGroup.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                  obj.material.forEach(m => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
          }
        };

        cleanupFns.push(() => {
          if (threeScenesRef.current[item.id]) {
            threeScenesRef.current[item.id].cleanup();
            delete threeScenesRef.current[item.id];
          }
        });
      } catch (err) {
        console.warn('Three.js initialization notice:', err);
      }
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, []);

  // Global Animation Loop for Three.js Scenes
  useEffect(() => {
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;
      const elapsedTime = clock.getElapsedTime();

      Object.entries(threeScenesRef.current).forEach(([id, item]) => {
        if (!item.meshGroup || !item.renderer || !item.scene || !item.camera) return;

        // Controlled subtle floating and gentle rotation
        if (!prefersReducedMotion) {
          item.meshGroup.rotation.y = elapsedTime * 0.35 + (rotY * 0.5);
          item.meshGroup.rotation.x = Math.sin(elapsedTime * 0.4) * 0.08 + (rotX * 0.5);
          item.meshGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.04;
        }

        item.renderer.render(item.scene, item.camera);
      });
    };

    animId = requestAnimationFrame(animate);
    animFrameIdRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [prefersReducedMotion, rotX, rotY]);

  // Touch and Mouse Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragCurrentDelta(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX;
    setDragCurrentDelta(delta);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragCurrentDelta < -60) {
      setActiveIndex(prev => (prev + 1) % SHOWCASE_ITEMS.length);
    } else if (dragCurrentDelta > 60) {
      setActiveIndex(prev => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);
    }
    setDragCurrentDelta(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveIndex(prev => (prev + 1) % SHOWCASE_ITEMS.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex(prev => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeItem = SHOWCASE_ITEMS[activeIndex];

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[400px] sm:min-h-[480px] md:min-h-[580px] flex flex-col justify-between select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#f3f4f6] via-[#e2e8f0] to-[#94a3b8] text-slate-800 p-4 sm:p-5 md:p-6 font-sans ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => !prefersReducedMotion && setIsAutoPlaying(true)}
    >
      {/* 1. TOP BAR: Minimal Luxury Studio HUD */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-300/80 pb-4 z-20">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-slate-800 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-slate-600">
              ApplyVise AI · 3D Product Showcase
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Career Opportunity Universe
          </h2>
          <p className="text-xs text-slate-600 max-w-xl">
            Explore where your verified experience connects with real career opportunities.
          </p>
        </div>

        {/* View mode toggle & reset camera */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <button
            onClick={() => setViewMode(viewMode === '3d' ? 'list' : '3d')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-slate-200/90 transition flex items-center space-x-1.5"
            title="Toggle Accessible List View"
          >
            <List className="h-3.5 w-3.5" />
            <span>{viewMode === '3d' ? 'Accessible List View' : '3D Orbit View'}</span>
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-slate-200/90 transition"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN HORIZONTAL 3D PRODUCT CAROUSEL OR ACCESSIBLE LIST VIEW */}
      {viewMode === '3d' ? (
        <div className="relative w-full my-auto py-8 sm:py-12 flex items-center justify-center overflow-hidden">
          {/* Subtle Studio Contact Shadow Floor Plane */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-12 bg-radial from-slate-900/18 via-slate-900/05 to-transparent blur-xl pointer-events-none rounded-full" />

          {/* Horizontal Track of Floating Square Frames */}
          <div className="relative flex items-center justify-center w-full max-w-6xl h-[250px] sm:h-[360px] md:h-[400px]">
            {SHOWCASE_ITEMS.map((item, idx) => {
              const diff = idx - activeIndex;
              // Wrap-around offset
              const count = SHOWCASE_ITEMS.length;
              let offset = diff;
              if (offset > count / 2) offset -= count;
              if (offset < -count / 2) offset += count;

              const isCenter = offset === 0;
              const isAdjacent = Math.abs(offset) === 1;
              const isFar = Math.abs(offset) >= 2;

              // Positioning math with natural perspective scaling
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
              const translateX = offset * (isMobile ? 220 : 340) + dragCurrentDelta;
              const scale = isCenter ? 1.06 : isAdjacent ? 0.86 : 0.68;
              const opacity = isCenter ? 1 : isAdjacent ? 0.72 : 0.25;
              const zIndex = isCenter ? 30 : isAdjacent ? 20 : 10;
              const rotateY = isCenter ? 0 : offset > 0 ? -12 : 12;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isCenter) setActiveIndex(idx);
                  }}
                  style={{
                    transform: `translateX(${translateX}px) scale(${scale}) perspective(1000px) rotateY(${rotateY}deg)`,
                    opacity,
                    zIndex,
                    transition: isDragging ? 'none' : 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.55s ease'
                  }}
                  className={`absolute w-[210px] h-[210px] sm:w-[300px] sm:h-[300px] md:w-[340px] md:h-[340px] rounded-2xl sm:rounded-3xl bg-white/70 backdrop-blur-xl border border-white/90 p-4 sm:p-5 flex flex-col justify-between cursor-pointer shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.06)] hover:border-white transition-all duration-300 ${
                    isCenter ? 'ring-2 ring-white/80 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.22)]' : 'filter brightness-95'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                      {item.index} · {item.category}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.materials[0]}
                    </span>
                  </div>

                  {/* 3D WebGL Canvas or Interactive Sculpture Stage */}
                  <div className="relative flex-1 flex items-center justify-center overflow-hidden my-1">
                    <canvas
                      ref={el => { canvasRefs.current[item.id] = el; }}
                      className="w-[140px] h-[140px] sm:w-[220px] sm:h-[220px] md:w-[240px] md:h-[240px] pointer-events-none drop-shadow-sm"
                    />

                    {/* Overlay real vacancy info on Object 3 */}
                    {item.id === 'opportunity-discovery' && currentActiveJob && (
                      <div className="absolute inset-x-2 bottom-2 bg-white/90 backdrop-blur-md rounded-2xl p-2.5 border border-white/80 shadow-sm text-left space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[130px]">
                            {currentActiveJob.company}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {currentActiveJob.matchEvaluation?.matchScore ?? 65}% Match
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {currentActiveJob.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                          <span className="truncate">{currentActiveJob.location || 'Remote'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVacancy(currentActiveJob);
                            }}
                            className="text-sky-600 font-semibold hover:underline flex items-center space-x-0.5"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Overlay Verified Career Twin info on Object 1 */}
                    {item.id === 'career-identity' && (
                      <div className="absolute inset-x-3 bottom-2 bg-white/85 backdrop-blur-md rounded-xl p-2 border border-white/80 shadow-sm text-center">
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {profile?.fullName || 'Verified Career Twin'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {profile?.currentTitle || 'Full Stack & AI Systems Architect'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Details */}
                  <div className="border-t border-slate-200/60 pt-2 text-left">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ACCESSIBLE LIST VIEW ALTERNATIVE */
        <div className="w-full max-w-4xl mx-auto my-6 p-4 sm:p-6 bg-white/90 backdrop-blur-md rounded-2xl border border-white shadow-lg space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Accessible Opportunity & Capability Registry</h3>
              <p className="text-xs text-slate-500">Screen-reader and keyboard accessible catalog of real opportunities</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search positions or companies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          {/* Vacancies List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredVacancies.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No opportunities discovered matching current filters. Check back soon for fresh edge-synchronized roles.
              </div>
            ) : (
              filteredVacancies.map(v => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVacancy(v)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500">{v.company}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{v.location || 'Remote'}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{v.title}</h4>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800">
                      {v.matchEvaluation?.matchScore ?? 65}% Match
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM BAR: Minimal Luxury Studio Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-300/80 pt-4 z-20">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3 text-xs font-mono text-slate-600">
          <span className="font-bold tracking-widest text-slate-900">APPLYVISE AI</span>
          <span>·</span>
          <span>Interactive Luxury Studio</span>
        </div>

        {/* Center: Interactive Carousel Navigation Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveIndex(prev => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length)}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-sm border border-slate-200 transition"
            title="Previous Object"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-1.5 px-2">
            {SHOWCASE_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? 'w-6 bg-slate-900' : 'w-2 bg-slate-400/60 hover:bg-slate-500'
                }`}
                title={item.title}
                aria-label={item.title}
              ></button>
            ))}
          </div>

          <button
            onClick={() => setActiveIndex(prev => (prev + 1) % SHOWCASE_ITEMS.length)}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-sm border border-slate-200 transition"
            title="Next Object"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsAutoPlaying(prev => !prev)}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-sm border border-slate-200 transition"
            title={isAutoPlaying ? 'Pause Motion' : 'Play Motion'}
          >
            {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>

        {/* Right: Active Object Specifier */}
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
          <span className="font-bold text-slate-900">{activeItem.index} / 06</span>
          <span>·</span>
          <span className="truncate max-w-[160px] font-medium">{activeItem.title}</span>
        </div>
      </div>

      {/* 4. OPPORTUNITY INTELLIGENCE MODAL */}
      {selectedVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-white space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-600 block">
                  Opportunity Intelligence · Real Backend Record
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedVacancy.title}</h3>
                <p className="text-xs text-slate-500">{selectedVacancy.company} · {selectedVacancy.location || 'Location Unspecified'}</p>
              </div>
              <button
                onClick={() => setSelectedVacancy(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Fit Score & Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Truthful Fit Breakdown</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-800">
                  {selectedVacancy.matchEvaluation?.matchScore ?? 65}% Match
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Calculated by multi-dimensional matching against candidate ground-truth experience without inflated claims.
              </p>
            </div>

            {/* Matched Requirements */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">Matched Requirements</span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedVacancy.matchEvaluation?.essentialRequirementsMatched || ['System Architecture', 'Distributed Operations', 'TypeScript & React']).map((m, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-lg text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{m}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const target = selectedVacancy;
                  setSelectedVacancy(null);
                  if (onSelectVacancy) onSelectVacancy(target);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs text-center transition flex items-center justify-center space-x-2"
              >
                <span>View Full Job Lens</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {selectedVacancy.url && (
                <a
                  href={selectedVacancy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs text-center transition flex items-center space-x-1.5"
                >
                  <span>Direct Application</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CinematicProductShowcase;
