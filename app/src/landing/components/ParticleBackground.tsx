import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      // Jumlah partikel dikurangi sesuai luas layar, maks 45
      const count = Math.min(45, Math.floor((canvas.width * canvas.height) / 25000));
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.4 + 0.15,
      }));
    };

    resizeCanvas();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 200);
    };
    window.addEventListener('resize', handleResize);

    const CONNECTION_DIST = 90;
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;

    const animate = () => {
      frameRef.current++;
      // Render setiap frame untuk smooth, tapi skip connection draw setiap frame ganjil
      const particles = particlesRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, w, h);

      const doConnections = frameRef.current % 2 === 0;

      ctx.globalAlpha = 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        else if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        else if (p.y > h) { p.y = h; p.vy *= -1; }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,220,255,${p.alpha})`;
        ctx.fill();

        // Draw connections (skip every other frame to save CPU)
        if (doConnections) {
          for (let j = i + 1; j < particles.length; j++) {
            const other = particles[j];
            const dx = p.x - other.x;
            const dy = p.y - other.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < CONNECTION_DIST_SQ) {
              const alpha = 0.15 * (1 - distSq / CONNECTION_DIST_SQ);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = `rgba(0,220,255,${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
