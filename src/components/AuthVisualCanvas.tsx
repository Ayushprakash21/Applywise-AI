import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface AuthVisualCanvasProps {
  mode: 'signin' | 'signup';
  className?: string;
}

export const AuthVisualCanvas: React.FC<AuthVisualCanvasProps> = ({
  mode,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    // Test WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
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

    // SCENE & CAMERA
    const width = container.clientWidth || 620;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 7.8);
    camera.lookAt(0, -0.05, 0);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // LIGHTING SYSTEM
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Key Light (Radiant Violet-Blue top-left)
    const keyLight = new THREE.DirectionalLight(0x818cf8, 2.8);
    keyLight.position.set(-4, 5, 4.5);
    scene.add(keyLight);

    // Fill Light (Luminous Cyan-Blue bottom-right)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(4, -1, 3.5);
    scene.add(fillLight);

    // Top Rim Light (Soft white sheen)
    const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topLight.position.set(0, 6, 2);
    scene.add(topLight);

    // Rim Backlight (Electric purple halo)
    const rimLight = new THREE.PointLight(0xa855f7, 3.6, 16);
    rimLight.position.set(0, 1.5, -3.2);
    scene.add(rimLight);

    // Main interactive group for parallax
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. STUDIO PEDESTAL BASE (Two-Tier Studio Stage with Glowing Neon Trim)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.5, 0);

    // Bottom Base Cylinder
    const bottomBaseGeo = new THREE.CylinderGeometry(2.1, 2.2, 0.22, 64);
    const bottomBaseMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.35,
      roughness: 0.28,
    });
    const bottomBaseMesh = new THREE.Mesh(bottomBaseGeo, bottomBaseMat);
    bottomBaseMesh.position.y = -0.11;
    pedestalGroup.add(bottomBaseMesh);

    // Glowing LED Ring between tiers
    const ledRimGeo = new THREE.TorusGeometry(2.12, 0.04, 16, 80);
    const ledRimMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.98,
    });
    const ledRimMesh = new THREE.Mesh(ledRimGeo, ledRimMat);
    ledRimMesh.rotation.x = Math.PI / 2;
    ledRimMesh.position.y = 0.0;
    pedestalGroup.add(ledRimMesh);

    // Top Tier Cylinder
    const topBaseGeo = new THREE.CylinderGeometry(1.88, 1.94, 0.2, 64);
    const topBaseMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.2,
      roughness: 0.22,
    });
    const topBaseMesh = new THREE.Mesh(topBaseGeo, topBaseMat);
    topBaseMesh.position.y = 0.1;
    pedestalGroup.add(topBaseMesh);

    // Top tier accent ring
    const topRimGeo = new THREE.TorusGeometry(1.72, 0.02, 16, 64);
    const topRimMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.8,
    });
    const topRimMesh = new THREE.Mesh(topRimGeo, topRimMat);
    topRimMesh.rotation.x = Math.PI / 2;
    topRimMesh.position.y = 0.205;
    pedestalGroup.add(topRimMesh);

    mainGroup.add(pedestalGroup);

    // 2. CENTRAL SCULPTURE OBJECT
    const sculptureGroup = new THREE.Group();
    sculptureGroup.position.set(0, 0.42, 0);

    let primaryMesh: THREE.Mesh;
    let secondaryMesh: THREE.Mesh | null = null;

    if (mode === 'signin') {
      // SIGN IN: Luminous Organic Curved Translucent Glass Ribbon
      const ribbonGeo = new THREE.TorusKnotGeometry(1.08, 0.28, 220, 52, 2, 3);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.94,
        opacity: 1,
        transparent: true,
        roughness: 0.06,
        metalness: 0.04,
        ior: 1.52,
        thickness: 1.05,
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff),
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        attenuationColor: new THREE.Color(0x818cf8),
        attenuationDistance: 1.6,
      });

      primaryMesh = new THREE.Mesh(ribbonGeo, glassMat);
      sculptureGroup.add(primaryMesh);

      // Internal glowing luminous core
      const coreGeo = new THREE.SphereGeometry(0.52, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.5,
      });
      secondaryMesh = new THREE.Mesh(coreGeo, coreMat);
      sculptureGroup.add(secondaryMesh);
    } else {
      // SIGN UP: Translucent 3D Verified Identity Profile Card with Layered Elements
      const cardGeo = new THREE.BoxGeometry(1.95, 2.65, 0.12);
      const cardMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.94,
        opacity: 1,
        transparent: true,
        roughness: 0.08,
        metalness: 0.05,
        ior: 1.52,
        thickness: 1.1,
        specularIntensity: 1.0,
        specularColor: new THREE.Color(0xffffff),
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        attenuationColor: new THREE.Color(0x818cf8),
        attenuationDistance: 1.7,
      });
      primaryMesh = new THREE.Mesh(cardGeo, cardMat);
      sculptureGroup.add(primaryMesh);

      // Glowing Inner Credential Core
      const coreGeo = new THREE.BoxGeometry(1.7, 2.4, 0.05);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.35,
      });
      secondaryMesh = new THREE.Mesh(coreGeo, coreMat);
      sculptureGroup.add(secondaryMesh);

      // Floating Frosted Avatar Medallion
      const badgeGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 48);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.2,
      });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.rotation.x = Math.PI / 2;
      badgeMesh.position.set(0, 0.48, 0.11);
      sculptureGroup.add(badgeMesh);

      // Verification Shield Ring (Electric cyan glow)
      const crestGeo = new THREE.TorusGeometry(0.56, 0.032, 16, 48);
      const crestMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
      });
      const crestMesh = new THREE.Mesh(crestGeo, crestMat);
      crestMesh.position.set(0, 0.48, 0.12);
      sculptureGroup.add(crestMesh);

      // Verified Career Metric Chips
      const chipGeo = new THREE.BoxGeometry(1.3, 0.18, 0.04);
      const chipMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      });
      const chip1 = new THREE.Mesh(chipGeo, chipMat);
      chip1.position.set(0, -0.22, 0.1);
      sculptureGroup.add(chip1);

      const chip2Geo = new THREE.BoxGeometry(1.0, 0.16, 0.04);
      const chip2 = new THREE.Mesh(chip2Geo, chipMat);
      chip2.position.set(-0.15, -0.5, 0.1);
      sculptureGroup.add(chip2);

      const chip3Geo = new THREE.BoxGeometry(0.65, 0.14, 0.04);
      const chip3Mat = new THREE.MeshBasicMaterial({
        color: 0x8065f5,
        transparent: true,
        opacity: 0.9,
      });
      const chip3 = new THREE.Mesh(chip3Geo, chip3Mat);
      chip3.position.set(-0.32, -0.75, 0.1);
      sculptureGroup.add(chip3);
    }

    mainGroup.add(sculptureGroup);

    // 3. THIN ILLUMINATED ORBITAL RINGS
    const orbitalGroup = new THREE.Group();
    sculptureGroup.add(orbitalGroup);

    // Orbital Ring A
    const ringGeo1 = new THREE.TorusGeometry(2.15, 0.016, 16, 120);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = 1.15;
    ringMesh1.rotation.y = 0.35;
    orbitalGroup.add(ringMesh1);

    // Orbital Ring B (Opposing tilted axis)
    const ringGeo2 = new THREE.TorusGeometry(2.38, 0.014, 16, 120);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -0.92;
    ringMesh2.rotation.z = -0.45;
    orbitalGroup.add(ringMesh2);

    // 4. AMBIENT PARTICLES (Restrained, elegant floating points)
    const particleCount = 42;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 6;
      particlePositions[i + 1] = (Math.random() - 0.5) * 5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    mainGroup.add(particles);

    // INTERACTIVE MOUSE PARALLAX
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 0.35;
      targetMouseY = y * 0.25;
    };

    window.addEventListener('mousemove', handlePointerMove);

    // RESIZE LISTENER
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

    // ANIMATION LOOP
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse parallax lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Parallax camera offset
      camera.position.x = currentMouseX * 1.2;
      camera.position.y = 0.1 + currentMouseY * 0.7;
      camera.lookAt(0, -0.05, 0);

      // Continuous gentle rotation & vertical hovering
      if (mode === 'signin') {
        sculptureGroup.position.y = 0.42 + Math.sin(elapsedTime * 1.2) * 0.08;
        sculptureGroup.rotation.y = elapsedTime * 0.42;
        sculptureGroup.rotation.x = Math.sin(elapsedTime * 0.5) * 0.08;
      } else {
        sculptureGroup.position.y = 0.42 + Math.sin(elapsedTime * 1.1) * 0.06;
        sculptureGroup.rotation.y = Math.sin(elapsedTime * 0.6) * 0.32;
        sculptureGroup.rotation.x = 0.1 + Math.cos(elapsedTime * 0.5) * 0.05;
      }

      // Orbital rings rotate at distinct speeds
      ringMesh1.rotation.z = elapsedTime * 0.5;
      ringMesh2.rotation.y = -elapsedTime * 0.38;

      // Particles gentle swirl
      particles.rotation.y = elapsedTime * 0.04;

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

      // Geometries & materials disposal
      bottomBaseGeo.dispose();
      bottomBaseMat.dispose();
      ledRimGeo.dispose();
      ledRimMat.dispose();
      topBaseGeo.dispose();
      topBaseMat.dispose();
      topRimGeo.dispose();
      topRimMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [mode, webglSupported, reducedMotion]);

  // Fallback for non-WebGL or reduced motion environments
  if (!webglSupported || reducedMotion) {
    return (
      <div
        className={`relative flex items-center justify-center w-full h-full min-h-[460px] overflow-hidden select-none ${className}`}
        aria-hidden="true"
      >
        {/* Fallback Glass Pedestal */}
        <div className="absolute bottom-10 w-72 h-10 rounded-full bg-slate-200/60 blur-xs border border-white/80 shadow-lg" />
        <div className="absolute bottom-13 w-64 h-3 rounded-full bg-blue-400/40 blur-[2px]" />

        {/* Fallback Glass Sculpture Illustration */}
        <div className="relative z-10 flex flex-col items-center justify-center p-8 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/80 shadow-2xl shadow-violet-500/10">
          <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-blue-500/30 via-violet-500/25 to-pink-400/30 blur-md animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            {mode === 'signin' ? (
              <svg className="w-44 h-44 text-violet-500/80 drop-shadow-xl" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="38" stroke="url(#ringGrad)" strokeWidth="3" />
                <path
                  d="M30 50 C 30 25, 70 25, 70 50 C 70 75, 30 75, 30 50 Z"
                  stroke="url(#ringGrad2)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8065F5" />
                  </linearGradient>
                  <linearGradient id="ringGrad2" x1="0" y1="100" x2="100" y2="0">
                    <stop offset="0%" stopColor="#8065F5" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <div className="w-36 h-48 rounded-2xl bg-white/60 border border-white/90 shadow-xl flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md mb-3">
                  AV
                </div>
                <div className="w-20 h-2 bg-slate-300/80 rounded-full mb-2" />
                <div className="w-14 h-2 bg-violet-400/60 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full min-h-[480px] lg:min-h-[580px] flex items-center justify-center select-none overflow-visible ${className}`}
      aria-label="Interactive 3D Career Intelligence Sculpture"
      role="img"
    />
  );
};
