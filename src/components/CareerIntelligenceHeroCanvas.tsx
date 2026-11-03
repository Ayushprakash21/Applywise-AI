import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface CareerIntelligenceHeroCanvasProps {
  className?: string;
  verifiedSkillsCount?: number;
  opportunitiesCount?: number;
}

export const CareerIntelligenceHeroCanvas: React.FC<CareerIntelligenceHeroCanvasProps> = ({
  className = '',
  verifiedSkillsCount = 6,
  opportunitiesCount = 12,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Check reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);

    // Test WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  useEffect(() => {
    if (!webglSupported || reducedMotion || !mountRef.current) return;

    const container = mountRef.current;
    let animationFrameId: number;
    let isDisposed = false;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x818cf8, 2.6);
    keyLight.position.set(-3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(3, -1, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xa855f7, 3.2, 12);
    rimLight.position.set(0, 1.5, -2.5);
    scene.add(rimLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. MINI STUDIO PEDESTAL
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.2, 0);

    const baseGeo = new THREE.CylinderGeometry(1.4, 1.48, 0.18, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.28,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    pedestalGroup.add(baseMesh);

    const rimGeo = new THREE.TorusGeometry(1.41, 0.025, 16, 64);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.95,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.09;
    pedestalGroup.add(rimMesh);

    mainGroup.add(pedestalGroup);

    // 2. CENTRAL TRANSLUCENT CAREER INTELLIGENCE SPHERE
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.1, 0);

    const sphereGeo = new THREE.IcosahedronGeometry(0.85, 4);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.08,
      metalness: 0.05,
      ior: 1.5,
      thickness: 0.95,
      specularIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      attenuationColor: new THREE.Color(0x818cf8),
      attenuationDistance: 1.5,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(sphereMesh);

    // Internal radiant core
    const innerCoreGeo = new THREE.SphereGeometry(0.42, 24, 24);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x8065f5,
      transparent: true,
      opacity: 0.55,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    // 3. ORBITAL LIGHT RINGS
    const ringGeo1 = new THREE.TorusGeometry(1.48, 0.015, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = 1.1;
    ringMesh1.rotation.y = 0.3;
    coreGroup.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(1.65, 0.012, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -0.85;
    ringMesh2.rotation.z = -0.4;
    coreGroup.add(ringMesh2);

    // 4. FLOATING CAREER SATELLITES (Verified Skills & Opportunities)
    const satGroup = new THREE.Group();
    coreGroup.add(satGroup);

    // Satellite 1: Verified Skill (Emerald / Cyan glow)
    const sat1Geo = new THREE.SphereGeometry(0.12, 16, 16);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sat1 = new THREE.Mesh(sat1Geo, sat1Mat);
    sat1.position.set(1.5, 0.4, 0.3);
    satGroup.add(sat1);

    // Satellite 2: Live Opportunity (Blue glow)
    const sat2Geo = new THREE.SphereGeometry(0.14, 16, 16);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const sat2 = new THREE.Mesh(sat2Geo, sat2Mat);
    sat2.position.set(-1.45, -0.2, 0.4);
    satGroup.add(sat2);

    // Satellite 3: Career Growth (Violet glow)
    const sat3Geo = new THREE.SphereGeometry(0.11, 16, 16);
    const sat3Mat = new THREE.MeshBasicMaterial({ color: 0x8065f5 });
    const sat3 = new THREE.Mesh(sat3Geo, sat3Mat);
    sat3.position.set(0.2, 1.35, -0.3);
    satGroup.add(sat3);

    mainGroup.add(coreGroup);

    // 5. AMBIENT PARTICLES
    const particleCount = 28;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 4.5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 3.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 3.0;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    mainGroup.add(particles);

    // MOUSE PARALLAX
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 0.3;
      targetMouseY = y * 0.2;
    };

    window.addEventListener('mousemove', handlePointerMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();

      // Smooth mouse parallax lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      camera.position.x = currentMouseX * 0.8;
      camera.position.y = 0.2 + currentMouseY * 0.5;
      camera.lookAt(0, 0, 0);

      // Core hovering & gentle rotation
      coreGroup.position.y = 0.1 + Math.sin(t * 1.2) * 0.06;
      coreGroup.rotation.y = t * 0.35;
      coreGroup.rotation.x = Math.sin(t * 0.5) * 0.05;

      // Orbital rings rotate
      ringMesh1.rotation.z = t * 0.45;
      ringMesh2.rotation.y = -t * 0.32;

      // Satellites orbiting
      satGroup.rotation.y = -t * 0.4;
      satGroup.rotation.z = Math.sin(t * 0.3) * 0.1;

      // Particles swirl
      particles.rotation.y = t * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();

      baseGeo.dispose();
      baseMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      sat1Geo.dispose();
      sat1Mat.dispose();
      sat2Geo.dispose();
      sat2Mat.dispose();
      sat3Geo.dispose();
      sat3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [webglSupported, reducedMotion]);

  if (!webglSupported || reducedMotion) {
    return (
      <div className={`relative flex items-center justify-center w-full h-[240px] select-none ${className}`}>
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500/25 via-violet-500/20 to-pink-400/20 blur-md animate-pulse flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/70 border border-white/90 shadow-lg flex items-center justify-center text-xs font-bold text-violet-700 font-mono">
            AV CORE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-[240px] sm:h-[260px] flex items-center justify-center select-none overflow-visible ${className}`}
      aria-label="3D Career Intelligence Sphere"
      role="img"
    />
  );
};
