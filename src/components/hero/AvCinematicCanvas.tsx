// src/components/hero/AvCinematicCanvas.tsx
// APPLYWISE AI — NEON PILGRIM BENEATH THE AV MONOGRAM
// Cinematic Multi-Layered Canvas Animation Engine
// Animates Image 2: Flowing Blue & Gold Energy Ribbons, AV Monogram Edge Sweep,
// Volumetric Glow, Career Symbols Sequential Flares, Pilgrim Ground Reflections & Interactive Parallax.

import React, { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface BezierRibbon {
  id: string;
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
  color: 'blue' | 'gold' | 'mixed';
  width: number;
  speed: number;
  phaseOffset: number;
}

interface RibbonParticle {
  ribbonIndex: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  flutterPhase: number;
}

interface StardustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

const CAREER_SYMBOLS = [
  { name: 'briefcase', x: 538, y: 88, triggerStart: 4.0, triggerEnd: 5.2 },
  { name: 'growthLeft', x: 348, y: 228, triggerStart: 4.4, triggerEnd: 5.6 },
  { name: 'growthRight', x: 828, y: 108, triggerStart: 4.8, triggerEnd: 6.0 },
  { name: 'achievement', x: 842, y: 168, triggerStart: 5.2, triggerEnd: 6.4 },
  { name: 'graduation', x: 948, y: 262, triggerStart: 5.6, triggerEnd: 6.8 },
];

export interface AvCinematicCanvasProps {
  className?: string;
  imageSrc?: string;
  isFullBleed?: boolean;
}

export const AvCinematicCanvas: React.FC<AvCinematicCanvasProps> = ({
  className = '',
  imageSrc = '/hero/av-pilgrim-hero.jpg',
  isFullBleed = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Parallax pointer target
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const isVisibleRef = useRef<boolean>(true);
  const prefersReducedMotionRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Pre-calculated vector splines for the prominent energy ribbons from Image 2
  const ribbonsRef = useRef<BezierRibbon[]>([
    // Ribbon 1: Bottom left sweeping into central gateway
    {
      id: 'ribbon-bottom-left',
      p0: { x: 0, y: 520 },
      p1: { x: 190, y: 470 },
      p2: { x: 390, y: 505 },
      p3: { x: 615, y: 435 },
      color: 'blue',
      width: 4.5,
      speed: 0.18,
      phaseOffset: 0.0,
    },
    // Ribbon 2: Mid-left upward energy plume
    {
      id: 'ribbon-mid-left',
      p0: { x: 40, y: 410 },
      p1: { x: 230, y: 340 },
      p2: { x: 430, y: 380 },
      p3: { x: 580, y: 420 },
      color: 'gold',
      width: 3.5,
      speed: 0.22,
      phaseOffset: 0.25,
    },
    // Ribbon 3: Left ethereal face flow toward AV crown
    {
      id: 'ribbon-face-left',
      p0: { x: 260, y: 260 },
      p1: { x: 380, y: 200 },
      p2: { x: 480, y: 185 },
      p3: { x: 560, y: 215 },
      color: 'blue',
      width: 3.0,
      speed: 0.15,
      phaseOffset: 0.45,
    },
    // Ribbon 4: Top crest sweeping across toward upper right
    {
      id: 'ribbon-top-crest',
      p0: { x: 560, y: 180 },
      p1: { x: 710, y: 135 },
      p2: { x: 870, y: 115 },
      p3: { x: 1024, y: 145 },
      color: 'mixed',
      width: 3.5,
      speed: 0.16,
      phaseOffset: 0.1,
    },
    // Ribbon 5: Right sweeping swirl down into horizon portal
    {
      id: 'ribbon-right-swirl',
      p0: { x: 1024, y: 375 },
      p1: { x: 890, y: 310 },
      p2: { x: 770, y: 365 },
      p3: { x: 650, y: 435 },
      color: 'gold',
      width: 4.0,
      speed: 0.2,
      phaseOffset: 0.6,
    },
    // Ribbon 6: Ground reflection path converging toward pilgrim's feet
    {
      id: 'ribbon-ground-path',
      p0: { x: 635, y: 576 },
      p1: { x: 610, y: 510 },
      p2: { x: 645, y: 460 },
      p3: { x: 635, y: 420 },
      color: 'mixed',
      width: 5.0,
      speed: 0.24,
      phaseOffset: 0.35,
    },
  ]);

  // Directed particles travelling along ribbon curves
  const particlesRef = useRef<RibbonParticle[]>([]);
  // Ambient cosmic stardust particles
  const motesRef = useRef<StardustMote[]>([]);

  // Cubic Bezier interpolation
  const getCubicBezierPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
  };

  // Pre-seed particles and motes
  useEffect(() => {
    // Generate 75 ribbon particles
    const ribbonParts: RibbonParticle[] = [];
    const colors = [
      'rgba(32, 185, 243, 0.95)', // Electric Blue
      'rgba(112, 225, 255, 0.9)', // Ice Blue
      'rgba(235, 175, 65, 0.95)', // Warm Gold
      'rgba(255, 215, 107, 0.9)', // Bright Gold
      'rgba(255, 255, 255, 0.95)', // Pure White Spark
    ];

    for (let i = 0; i < 75; i++) {
      ribbonParts.push({
        ribbonIndex: Math.floor(Math.random() * ribbonsRef.current.length),
        progress: Math.random(),
        speed: 0.08 + Math.random() * 0.12,
        size: 1.2 + Math.random() * 2.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.4 + Math.random() * 0.6,
        flutterPhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = ribbonParts;

    // Generate 45 cosmic stardust motes
    const motes: StardustMote[] = [];
    for (let i = 0; i < 45; i++) {
      motes.push({
        x: Math.random() * 1024,
        y: Math.random() * 576,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.1 - Math.random() * 0.25,
        size: 0.8 + Math.random() * 1.8,
        baseAlpha: 0.2 + Math.random() * 0.5,
        twinkleSpeed: 1.2 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    motesRef.current = motes;
  }, []);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load the Image 2 artwork
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      baseImageRef.current = img;
      setImageLoaded(true);
      setLoadError(false);
    };

    img.onerror = () => {
      console.warn('Failed to load primary AV artwork at:', imageSrc);
      setLoadError(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc]);

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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  // Pointer movement tracking for cinematic parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotionRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1
    mouseRef.current.targetX = nx * 8; // max 8px parallax
    mouseRef.current.targetY = ny * 5; // max 5px parallax
  };

  const handleMouseLeave = () => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    const cycleDuration = 10.0; // 10-second seamless cinematic loop

    const render = (now: number) => {
      animFrameIdRef.current = requestAnimationFrame(render);

      if (!isVisibleRef.current) return;

      const elapsed = (now - startTime) / 1000;
      const cycleTime = elapsed % cycleDuration; // 0 to 10 seconds

      // Timeline Phase calculations (8-12s timeline specification):
      // 0-2s: Emerging atmospheric illumination, blue energy wakes up
      // 2-4s: Ribbons active, light travels towards AV
      // 4-6s: AV edges illuminate, symbols sequential highlights
      // 6-8s: Peak illumination & ground reflection settle
      // 8-10s: Seamless transition back to base loop

      let intensity = 1.0;
      if (cycleTime < 2.0) {
        // Emerging (0 to 2s)
        intensity = 0.5 + 0.3 * (cycleTime / 2.0);
      } else if (cycleTime < 4.0) {
        // Ignition (2 to 4s)
        intensity = 0.8 + 0.2 * ((cycleTime - 2.0) / 2.0);
      } else if (cycleTime < 6.0) {
        // Peak AV sweep (4 to 6s)
        intensity = 1.0 + 0.25 * Math.sin(((cycleTime - 4.0) / 2.0) * Math.PI);
      } else if (cycleTime < 8.0) {
        // Golden radiance (6 to 8s)
        intensity = 1.15 - 0.2 * ((cycleTime - 6.0) / 2.0);
      } else {
        // Settle & smooth loop (8 to 10s)
        intensity = 0.95 - 0.45 * ((cycleTime - 8.0) / 2.0);
      }

      // Smooth mouse lerp for camera parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      // Handle High-DPI canvas projection (tuned for 1080p, 1440p and 4K displays)
      const width = 1024;
      const height = 576;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // LAYER 1: BASE ARTWORK (High-Resolution Image 2)
      if (baseImageRef.current) {
        // Draw image with subtle camera parallax offset
        ctx.save();
        ctx.translate(px * 0.4, py * 0.4);
        ctx.drawImage(baseImageRef.current, -8, -6, width + 16, height + 12);
        ctx.restore();
      } else {
        // High-contrast deep navy cosmic fallback
        const bgGrad = ctx.createRadialGradient(width * 0.62, height * 0.45, 40, width * 0.62, height * 0.45, width * 0.7);
        bgGrad.addColorStop(0, '#10223D');
        bgGrad.addColorStop(0.5, '#0A1322');
        bgGrad.addColorStop(1, '#050912');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // If prefers-reduced-motion, stop here with pristine static image
      if (prefersReducedMotionRef.current) {
        ctx.restore();
        return;
      }

      // LAYER 2: VOLUMETRIC GOLDEN PILLAR BEHIND THE AV MONOGRAM
      // Sits at (620, 395) rising into the cosmic sky
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const beamAlpha = Math.max(0.08, Math.min(0.28, 0.14 * intensity));
      const beamGrad = ctx.createLinearGradient(620, 420, 620, 80);
      beamGrad.addColorStop(0, `rgba(240, 180, 50, ${beamAlpha * 1.5})`);
      beamGrad.addColorStop(0.4, `rgba(235, 160, 40, ${beamAlpha * 0.9})`);
      beamGrad.addColorStop(0.8, `rgba(32, 185, 243, ${beamAlpha * 0.5})`);
      beamGrad.addColorStop(1, 'rgba(32, 185, 243, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(590, 420);
      ctx.lineTo(570, 80);
      ctx.lineTo(670, 80);
      ctx.lineTo(650, 420);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // LAYER 3: DYNAMIC ENERGY RIBBON LIGHT STREAKS
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      ribbonsRef.current.forEach(ribbon => {
        const ribbonProgress = (elapsed * ribbon.speed + ribbon.phaseOffset) % 1.0;

        // Sample 24 points along the cubic bezier
        const pointsCount = 24;
        const curvePoints: Point[] = [];
        for (let i = 0; i <= pointsCount; i++) {
          curvePoints.push(getCubicBezierPoint(ribbon.p0, ribbon.p1, ribbon.p2, ribbon.p3, i / pointsCount));
        }

        // Render moving light pulse along the spline
        const pulseCenterIdx = Math.floor(ribbonProgress * pointsCount);
        const pulseSpan = 8; // Length of the energetic pulse segment

        const startIdx = Math.max(0, pulseCenterIdx - pulseSpan);
        const endIdx = Math.min(pointsCount, pulseCenterIdx + pulseSpan);

        if (startIdx < endIdx) {
          ctx.beginPath();
          ctx.moveTo(curvePoints[startIdx].x, curvePoints[startIdx].y);
          for (let j = startIdx + 1; j <= endIdx; j++) {
            ctx.lineTo(curvePoints[j].x, curvePoints[j].y);
          }

          const grad = ctx.createLinearGradient(
            curvePoints[startIdx].x,
            curvePoints[startIdx].y,
            curvePoints[endIdx].x,
            curvePoints[endIdx].y
          );

          const isGold = ribbon.color === 'gold' || (ribbon.color === 'mixed' && Math.sin(elapsed) > 0);
          const colorMain = isGold ? 'rgba(235, 175, 65,' : 'rgba(32, 185, 243,';
          const colorCore = isGold ? 'rgba(255, 225, 130,' : 'rgba(150, 235, 255,';

          const strokeAlpha = 0.5 * intensity;
          grad.addColorStop(0, `${colorMain} 0)`);
          grad.addColorStop(0.5, `${colorCore} ${strokeAlpha})`);
          grad.addColorStop(1, `${colorMain} 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = ribbon.width * (1.0 + 0.3 * Math.sin(elapsed * 2 + ribbon.phaseOffset));
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });
      ctx.restore();

      // LAYER 4: GUIDED PARTICLES FOLLOWING THE ENERGY RIBBONS
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      particlesRef.current.forEach(pt => {
        pt.progress += pt.speed * 0.016; // advance along spline
        if (pt.progress > 1.0) {
          pt.progress = 0;
          pt.ribbonIndex = Math.floor(Math.random() * ribbonsRef.current.length);
        }

        const ribbon = ribbonsRef.current[pt.ribbonIndex];
        const basePoint = getCubicBezierPoint(ribbon.p0, ribbon.p1, ribbon.p2, ribbon.p3, pt.progress);

        // Subtle lateral flutter
        const flutter = Math.sin(elapsed * 4 + pt.flutterPhase) * 3;
        const drawX = basePoint.x + flutter + px * 0.8;
        const drawY = basePoint.y + py * 0.8;

        // Radial particle glow
        const rad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, pt.size * 2.5);
        rad.addColorStop(0, pt.color);
        rad.addColorStop(1, 'rgba(32, 185, 243, 0)');

        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(drawX, drawY, pt.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // LAYER 5: AV MONOGRAM LIGHT SWEEP (Edge perimeter illumination)
      // Vertices of giant AV monogram:
      // A apex: (550, 215), A left base: (455, 395), A right base: (645, 395), crossbar: (490, 325)-(610, 325)
      // V apex: (550, 215) down to (675, 395), up to (805, 215)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Sweep active during cycle phases 3.5s to 7.5s
      if (cycleTime >= 3.0 && cycleTime <= 8.5) {
        const sweepProgress = (cycleTime - 3.0) / 5.5; // 0 to 1
        const sweepAlpha = Math.sin(sweepProgress * Math.PI) * 0.85;

        // Light sweep along letter 'A'
        const aSegments = [
          { from: { x: 455, y: 395 }, to: { x: 550, y: 215 } },
          { from: { x: 550, y: 215 }, to: { x: 645, y: 395 } },
          { from: { x: 490, y: 325 }, to: { x: 610, y: 325 } },
        ];

        // Light sweep along letter 'V'
        const vSegments = [
          { from: { x: 550, y: 215 }, to: { x: 675, y: 395 } },
          { from: { x: 675, y: 395 }, to: { x: 805, y: 215 } },
        ];

        [...aSegments, ...vSegments].forEach((seg, idx) => {
          const segProgress = (sweepProgress * 2.5 + idx * 0.2) % 1.0;
          const sx = seg.from.x + (seg.to.x - seg.from.x) * segProgress;
          const sy = seg.from.y + (seg.to.y - seg.from.y) * segProgress;

          // Traveling laser pulse
          const pulseGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
          pulseGrad.addColorStop(0, `rgba(255, 255, 255, ${sweepAlpha})`);
          pulseGrad.addColorStop(0.3, `rgba(32, 185, 243, ${sweepAlpha * 0.8})`);
          pulseGrad.addColorStop(0.7, `rgba(235, 175, 65, ${sweepAlpha * 0.4})`);
          pulseGrad.addColorStop(1, 'rgba(32, 185, 243, 0)');

          ctx.fillStyle = pulseGrad;
          ctx.beginPath();
          ctx.arc(sx, sy, 28, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Breathing golden warmth inside AV portal
      const portalGlow = ctx.createRadialGradient(625, 330, 20, 625, 330, 140);
      const portalAlpha = 0.12 * (0.8 + 0.3 * Math.sin(elapsed * 1.5));
      portalGlow.addColorStop(0, `rgba(255, 215, 100, ${portalAlpha * 1.6})`);
      portalGlow.addColorStop(0.6, `rgba(230, 150, 40, ${portalAlpha * 0.8})`);
      portalGlow.addColorStop(1, 'rgba(230, 150, 40, 0)');
      ctx.fillStyle = portalGlow;
      ctx.beginPath();
      ctx.arc(625, 330, 140, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // LAYER 6: PILGRIM SPECULAR GROUND REFLECTIONS
      // Pilgrim coordinates: (635, 415)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const reflectAlpha = 0.25 * intensity;
      const reflectGrad = ctx.createRadialGradient(635, 428, 2, 635, 435, 45);
      reflectGrad.addColorStop(0, `rgba(180, 235, 255, ${reflectAlpha})`);
      reflectGrad.addColorStop(0.5, `rgba(32, 185, 243, ${reflectAlpha * 0.6})`);
      reflectGrad.addColorStop(0.8, `rgba(235, 175, 65, ${reflectAlpha * 0.3})`);
      reflectGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = reflectGrad;
      ctx.beginPath();
      ctx.ellipse(635, 432, 45, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // LAYER 7: CAREER UNIVERSE SYMBOLS (Sequential lens flare highlights)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      CAREER_SYMBOLS.forEach(sym => {
        // Triggered in timed sequence
        if (cycleTime >= sym.triggerStart && cycleTime <= sym.triggerEnd) {
          const symProgress = (cycleTime - sym.triggerStart) / (sym.triggerEnd - sym.triggerStart);
          const flareAlpha = Math.sin(symProgress * Math.PI) * 0.9;

          // Soft radial flare
          const flareGrad = ctx.createRadialGradient(sym.x, sym.y, 1, sym.x, sym.y, 24);
          flareGrad.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha})`);
          flareGrad.addColorStop(0.3, `rgba(32, 185, 243, ${flareAlpha * 0.8})`);
          flareGrad.addColorStop(0.7, `rgba(235, 175, 65, ${flareAlpha * 0.35})`);
          flareGrad.addColorStop(1, 'rgba(32, 185, 243, 0)');

          ctx.fillStyle = flareGrad;
          ctx.beginPath();
          ctx.arc(sym.x, sym.y, 24, 0, Math.PI * 2);
          ctx.fill();

          // Delicate 4-point star specular flare
          ctx.strokeStyle = `rgba(255, 255, 255, ${flareAlpha * 0.85})`;
          ctx.lineWidth = 1;

          const armLength = 12 * Math.sin(symProgress * Math.PI);
          ctx.beginPath();
          ctx.moveTo(sym.x - armLength, sym.y);
          ctx.lineTo(sym.x + armLength, sym.y);
          ctx.moveTo(sym.x, sym.y - armLength);
          ctx.lineTo(sym.x, sym.y + armLength);
          ctx.stroke();

          // Subtle expanding ring
          ctx.strokeStyle = `rgba(32, 185, 243, ${flareAlpha * 0.45})`;
          ctx.beginPath();
          ctx.arc(sym.x, sym.y, 14 + symProgress * 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.restore();

      // LAYER 8: AMBIENT STARDUST MOTES
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      motesRef.current.forEach(m => {
        m.x += m.vx;
        m.y += m.vy;

        // Wrap around canvas
        if (m.y < 0) m.y = height;
        if (m.x < 0) m.x = width;
        if (m.x > width) m.x = 0;

        const twinkle = Math.sin(elapsed * m.twinkleSpeed + m.phase);
        const moteAlpha = m.baseAlpha * (0.6 + 0.4 * twinkle);

        ctx.fillStyle = `rgba(210, 240, 255, ${moteAlpha})`;
        ctx.beginPath();
        ctx.arc(m.x + px * 0.2, m.y + py * 0.2, m.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.restore(); // Final restore from DPI scale
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [imageLoaded]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isFullBleed ? 'h-full overflow-hidden' : 'aspect-[16/9] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10'} select-none bg-[#080F1C] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-testid="av-cinematic-canvas-container"
    >
      {/* High-Resolution Dynamic Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block av-canvas-element"
        aria-label="ApplyWise AI — Neon Pilgrim Beneath the AV Monogram Animated Artwork"
        role="img"
      />

      {/* Fallback image if canvas or WebGL unavailable */}
      <noscript>
        <img
          src={imageSrc}
          alt="ApplyWise AI — Neon Pilgrim Beneath the AV Monogram Artwork"
          className="w-full h-full object-cover av-canvas-element"
        />
      </noscript>

      {/* Loading Shimmer Placeholder */}
      {!imageLoaded && !loadError && (
        <div
          className="absolute inset-0 bg-[#080F1C] flex items-center justify-center animate-pulse"
          aria-hidden="true"
        >
          <div className="w-16 h-16 rounded-full border-2 border-[#20B9F3]/30 border-t-[#20B9F3] animate-spin" />
        </div>
      )}

      {/* Subtle Cinematic Vignette Overlay (for standalone non-bleed use only) */}
      {!isFullBleed && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080F1C]/70 via-transparent to-[#080F1C]/30"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default AvCinematicCanvas;
