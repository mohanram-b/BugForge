import React, { useEffect, useRef } from 'react';

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  isAccent?: boolean;
}

export const VectorMatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isTabVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Setup nodes based on screen dimension
    const nodeCount = Math.min(48, Math.max(24, Math.floor((width * height) / 38000)));
    const nodes: NodePoint[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const isAccent = Math.random() < 0.2; // 20% accent orange/amber nodes
      const baseAlpha = isAccent ? 0.25 + Math.random() * 0.2 : 0.08 + Math.random() * 0.12;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: isAccent ? 1.5 + Math.random() * 1.0 : 1.0 + Math.random() * 0.8,
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        pulsePhase: Math.random() * Math.PI * 2,
        isAccent,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (isTabVisibleRef.current && !animFrameIdRef.current) {
        lastTime = performance.now();
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let lastTime = performance.now();
    const connectionMaxDist = 130;
    const connectionMaxDistSq = connectionMaxDist * connectionMaxDist;

    const render = (time: number) => {
      if (!isTabVisibleRef.current) {
        animFrameIdRef.current = null;
        return;
      }

      const dt = Math.min(40, time - lastTime);
      lastTime = time;
      const speedMultiplier = dt / 16.66; // Normalize to 60fps

      ctx.clearRect(0, 0, width, height);

      // Draw subtle technical matrix grid lines
      const gridSize = 64;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move
        node.x += node.vx * speedMultiplier;
        node.y += node.vy * speedMultiplier;

        // Wrap edges smoothly
        if (node.x < -20) node.x = width + 20;
        else if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        else if (node.y > height + 20) node.y = -20;

        // Pulse alpha
        node.pulsePhase += node.pulseSpeed * speedMultiplier;
        node.alpha = node.baseAlpha + Math.sin(node.pulsePhase) * (node.baseAlpha * 0.35);

        // Draw connections to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < connectionMaxDistSq) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / connectionMaxDist) * 0.07;
            const hasAccent = node.isAccent || other.isAccent;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = hasAccent
              ? `rgba(249, 115, 22, ${lineAlpha * 1.5})`
              : `rgba(148, 163, 184, ${lineAlpha})`;
            ctx.lineWidth = hasAccent ? 0.75 : 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes on top
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isAccent
          ? `rgba(249, 115, 22, ${node.alpha})`
          : `rgba(203, 213, 225, ${node.alpha})`;
        ctx.fill();

        // Subtle glowing halo for accent nodes
        if (node.isAccent && node.alpha > 0.3) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(249, 115, 22, ${node.alpha * 0.15})`;
          ctx.fill();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        opacity: 0.85,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }}
    />
  );
};
