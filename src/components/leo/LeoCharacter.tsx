import React, { useState, useEffect, useRef, useId } from 'react';

export type LeoState = 'idle' | 'greeting' | 'thinking' | 'responding' | 'success' | 'error';

export interface LeoCharacterProps {
  state?: LeoState;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  interactive?: boolean;
  showPaw?: boolean;
  showTail?: boolean;
  showCollar?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LeoCharacter: React.FC<LeoCharacterProps> = ({
  state = 'idle',
  size = 'md',
  interactive = true,
  showPaw = true,
  showTail = true,
  showCollar = true,
  className = '',
  onClick,
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState(0);
  const [earTwitch, setEarTwitch] = useState(false);
  const [pawWave, setPawWave] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Natural blinking & ear twitch loop
  useEffect(() => {
    if (reducedMotion) return;

    let timeoutId: NodeJS.Timeout;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        // 25% chance of an adorable double blink
        if (Math.random() < 0.25) {
          setTimeout(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 140);
          }, 120);
        }
      }, 150);

      // Random delay between 2.6s and 5.5s
      const nextInterval = 2600 + Math.random() * 2900;
      timeoutId = setTimeout(triggerBlink, nextInterval);
    };

    timeoutId = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timeoutId);
  }, [reducedMotion]);

  // Occasional subtle ear twitch
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.4 && state === 'idle') {
        setEarTwitch(true);
        setTimeout(() => setEarTwitch(false), 300);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [reducedMotion, state]);

  // Handle paw animation when state is greeting or success
  useEffect(() => {
    if (state === 'greeting' || state === 'success') {
      setPawWave(true);
      const timer = setTimeout(() => {
        if (state !== 'greeting' && state !== 'success') {
          setPawWave(false);
        }
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setPawWave(false);
    }
  }, [state]);

  // Interactive mouse tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (e.clientX - centerX) / (rect.width * 1.5);
    const dy = (e.clientY - centerY) / (rect.height * 1.5);

    // Clamp pupil offset
    const clampedX = Math.max(-3.5, Math.min(3.5, dx * 5));
    const clampedY = Math.max(-3, Math.min(3, dy * 4));
    setPupilOffset({ x: clampedX, y: clampedY });
    setHeadTilt(Math.max(-4, Math.min(4, dx * 6)));
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (state === 'idle') {
      setPawWave(true);
      setTimeout(() => setPawWave(false), 1800);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPupilOffset({ x: 0, y: 0 });
    setHeadTilt(0);
  };

  // Dimensional sizes
  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 32;
      case 'sm': return 44;
      case 'md': return 64;
      case 'lg': return 96;
      case 'xl': return 140;
      default: return 64;
    }
  };

  const dimension = getDimension();

  // Dynamic state attributes
  const isThinking = state === 'thinking';
  const isResponding = state === 'responding';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  // State-driven eye position override
  let currentPupilX = pupilOffset.x;
  let currentPupilY = pupilOffset.y;
  let currentHeadTilt = headTilt;

  if (isThinking) {
    currentPupilX = 2.5;
    currentPupilY = -3.2;
    currentHeadTilt = 4.5;
  } else if (isError) {
    currentPupilY = 1.2;
    currentHeadTilt = -3.5;
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
      }}
      role="img"
      aria-label={`Leo the Grey Persian Cat (${state} mode)`}
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible transition-transform duration-300 ease-out"
        style={{
          transform: `rotate(${currentHeadTilt}deg)`,
        }}
      >
        <defs>
          {/* Persian Silver-Grey Fur Gradients */}
          <radialGradient id={`fur_head_${uniqueId}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#C5CFDC" />
            <stop offset="50%" stopColor="#98A4B5" />
            <stop offset="85%" stopColor="#6C788A" />
            <stop offset="100%" stopColor="#4E5868" />
          </radialGradient>

          <radialGradient id={`fur_cheek_${uniqueId}`} cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#D5DEE8" />
            <stop offset="65%" stopColor="#A2AFBF" />
            <stop offset="100%" stopColor="#768294" />
          </radialGradient>

          <linearGradient id={`fur_body_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8794A6" />
            <stop offset="60%" stopColor="#647182" />
            <stop offset="100%" stopColor="#454F5E" />
          </linearGradient>

          {/* Persian Ear Gradients */}
          <linearGradient id={`ear_outer_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#626E80" />
            <stop offset="100%" stopColor="#495362" />
          </linearGradient>

          <radialGradient id={`ear_inner_${uniqueId}`} cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#F5D0D3" />
            <stop offset="70%" stopColor="#E2A6AB" />
            <stop offset="100%" stopColor="#BD8086" />
          </radialGradient>

          {/* Luminous Amber-Golden Persian Eye Gradients */}
          <radialGradient id={`eye_amber_${uniqueId}`} cx="45%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </radialGradient>

          {/* Nose Pink-Grey Gradient */}
          <linearGradient id={`nose_pink_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E5A6B0" />
            <stop offset="100%" stopColor="#B3737E" />
          </linearGradient>

          {/* ApplyWise Signature Navy & Electric Blue Collar */}
          <linearGradient id={`collar_navy_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="50%" stopColor="#1C2541" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>

          <linearGradient id={`collar_blue_edge_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0072F5" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#0072F5" />
          </linearGradient>

          {/* Golden ApplyWise AV Medallion */}
          <radialGradient id={`gold_medallion_${uniqueId}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="45%" stopColor="#F5B738" />
            <stop offset="85%" stopColor="#D48B17" />
            <stop offset="100%" stopColor="#9A5D07" />
          </radialGradient>

          {/* Soft Fur Drop Shadow */}
          <filter id={`soft_shadow_${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>

          {/* Glow for AV Medallion */}
          <filter id={`av_glow_${uniqueId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* 1. FLUFFY PERSIAN TAIL (Back layer) */}
        {showTail && (
          <g
            className={`transition-transform duration-700 ease-in-out origin-[125px_135px] ${
              !reducedMotion ? 'leo-tail-sway' : ''
            }`}
          >
            {/* Tail spine & fluffy fur curves */}
            <path
              d="M 120 135 C 135 130 152 115 150 95 C 148 78 134 68 126 72 C 120 75 125 88 132 94 C 138 100 138 115 120 128 Z"
              fill={`url(#fur_body_${uniqueId})`}
              filter={`url(#soft_shadow_${uniqueId})`}
            />
            {/* Fluffy tail tufts */}
            <path
              d="M 148 90 C 154 85 153 74 145 70 C 140 68 135 73 133 78 Z"
              fill="#A2AFBF"
              opacity="0.9"
            />
            <path
              d="M 140 102 C 146 98 147 90 141 86 C 136 84 133 89 132 94 Z"
              fill="#BAC5D3"
              opacity="0.8"
            />
          </g>
        )}

        {/* 2. BODY / CHEST (Lower layer with breathing animation) */}
        <g
          className={`transition-transform duration-300 origin-[80px_140px] ${
            !reducedMotion ? 'leo-breathing' : ''
          }`}
        >
          {/* Main torso */}
          <ellipse
            cx="80"
            cy="134"
            rx="46"
            ry="24"
            fill={`url(#fur_body_${uniqueId})`}
            filter={`url(#soft_shadow_${uniqueId})`}
          />
          {/* Fluffy chest bib (soft silvery cream-grey) */}
          <path
            d="M 64 120 C 68 132 72 144 80 144 C 88 144 92 132 96 120 C 90 123 80 126 64 120 Z"
            fill="#DDE5EE"
            opacity="0.95"
          />
          <path
            d="M 72 122 C 75 132 78 138 80 138 C 82 138 85 132 88 122 Z"
            fill="#EEF3F8"
          />
        </g>

        {/* 3. PERSIAN EARS (Rounded, low-set, sweet) */}
        {/* Left Ear */}
        <g
          className={`transition-transform duration-200 origin-[48px_48px] ${
            !reducedMotion && earTwitch ? '-rotate-6' : ''
          }`}
        >
          <path
            d="M 36 60 C 30 46 36 32 48 30 C 58 29 64 42 66 56 Z"
            fill={`url(#ear_outer_${uniqueId})`}
          />
          {/* Inner ear soft pink */}
          <path
            d="M 40 55 C 36 45 40 37 47 36 C 54 36 58 45 60 54 Z"
            fill={`url(#ear_inner_${uniqueId})`}
          />
          {/* Soft inner ear fur tufts */}
          <path
            d="M 42 54 C 47 48 53 47 57 52 C 54 50 49 50 45 54 Z"
            fill="#F1F5F9"
            opacity="0.95"
          />
          <path
            d="M 38 52 C 43 45 48 45 53 49 Z"
            fill="#E2E8F0"
            opacity="0.8"
          />
        </g>

        {/* Right Ear (attentive tilt in thinking state) */}
        <g
          className={`transition-transform duration-200 origin-[112px_48px] ${
            !reducedMotion && (isThinking || earTwitch) ? 'rotate-6' : ''
          }`}
        >
          <path
            d="M 124 60 C 130 46 124 32 112 30 C 102 29 96 42 94 56 Z"
            fill={`url(#ear_outer_${uniqueId})`}
          />
          {/* Inner ear soft pink */}
          <path
            d="M 120 55 C 124 45 120 37 113 36 C 106 36 102 45 100 54 Z"
            fill={`url(#ear_inner_${uniqueId})`}
          />
          {/* Soft inner ear fur tufts */}
          <path
            d="M 118 54 C 113 48 107 47 103 52 C 106 50 111 50 115 54 Z"
            fill="#F1F5F9"
            opacity="0.95"
          />
          <path
            d="M 122 52 C 117 45 112 45 107 49 Z"
            fill="#E2E8F0"
            opacity="0.8"
          />
        </g>

        {/* 4. PERSIAN HEAD & FLUFFY CHEEKS */}
        <g>
          {/* Fluffy cheek tufts silhouette */}
          <path
            d="M 80 40 
               C 108 40 126 50 132 68 
               C 137 82 136 100 124 112 
               C 114 122 98 125 80 125 
               C 62 125 46 122 36 112 
               C 24 100 23 82 28 68 
               C 34 50 52 40 80 40 Z"
            fill={`url(#fur_head_${uniqueId})`}
            filter={`url(#soft_shadow_${uniqueId})`}
          />

          {/* Left Fluffy Persian Cheek Layer */}
          <path
            d="M 32 78 C 22 84 22 96 30 106 C 38 114 50 116 58 114 C 44 110 32 100 32 78 Z"
            fill={`url(#fur_cheek_${uniqueId})`}
          />
          <path
            d="M 28 88 C 20 94 22 102 28 108 C 34 112 40 110 36 104 C 30 100 28 94 28 88 Z"
            fill="#CBD5E1"
            opacity="0.75"
          />

          {/* Right Fluffy Persian Cheek Layer */}
          <path
            d="M 128 78 C 138 84 138 96 130 106 C 122 114 110 116 102 114 C 116 110 128 100 128 78 Z"
            fill={`url(#fur_cheek_${uniqueId})`}
          />
          <path
            d="M 132 88 C 140 94 138 102 132 108 C 126 112 120 110 124 104 C 130 100 132 94 132 88 Z"
            fill="#CBD5E1"
            opacity="0.75"
          />

          {/* Forehead & Brow Fur Volume */}
          <path
            d="M 62 46 C 72 43 88 43 98 46 C 104 48 100 58 80 57 C 60 58 56 48 62 46 Z"
            fill="#D6E0EC"
            opacity="0.6"
          />
        </g>

        {/* 5. LARGE EXPRESSIVE AMBER-GOLDEN PERSIAN EYES */}
        {/* Left Eye */}
        <g id="left_eye">
          {/* Dark eye socket liner (gives deep sweet expression) */}
          <ellipse cx="58" cy="74" rx="14" ry="13.5" fill="#1E293B" />
          
          {/* Luminous Golden Iris */}
          <ellipse cx="58" cy="74" rx="12.5" ry="12" fill={`url(#eye_amber_${uniqueId})`} />
          
          {/* Inner ring depth */}
          <ellipse cx="58" cy="74" rx="9" ry="8.5" fill="#F59E0B" opacity="0.85" />

          {/* Deep Obsidian Pupil (dilates dynamically) */}
          <ellipse
            cx={58 + currentPupilX}
            cy={74 + currentPupilY}
            rx={isThinking ? 4.8 : isResponding ? 5.8 : isHovered ? 6.2 : 5.2}
            ry={isThinking ? 5.2 : isResponding ? 6.2 : isHovered ? 6.6 : 5.6}
            fill="#090D16"
          />

          {/* Eye Specular Highlights (Catchlights) */}
          <circle
            cx={55 + currentPupilX * 0.4}
            cy={70 + currentPupilY * 0.4}
            r="3.2"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <circle
            cx={62 + currentPupilX * 0.4}
            cy={76 + currentPupilY * 0.4}
            r="1.4"
            fill="#FFFFFF"
            opacity="0.8"
          />

          {/* Eyelid for Blinking / Happy Success squint */}
          {isSuccess ? (
            /* Happy cat squint curve */
            <path
              d="M 45 74 C 50 67 66 67 71 74 C 66 70 50 70 45 74 Z"
              fill="#2A3444"
            />
          ) : (
            <path
              d="M 44 61 Q 58 60 72 61 L 72 74 Q 58 74 44 74 Z"
              fill={`url(#fur_head_${uniqueId})`}
              className="transition-transform duration-100 ease-out origin-[58px_61px]"
              style={{
                transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)',
              }}
            />
          )}
        </g>

        {/* Right Eye */}
        <g id="right_eye">
          {/* Dark eye socket liner */}
          <ellipse cx="102" cy="74" rx="14" ry="13.5" fill="#1E293B" />
          
          {/* Luminous Golden Iris */}
          <ellipse cx="102" cy="74" rx="12.5" ry="12" fill={`url(#eye_amber_${uniqueId})`} />
          
          {/* Inner ring depth */}
          <ellipse cx="102" cy="74" rx="9" ry="8.5" fill="#F59E0B" opacity="0.85" />

          {/* Deep Obsidian Pupil */}
          <ellipse
            cx={102 + currentPupilX}
            cy={74 + currentPupilY}
            rx={isThinking ? 4.8 : isResponding ? 5.8 : isHovered ? 6.2 : 5.2}
            ry={isThinking ? 5.2 : isResponding ? 6.2 : isHovered ? 6.6 : 5.6}
            fill="#090D16"
          />

          {/* Eye Specular Highlights */}
          <circle
            cx={99 + currentPupilX * 0.4}
            cy={70 + currentPupilY * 0.4}
            r="3.2"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <circle
            cx={106 + currentPupilX * 0.4}
            cy={76 + currentPupilY * 0.4}
            r="1.4"
            fill="#FFFFFF"
            opacity="0.8"
          />

          {/* Eyelid for Blinking / Happy Success squint */}
          {isSuccess ? (
            <path
              d="M 89 74 C 94 67 110 67 115 74 C 110 70 94 70 89 74 Z"
              fill="#2A3444"
            />
          ) : (
            <path
              d="M 88 61 Q 102 60 116 61 L 116 74 Q 102 74 88 74 Z"
              fill={`url(#fur_head_${uniqueId})`}
              className="transition-transform duration-100 ease-out origin-[102px_61px]"
              style={{
                transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)',
              }}
            />
          )}
        </g>

        {/* 6. SHORT PERSIAN MUZZLE & PINK-GREY BUTTON NOSE */}
        <g id="muzzle">
          {/* Fluffy silver muzzle whisker pads */}
          <ellipse cx="73" cy="94" rx="9.5" ry="7.5" fill="#CBD5E1" opacity="0.95" />
          <ellipse cx="87" cy="94" rx="9.5" ry="7.5" fill="#CBD5E1" opacity="0.95" />
          <ellipse cx="80" cy="95" rx="7" ry="5.5" fill="#DDE4EE" />

          {/* Sweet button nose (short, flat Persian muzzle placement) */}
          <path
            d="M 75 84 C 77 82 83 82 85 84 C 86.5 87 84 90.5 80 91.5 C 76 90.5 73.5 87 75 84 Z"
            fill={`url(#nose_pink_${uniqueId})`}
          />
          {/* Subtle nostrils */}
          <ellipse cx="77.8" cy="87.5" rx="1.2" ry="0.8" fill="#7C4750" />
          <ellipse cx="82.2" cy="87.5" rx="1.2" ry="0.8" fill="#7C4750" />
          {/* Nose highlight */}
          <ellipse cx="80" cy="84.5" rx="2.5" ry="1" fill="#FFDDE2" opacity="0.8" />

          {/* Persian mouth line (gentle sweet pout) */}
          <path
            d="M 80 91.5 L 80 94.5"
            stroke="#5A6678"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {isSuccess ? (
            /* Gentle happy smile */
            <path
              d="M 73 95 C 76 99 80 98 80 95 C 80 98 84 99 87 95"
              stroke="#5A6678"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <path
              d="M 74 95 C 77 97 80 96 80 95 C 80 96 83 97 86 95"
              stroke="#5A6678"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Delicate whisker pore dots */}
          <circle cx="71" cy="93" r="0.7" fill="#8896A6" />
          <circle cx="68" cy="95" r="0.7" fill="#8896A6" />
          <circle cx="72" cy="96" r="0.7" fill="#8896A6" />
          <circle cx="89" cy="93" r="0.7" fill="#8896A6" />
          <circle cx="92" cy="95" r="0.7" fill="#8896A6" />
          <circle cx="88" cy="96" r="0.7" fill="#8896A6" />
        </g>

        {/* 7. FINE SILVER-WHITE WHISKERS */}
        <g stroke="#E2E8F0" strokeWidth="0.85" opacity="0.85" strokeLinecap="round">
          {/* Left Whiskers */}
          <path d="M 68 93 C 50 91 32 94 18 100" />
          <path d="M 67 95 C 48 96 30 102 16 109" />
          <path d="M 68 97 C 52 101 36 109 24 116" />

          {/* Right Whiskers */}
          <path d="M 92 93 C 110 91 128 94 142 100" />
          <path d="M 93 95 C 112 96 130 102 144 109" />
          <path d="M 92 97 C 108 101 124 109 136 116" />
        </g>

        {/* 8. APPLYWISE SIGNATURE NAVY & ELECTRIC-BLUE COLLAR WITH GOLD AV CHARM */}
        {showCollar && (
          <g id="collar">
            {/* Midnight Navy collar strap with electric-blue edges */}
            <path
              d="M 52 118 C 66 127 94 127 108 118 C 110 122 107 126 106 128 C 92 135 68 135 54 128 C 53 126 50 122 52 118 Z"
              fill={`url(#collar_navy_${uniqueId})`}
              filter={`url(#soft_shadow_${uniqueId})`}
            />
            {/* Top electric-blue illuminated border */}
            <path
              d="M 53 118 C 67 126 93 126 107 118"
              stroke={`url(#collar_blue_edge_${uniqueId})`}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Bottom electric-blue trim */}
            <path
              d="M 55 127 C 69 134 91 134 105 127"
              stroke={`url(#collar_blue_edge_${uniqueId})`}
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Gleaming Gold ApplyWise AV Medallion Charm */}
            <g filter={`url(#av_glow_${uniqueId})`}>
              {/* Little ring holder */}
              <circle cx="80" cy="129" r="2.5" fill="#F59E0B" />
              <circle cx="80" cy="129" r="1.5" fill="#0B132B" />
              {/* Medallion disc */}
              <circle cx="80" cy="136" r="7.5" fill={`url(#gold_medallion_${uniqueId})`} />
              <circle cx="80" cy="136" r="6.6" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.6" fill="none" />
              
              {/* Stylized "AV" Monogram inside charm */}
              <path
                d="M 76.5 138.5 L 78.8 133 L 80 135.8 L 81.2 133 L 83.5 138.5"
                stroke="#451A03"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 77.2 137 L 80 137"
                stroke="#451A03"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </g>
          </g>
        )}

        {/* 9. FLUFFY PERSIAN PAW (Welcoming gesture / wave on greeting, hover, success) */}
        {showPaw && (
          <g
            className={`transition-all duration-500 ease-out origin-[114px_140px] ${
              pawWave || isSuccess
                ? 'leo-paw-raised'
                : 'translate-y-1'
            }`}
          >
            {/* Paw wrist & forearm */}
            <path
              d="M 106 136 C 104 124 108 116 116 112 C 124 116 126 126 124 136 Z"
              fill={`url(#fur_head_${uniqueId})`}
              filter={`url(#soft_shadow_${uniqueId})`}
            />
            {/* Fluffy paw glove */}
            <ellipse cx="116" cy="114" rx="8" ry="7" fill="#BAC5D3" />
            {/* Soft pink toe pads */}
            <ellipse cx="116" cy="116" rx="3.5" ry="2.6" fill="#E8B4BA" opacity="0.9" />
            <circle cx="111.5" cy="112" r="1.5" fill="#E8B4BA" opacity="0.85" />
            <circle cx="115" cy="109.5" r="1.5" fill="#E8B4BA" opacity="0.85" />
            <circle cx="119" cy="110" r="1.5" fill="#E8B4BA" opacity="0.85" />
            <circle cx="121.5" cy="113.5" r="1.4" fill="#E8B4BA" opacity="0.8" />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes leoBreathe {
          0%, 100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.025, 0.985) translateY(-0.8px);
          }
        }
        @keyframes leoTailSway {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        @keyframes leoPawWave {
          0%, 100% {
            transform: rotate(-10deg) translateY(-8px);
          }
          50% {
            transform: rotate(12deg) translateY(-14px);
          }
        }
        .leo-breathing {
          animation: leoBreathe 3.6s ease-in-out infinite;
        }
        .leo-tail-sway {
          animation: leoTailSway 4.2s ease-in-out infinite;
        }
        .leo-paw-raised {
          animation: leoPawWave 0.75s ease-in-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .leo-breathing,
          .leo-tail-sway,
          .leo-paw-raised {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
