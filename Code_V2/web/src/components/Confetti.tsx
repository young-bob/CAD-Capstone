import { useEffect, useRef } from 'react';

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    color: string;
    angle: number; spin: number;
    width: number; height: number;
    opacity: number;
}

const COLORS = ['#f59e0b', '#f97316', '#10b981', '#8b5cf6', '#3b82f6', '#ec4899', '#22d3ee'];

export default function Confetti({ onDone }: { onDone?: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 3 + 2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2,
            width: Math.random() * 10 + 5,
            height: Math.random() * 6 + 3,
            opacity: 1,
        }));

        const START = performance.now();
        const DURATION = 1500;
        let raf: number;

        const tick = (now: number) => {
            const elapsed = now - START;
            const progress = Math.min(elapsed / DURATION, 1);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // gravity
                p.angle += p.spin;
                p.opacity = Math.max(0, 1 - progress * 1.2);

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                ctx.restore();
            }

            if (progress < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                onDone?.();
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [onDone]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[9999] pointer-events-none"
        />
    );
}
