import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Node {
  id: string;
  label: string;
  category: 'skill' | 'evidence' | 'opportunity' | 'core';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  confidence?: number;
  company?: string;
  matchScore?: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
  pulseProgress: number;
  pulseSpeed: number;
}

export const CareerNetworkVisual: React.FC<{
  onSelectNode?: (nodeLabel: string) => void;
  className?: string;
}> = ({ onSelectNode, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 560);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial node graph definition
    const initialNodes: Node[] = [
      // Core anchor
      { id: 'core', label: 'Verified Career Twin', category: 'core', x: width * 0.5, y: height * 0.5, vx: 0, vy: 0, radius: 28, baseRadius: 28, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.45)' },
      
      // Skills
      { id: 's1', label: 'System Architecture', category: 'skill', x: width * 0.32, y: height * 0.32, vx: 0.15, vy: -0.1, radius: 18, baseRadius: 18, color: '#06b6d4', glowColor: 'rgba(6, 182, 212, 0.35)', confidence: 98 },
      { id: 's2', label: 'TypeScript & React', category: 'skill', x: width * 0.28, y: height * 0.62, vx: -0.12, vy: 0.14, radius: 16, baseRadius: 16, color: '#06b6d4', glowColor: 'rgba(6, 182, 212, 0.35)', confidence: 96 },
      { id: 's3', label: 'Edge Computing (Workers)', category: 'skill', x: width * 0.44, y: height * 0.22, vx: 0.08, vy: 0.12, radius: 17, baseRadius: 17, color: '#0ea5e9', glowColor: 'rgba(14, 165, 233, 0.35)', confidence: 94 },
      { id: 's4', label: 'Distributed Operations', category: 'skill', x: width * 0.36, y: height * 0.78, vx: -0.1, vy: -0.08, radius: 15, baseRadius: 15, color: '#06b6d4', glowColor: 'rgba(6, 182, 212, 0.35)', confidence: 92 },
      { id: 's5', label: 'AI Workflow Integration', category: 'skill', x: width * 0.58, y: height * 0.24, vx: -0.09, vy: 0.1, radius: 16, baseRadius: 16, color: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.35)', confidence: 95 },

      // Evidence anchors
      { id: 'e1', label: '5+ Yrs Track Record', category: 'evidence', x: width * 0.18, y: height * 0.44, vx: 0.1, vy: -0.12, radius: 14, baseRadius: 14, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.35)' },
      { id: 'e2', label: 'Truthfulness Guarantee (100%)', category: 'evidence', x: width * 0.48, y: height * 0.82, vx: 0.12, vy: 0.06, radius: 15, baseRadius: 15, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.35)' },
      { id: 'e3', label: 'Verified ATS Ingestion', category: 'evidence', x: width * 0.22, y: height * 0.25, vx: -0.08, vy: 0.09, radius: 13, baseRadius: 13, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.35)' },

      // Opportunity matches
      { id: 'o1', label: 'Staff Frontend Lead', category: 'opportunity', x: width * 0.72, y: height * 0.34, vx: -0.11, vy: 0.12, radius: 20, baseRadius: 20, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', company: 'Linear', matchScore: 94 },
      { id: 'o2', label: 'Principal Systems Architect', category: 'opportunity', x: width * 0.78, y: height * 0.58, vx: 0.1, vy: -0.14, radius: 22, baseRadius: 22, color: '#818cf8', glowColor: 'rgba(129, 140, 248, 0.4)', company: 'Cloudflare Ecosystem', matchScore: 96 },
      { id: 'o3', label: 'AI Product Engineer', category: 'opportunity', x: width * 0.65, y: height * 0.75, vx: -0.14, vy: -0.09, radius: 19, baseRadius: 19, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.4)', company: 'Stripe', matchScore: 91 },
      { id: 'o4', label: 'Senior Full Stack Lead', category: 'opportunity', x: width * 0.84, y: height * 0.42, vx: 0.08, vy: 0.11, radius: 18, baseRadius: 18, color: '#60a5fa', glowColor: 'rgba(96, 165, 250, 0.4)', company: 'Vercel Ecosystem', matchScore: 89 },
    ];

    const edges: Edge[] = [
      { source: 'core', target: 's1', strength: 0.8, pulseProgress: 0.1, pulseSpeed: 0.008 },
      { source: 'core', target: 's2', strength: 0.8, pulseProgress: 0.4, pulseSpeed: 0.007 },
      { source: 'core', target: 's3', strength: 0.9, pulseProgress: 0.7, pulseSpeed: 0.009 },
      { source: 'core', target: 's4', strength: 0.7, pulseProgress: 0.25, pulseSpeed: 0.006 },
      { source: 'core', target: 's5', strength: 0.85, pulseProgress: 0.55, pulseSpeed: 0.0085 },
      
      { source: 's1', target: 'e1', strength: 0.6, pulseProgress: 0.2, pulseSpeed: 0.005 },
      { source: 's2', target: 'e1', strength: 0.5, pulseProgress: 0.8, pulseSpeed: 0.006 },
      { source: 's1', target: 'e3', strength: 0.5, pulseProgress: 0.35, pulseSpeed: 0.007 },
      { source: 'core', target: 'e2', strength: 0.9, pulseProgress: 0.6, pulseSpeed: 0.008 },
      
      { source: 's1', target: 'o2', strength: 0.9, pulseProgress: 0.15, pulseSpeed: 0.009 },
      { source: 's3', target: 'o2', strength: 0.85, pulseProgress: 0.45, pulseSpeed: 0.0075 },
      { source: 's2', target: 'o1', strength: 0.85, pulseProgress: 0.3, pulseSpeed: 0.008 },
      { source: 's3', target: 'o1', strength: 0.75, pulseProgress: 0.65, pulseSpeed: 0.007 },
      { source: 's5', target: 'o3', strength: 0.9, pulseProgress: 0.5, pulseSpeed: 0.009 },
      { source: 's2', target: 'o4', strength: 0.7, pulseProgress: 0.8, pulseSpeed: 0.0065 },
      { source: 'core', target: 'o2', strength: 0.95, pulseProgress: 0.05, pulseSpeed: 0.01 },
      { source: 'core', target: 'o1', strength: 0.9, pulseProgress: 0.38, pulseSpeed: 0.009 },
    ];

    const nodes = initialNodes;

    // Intersection observer to pause rendering when scrolled out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    // Visibility change listener
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Mouse movement inside canvas
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mousePosRef.current = { x, y, active: true };

      // Check hovered node
      let found: Node | null = null;
      for (const node of nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < node.radius + 10) {
          found = node;
          break;
        }
      }
      setActiveNode(found);
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
      setActiveNode(null);
    };

    const handleClick = () => {
      if (activeNode && onSelectNode) {
        onSelectNode(activeNode.label);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    // Render Loop
    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle connecting grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update positions with subtle floating physics
      if (!prefersReducedMotion) {
        for (const node of nodes) {
          if (node.id !== 'core') {
            node.x += node.vx;
            node.y += node.vy;

            // Soft bounds bounce
            const padding = 50;
            if (node.x < padding || node.x > width - padding) node.vx *= -1;
            if (node.y < padding || node.y > height - padding) node.vy *= -1;

            // Mouse repulsion / attraction
            if (mousePosRef.current.active) {
              const dx = mousePosRef.current.x - node.x;
              const dy = mousePosRef.current.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 140 && dist > 10) {
                const force = (140 - dist) / 140 * 0.02;
                node.x += dx * force;
                node.y += dy * force;
              }
            }
          }
        }
      }

      // 2. Draw Edges & Pulses
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        const isHighlighted = activeNode && (activeNode.id === edge.source || activeNode.id === edge.target);

        // Edge line
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * edge.strength})`;
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Traveling pulse particle along edge
        if (!prefersReducedMotion) {
          edge.pulseProgress = (edge.pulseProgress + edge.pulseSpeed) % 1;
          const px = sourceNode.x + (targetNode.x - sourceNode.x) * edge.pulseProgress;
          const py = sourceNode.y + (targetNode.y - sourceNode.y) * edge.pulseProgress;

          ctx.beginPath();
          ctx.arc(px, py, isHighlighted ? 2.8 : 1.8, 0, Math.PI * 2);
          ctx.fillStyle = isHighlighted ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = isHighlighted ? 10 : 4;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }

      // 3. Draw Nodes
      for (const node of nodes) {
        const isHovered = activeNode?.id === node.id;
        const targetRadius = isHovered ? node.baseRadius * 1.25 : node.baseRadius;
        node.radius += (targetRadius - node.radius) * 0.15;

        // Radial glow halo
        const haloGrad = ctx.createRadialGradient(node.x, node.y, node.radius * 0.2, node.x, node.y, node.radius * 2.5);
        haloGrad.addColorStop(0, node.glowColor);
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // Node inner circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#0f172a' : '#090d16';
        ctx.fill();

        // Node border ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#ffffff' : node.color;
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Label rendering
        ctx.font = node.category === 'core' 
          ? 'bold 12px Inter, sans-serif'
          : node.category === 'opportunity'
          ? '600 11px Inter, sans-serif'
          : '500 10.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isHovered ? '#ffffff' : node.category === 'core' ? '#38bdf8' : '#94a3b8';
        ctx.fillText(node.label, node.x, node.y + node.radius + 15);

        // Subtitle badge if opportunity
        if (node.company) {
          ctx.font = '500 9px monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`${node.company} · ${node.matchScore}% Match`, node.x, node.y + node.radius + 28);
        } else if (node.confidence) {
          ctx.font = '500 9px monospace';
          ctx.fillStyle = '#06b6d4';
          ctx.fillText(`Verified ${node.confidence}%`, node.x, node.y + node.radius + 27);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [prefersReducedMotion, onSelectNode]);

  return (
    <div ref={containerRef} className={`relative w-full h-[520px] md:h-[600px] select-none ${className}`}>
      {/* Background ambient lighting layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-[90px]" />
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair relative z-10"
      />

      {/* Interactive Legend & Coordinates */}
      <div className="absolute bottom-4 left-6 z-20 flex flex-wrap items-center gap-4 text-[10px] font-mono tracking-wider text-slate-400 bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/5">
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
          <span>VERIFIED SKILL</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          <span>EVIDENCE ANCHOR</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_6px_#38bdf8]" />
          <span>LIVE VACANCY MATCH</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">INTERACTIVE GRAPH: HOVER NODES</span>
      </div>
    </div>
  );
};
