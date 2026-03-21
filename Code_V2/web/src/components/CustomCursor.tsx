import { useState, useRef, useEffect, useCallback } from 'react';

interface Sparkle { id: number; x: number; y: number; tx: number; ty: number; color: string; }

const SPARKLE_COLORS = ['#f59e0b', '#f97316', '#fbbf24', '#fb923c', '#fde68a', '#fff7ed'];

function useCursor() {
    const dotRef   = useRef<HTMLDivElement>(null);
    const ringRef  = useRef<HTMLDivElement>(null);
    const pos      = useRef({ x: -200, y: -200 });
    const ring     = useRef({ x: -200, y: -200 });
    const raf      = useRef<number>(0);
    const hovering = useRef(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const sparkleId = useRef(0);

    const animate = useCallback(() => {
        ring.current.x += (pos.current.x - ring.current.x) * 0.12;
        ring.current.y += (pos.current.y - ring.current.y) * 0.12;

        if (dotRef.current) {
            dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
        }
        if (ringRef.current) {
            const scale = hovering.current ? 1.8 : 1;
            ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) scale(${scale})`;
        }
        raf.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; };
        const onEnter = () => { hovering.current = true; };
        const onLeave = () => { hovering.current = false; };

        const onClick = (e: MouseEvent) => {
            const burst: Sparkle[] = Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dist  = 32 + Math.random() * 20;
                return {
                    id: ++sparkleId.current,
                    x: e.clientX, y: e.clientY,
                    tx: Math.cos(angle) * dist,
                    ty: Math.sin(angle) * dist,
                    color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
                };
            });
            setSparkles(prev => [...prev, ...burst]);
            setTimeout(() => setSparkles(prev => prev.filter(s => !burst.find(b => b.id === s.id))), 700);
        };

        const attachHover = () => {
            document.querySelectorAll('a, button, [role="button"], input, textarea, select, label').forEach(el => {
                el.addEventListener('mouseenter', onEnter);
                el.addEventListener('mouseleave', onLeave);
            });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('click', onClick);
        attachHover();
        const mo = new MutationObserver(attachHover);
        mo.observe(document.body, { childList: true, subtree: true });
        raf.current = requestAnimationFrame(animate);

        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('click', onClick);
            cancelAnimationFrame(raf.current);
            mo.disconnect();
        };
    }, [animate]);

    return { dotRef, ringRef, sparkles };
}

export default function CustomCursor() {
    const { dotRef, ringRef, sparkles } = useCursor();
    return (
        <>
            {/* Heart */}
            <div
                ref={dotRef}
                style={{
                    position: 'fixed', top: 0, left: 0, zIndex: 9999,
                    pointerEvents: 'none',
                    marginLeft: -8, marginTop: -8,
                    filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.9))',
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f97316">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </div>

            {/* Ring */}
            <div
                ref={ringRef}
                style={{
                    position: 'fixed', top: 0, left: 0, zIndex: 9998,
                    width: 36, height: 36,
                    border: '1.5px solid rgba(249,115,22,0.5)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    marginLeft: -18, marginTop: -18,
                    transition: 'transform 0s, border-color 0.2s',
                }}
            />

            {/* Sparkles */}
            {sparkles.map(s => (
                <div
                    key={s.id}
                    style={{
                        position: 'fixed',
                        top: s.y, left: s.x,
                        zIndex: 9997,
                        pointerEvents: 'none',
                        width: 7, height: 7,
                        borderRadius: '50%',
                        background: s.color,
                        boxShadow: `0 0 8px ${s.color}`,
                        animation: 'sparkle-burst 0.65s ease-out forwards',
                        marginLeft: -3.5, marginTop: -3.5,
                        ['--tx' as string]: `${s.tx}px`,
                        ['--ty' as string]: `${s.ty}px`,
                    }}
                />
            ))}
        </>
    );
}
