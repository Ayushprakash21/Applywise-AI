// src/components/hero/CareerAscentCanvas.tsx
// High-performance, immersive 3D architectural environment for ApplyWise AI "THE CAREER ASCENT"
// Built using Three.js with transparent blue glass, electric-blue edges, ascending platforms, and interactive camera.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export interface CareerAscentCanvasProps {
  activeStage?: number; // 1 to 5
  onSelectStage?: (stage: number) => void;
  isDark?: boolean;
  className?: string;
}

interface StageConfig {
  id: number;
  label: string;
  pos: [number, number, number];
  size: [number, number, number]; // platform slab dimensions
  portalW: number;
  portalH: number;
  pillarW: number;
  pillarD: number;
  isDestination?: boolean;
}

const STAGES: StageConfig[] = [
  { id: 1, label: '01 DISCOVER', pos: [-3.4, -1.2, 2.0], size: [2.2, 0.26, 1.8], portalW: 1.5, portalH: 2.1, pillarW: 0.22, pillarD: 0.32 },
  { id: 2, label: '02 MATCH',    pos: [-1.7, -0.4, 1.0], size: [2.2, 0.26, 1.8], portalW: 1.6, portalH: 2.3, pillarW: 0.22, pillarD: 0.32 },
  { id: 3, label: '03 PREPARE',  pos: [0.0, 0.4, 0.0],  size: [2.3, 0.26, 1.8], portalW: 1.7, portalH: 2.5, pillarW: 0.24, pillarD: 0.34 },
  { id: 4, label: '04 APPLY',    pos: [1.7, 1.2, -1.0], size: [2.3, 0.26, 1.8], portalW: 1.8, portalH: 2.7, pillarW: 0.24, pillarD: 0.34 },
  { id: 5, label: '05 ADVANCE',  pos: [3.4, 2.1, -2.0], size: [2.7, 0.30, 2.1], portalW: 2.2, portalH: 3.3, pillarW: 0.28, pillarD: 0.40, isDestination: true },
];

export const CareerAscentCanvas: React.FC<CareerAscentCanvasProps> = ({
  activeStage = 1,
  onSelectStage,
  isDark = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // References for render loop state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const activeStageRef = useRef(activeStage);
  const isDarkRef = useRef(isDark);
  activeStageRef.current = activeStage;
  isDarkRef.current = isDark;

  // Track reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 650;

    // Scene setup
    const scene = new THREE.Scene();
    const bgColor = isDarkRef.current ? 0x080F1C : 0xF0F6FA;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.048);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    const baseCameraPos = new THREE.Vector3(0.3, 2.6, 9.2);
    camera.position.copy(baseCameraPos);
    const lookAtTarget = new THREE.Vector3(0.0, 0.5, 0.0);
    camera.lookAt(lookAtTarget);

    // Renderer
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isDarkRef.current ? 1.25 : 1.1;
    } catch (e) {
      console.warn('WebGL init failed:', e);
      setWebglSupported(false);
      return;
    }

    // -------------------------------------------------------------
    // Lighting
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(
      isDarkRef.current ? 0x0D1B2A : 0xE2EEF7,
      isDarkRef.current ? 1.6 : 2.0
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x20B9F3, isDarkRef.current ? 2.8 : 2.2);
    dirLight.position.set(6, 12, 8);
    scene.add(dirLight);

    const cyanFillLight = new THREE.DirectionalLight(0x0788D1, 1.8);
    cyanFillLight.position.set(-8, 6, -4);
    scene.add(cyanFillLight);

    const summitLight = new THREE.PointLight(0xB9E9FF, isDarkRef.current ? 3.5 : 2.5, 14, 1.4);
    summitLight.position.set(3.4, 3.4, -2.0);
    scene.add(summitLight);

    // Moving pulse light along the staircase
    const pulseLight = new THREE.PointLight(0x20B9F3, 3.0, 6, 2.0);
    scene.add(pulseLight);

    // -------------------------------------------------------------
    // Reflective Ground Horizon
    // -------------------------------------------------------------
    const groundGeom = new THREE.PlaneGeometry(60, 60, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x070E18 : 0xE4EDF5,
      roughness: 0.18,
      metalness: 0.82,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.2;
    scene.add(ground);

    // Subtle Ground Grid for architectural depth
    const gridHelper = new THREE.GridHelper(40, 20, 0x20B9F3, 0x0C223A);
    gridHelper.position.y = -2.18;
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = isDarkRef.current ? 0.35 : 0.2;
    }
    scene.add(gridHelper);

    // -------------------------------------------------------------
    // Materials & Color Palette Tokens
    // -------------------------------------------------------------
    const COLOR_DEEP_NAVY = 0x080F1C;
    const COLOR_MIDNIGHT = isDarkRef.current ? 0x101D30 : 0x1A293E;
    const COLOR_ELECTRIC = 0x20B9F3;
    const COLOR_AZURE = 0x0788D1;
    const COLOR_ICE = 0xB9E9FF;

    // Platform Slab Material
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: COLOR_MIDNIGHT,
      roughness: 0.25,
      metalness: 0.75,
    });

    // Monolith Pillar Material
    const monolithMaterial = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x0B1526 : 0x22334A,
      roughness: 0.2,
      metalness: 0.85,
    });

    // Transparent Blue Glass Material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: COLOR_AZURE,
      transparent: true,
      opacity: 0.32,
      roughness: 0.08,
      transmission: 0.88,
      ior: 1.52,
      metalness: 0.1,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Electric-Blue Illuminated Edges Material
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: COLOR_ELECTRIC,
      transparent: true,
      opacity: 0.95,
      linewidth: 1.5,
    });

    // -------------------------------------------------------------
    // Build the 5 Ascending Architectural Platforms & Portals
    // -------------------------------------------------------------
    const platformMeshes: THREE.Group[] = [];
    const portalGlassMeshes: THREE.Mesh[] = [];
    const destinationRings: THREE.Group[] = [];

    STAGES.forEach((stage, idx) => {
      const stageGroup = new THREE.Group();
      stageGroup.position.set(...stage.pos);

      // 1. Base Slab
      const slabGeom = new THREE.BoxGeometry(...stage.size);
      const slabMesh = new THREE.Mesh(slabGeom, slabMaterial);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      stageGroup.add(slabMesh);

      // Slab Illuminated Edge
      const slabEdges = new THREE.EdgesGeometry(slabGeom);
      const slabEdgeLines = new THREE.LineSegments(slabEdges, edgeMaterial);
      stageGroup.add(slabEdgeLines);

      // 2. Monolithic Portal Structure (Left Pillar, Right Pillar, Lintel)
      const halfW = stage.portalW / 2;
      const slabHalfH = stage.size[1] / 2;
      const portalCenterY = slabHalfH + stage.portalH / 2;

      // Left Pillar
      const pillarGeom = new THREE.BoxGeometry(stage.pillarW, stage.portalH, stage.pillarD);
      const leftPillar = new THREE.Mesh(pillarGeom, monolithMaterial);
      leftPillar.position.set(-halfW - stage.pillarW / 2, portalCenterY, 0);
      stageGroup.add(leftPillar);
      const leftPillarEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeom), edgeMaterial);
      leftPillar.add(leftPillarEdges);

      // Right Pillar
      const rightPillar = new THREE.Mesh(pillarGeom, monolithMaterial);
      rightPillar.position.set(halfW + stage.pillarW / 2, portalCenterY, 0);
      stageGroup.add(rightPillar);
      const rightPillarEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeom), edgeMaterial);
      rightPillar.add(rightPillarEdges);

      // Top Lintel
      const lintelW = stage.portalW + stage.pillarW * 2;
      const lintelGeom = new THREE.BoxGeometry(lintelW, stage.pillarW, stage.pillarD * 1.05);
      const lintel = new THREE.Mesh(lintelGeom, monolithMaterial);
      lintel.position.set(0, slabHalfH + stage.portalH + stage.pillarW / 2, 0);
      stageGroup.add(lintel);
      const lintelEdges = new THREE.LineSegments(new THREE.EdgesGeometry(lintelGeom), edgeMaterial);
      lintel.add(lintelEdges);

      // 3. Transparent Blue Glass Portal Pane
      const glassGeom = new THREE.PlaneGeometry(stage.portalW, stage.portalH);
      const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
      glassMesh.position.set(0, portalCenterY, 0);
      stageGroup.add(glassMesh);
      portalGlassMeshes.push(glassMesh);

      // Inner Portal Illuminated Contour
      const innerEdgeGeom = new THREE.EdgesGeometry(glassGeom);
      const innerEdgeLines = new THREE.LineSegments(
        innerEdgeGeom,
        new THREE.LineBasicMaterial({
          color: idx === 4 ? COLOR_ICE : COLOR_ELECTRIC,
          transparent: true,
          opacity: idx === 4 ? 1.0 : 0.8,
        })
      );
      glassMesh.add(innerEdgeLines);

      // 4. Destination Summit (Stage 05 ADVANCE) Extras:
      // Multi-layer rotating gyroscopic core representing the Universal Opportunity Gateway
      if (stage.isDestination) {
        const destinationCore = new THREE.Group();
        destinationCore.position.set(0, portalCenterY, 0);

        // Outer Torus Ring
        const ring1Geom = new THREE.TorusGeometry(0.58, 0.024, 16, 64);
        const ring1Mat = new THREE.MeshStandardMaterial({
          color: COLOR_ELECTRIC,
          emissive: COLOR_AZURE,
          emissiveIntensity: 0.8,
          metalness: 0.9,
          roughness: 0.1,
        });
        const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
        destinationCore.add(ring1);

        // Middle Torus Ring
        const ring2Geom = new THREE.TorusGeometry(0.44, 0.02, 16, 64);
        const ring2Mat = new THREE.MeshStandardMaterial({
          color: COLOR_ICE,
          emissive: COLOR_ELECTRIC,
          emissiveIntensity: 0.9,
          metalness: 0.8,
          roughness: 0.1,
        });
        const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
        destinationCore.add(ring2);

        // Inner Radiant Sphere (Career Core)
        const coreSphereGeom = new THREE.SphereGeometry(0.24, 32, 32);
        const coreSphereMat = new THREE.MeshBasicMaterial({
          color: COLOR_ICE,
        });
        const coreSphere = new THREE.Mesh(coreSphereGeom, coreSphereMat);
        destinationCore.add(coreSphere);

        stageGroup.add(destinationCore);
        destinationRings.push(destinationCore);
      }

      scene.add(stageGroup);
      platformMeshes.push(stageGroup);
    });

    // -------------------------------------------------------------
    // Energy Conduits Connecting the 5 Ascending Platforms
    // -------------------------------------------------------------
    const conduitCurves: THREE.LineCurve3[] = [];
    const conduitGroup = new THREE.Group();

    for (let i = 0; i < STAGES.length - 1; i++) {
      const p1 = new THREE.Vector3(...STAGES[i].pos).add(new THREE.Vector3(0, STAGES[i].size[1] / 2, 0));
      const p2 = new THREE.Vector3(...STAGES[i + 1].pos).add(new THREE.Vector3(0, STAGES[i + 1].size[1] / 2, 0));
      const curve = new THREE.LineCurve3(p1, p2);
      conduitCurves.push(curve);

      const points = curve.getPoints(20);
      const conduitGeom = new THREE.BufferGeometry().setFromPoints(points);
      const conduitMat = new THREE.LineBasicMaterial({
        color: COLOR_ELECTRIC,
        transparent: true,
        opacity: isDarkRef.current ? 0.65 : 0.45,
      });
      const conduitLine = new THREE.Line(conduitGeom, conduitMat);
      conduitGroup.add(conduitLine);
    }
    scene.add(conduitGroup);

    // -------------------------------------------------------------
    // Subtle Celestial Ambient Stars (Restrained Particle Field)
    // -------------------------------------------------------------
    const starCount = 90;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 32;
      starPositions[i * 3 + 1] = Math.random() * 16 - 2;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 4;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: COLOR_ICE,
      size: 0.08,
      transparent: true,
      opacity: isDarkRef.current ? 0.6 : 0.3,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // -------------------------------------------------------------
    // Mouse Interaction (Damped Lerp Camera Pan)
    // -------------------------------------------------------------
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.75;
      mouseRef.current.targetY = y * 0.45;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // -------------------------------------------------------------
    // Resize Observer
    // -------------------------------------------------------------
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = entry.contentRect.width || 800;
        height = entry.contentRect.height || 650;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (renderer) renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // -------------------------------------------------------------
    // Intersection Observer (Performance: Pause loop offscreen)
    // -------------------------------------------------------------
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    setIsLoaded(true);

    // -------------------------------------------------------------
    // Animation Loop
    // -------------------------------------------------------------
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible || !renderer) return;

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Lerp mouse coordinates
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Update camera target based on active stage
      const currentStageIdx = Math.max(0, Math.min(4, activeStageRef.current - 1));
      const targetStagePos = STAGES[currentStageIdx].pos;

      // Gentle camera pan
      const offsetX = prefersReducedMotion.current ? 0 : mouseRef.current.x;
      const offsetY = prefersReducedMotion.current ? 0 : mouseRef.current.y;

      camera.position.x = baseCameraPos.x + offsetX * 1.2 + (targetStagePos[0] * 0.12);
      camera.position.y = baseCameraPos.y + offsetY * 0.8 + (targetStagePos[1] * 0.08);

      lookAtTarget.x += ((targetStagePos[0] * 0.35) - lookAtTarget.x) * 0.04;
      lookAtTarget.y += ((targetStagePos[1] * 0.35 + 0.6) - lookAtTarget.y) * 0.04;
      camera.lookAt(lookAtTarget);

      // Pulse traveling along the 4 conduits
      const travelSpeed = 0.35;
      const totalProgress = (elapsedTime * travelSpeed) % (STAGES.length - 1);
      const currentConduitIdx = Math.floor(totalProgress);
      const segmentProgress = totalProgress - currentConduitIdx;

      if (conduitCurves[currentConduitIdx]) {
        const pulsePos = conduitCurves[currentConduitIdx].getPointAt(segmentProgress);
        pulseLight.position.copy(pulsePos);
        pulseLight.position.y += 0.2;
      }

      // Rotate destination rings (Stage 5 Universal Gateway)
      destinationRings.forEach((core) => {
        if (!prefersReducedMotion.current) {
          core.children[0].rotation.x += delta * 0.6;
          core.children[0].rotation.y += delta * 0.8;
          core.children[1].rotation.y += delta * 0.7;
          core.children[1].rotation.z += delta * 0.5;
        }
      });

      // Subtle breathing glow on active platform glass
      portalGlassMeshes.forEach((glass, idx) => {
        const isCurrentActive = idx === currentStageIdx;
        const targetOpacity = isCurrentActive ? 0.52 : 0.28;
        if (glass.material instanceof THREE.MeshPhysicalMaterial) {
          glass.material.opacity += (targetOpacity - glass.material.opacity) * 0.08;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      // Dispose Three.js objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  // Update theme colors when isDark changes
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[500px] select-none overflow-hidden ${className}`}
      aria-label="3D Career Ascent Architectural Environment"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Fallback for WebGL-disabled environments */}
      {!webglSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#080F1C] text-white text-center">
          <div className="w-16 h-16 rounded-2xl border border-[#20B9F3]/40 bg-[#101D30]/90 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(32,185,243,0.3)]">
            <span className="text-xl font-bold text-[#20B9F3]">05</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">The Career Ascent</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Five ascending architectural milestones: Discover, Match, Prepare, Apply, and Advance.
          </p>
        </div>
      )}

      {/* Floating 3D Milestone Badges (HTML Overlays Synced to Perspective) */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#101D30]/80 backdrop-blur-md border border-[#20B9F3]/30 text-[10px] font-mono tracking-widest uppercase text-[#B9E9FF] shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20B9F3] animate-pulse" />
            <span>Interactive 3D Architectural Space</span>
          </span>

          <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider text-slate-400/80">
            Drag to pan · Orbit Ascent
          </span>
        </div>

        {/* Milestone Stage Navigator Bar */}
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-[#080F1C]/75 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 max-w-md mx-auto shadow-2xl">
          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onSelectStage && onSelectStage(stage.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-mono font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#20B9F3] text-[#080F1C] shadow-[0_0_16px_rgba(32,185,243,0.5)] font-bold scale-[1.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title={`Focus ${stage.label}`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CareerAscentCanvas;
