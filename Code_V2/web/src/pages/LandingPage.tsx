import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Sun, ChevronRight, CheckCircle2, Award, ShieldCheck, MapPin, Clock, Users, Briefcase, FileCheck, Star, Mail, Github, Twitter } from 'lucide-react';

interface Props {
    onGoLogin: () => void;
    onGoRegister: () => void;
}

// ─── Custom cursor with sparkle effect ───────────────────────────────────────
interface Sparkle { id: number; x: number; y: number; tx: number; ty: number; color: string; }

const SPARKLE_COLORS = ['#f59e0b', '#f97316', '#fbbf24', '#fb923c', '#fde68a', '#fff7ed'];

function useCursor() {
    const dotRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const pos = useRef({ x: -200, y: -200 });
    const ring = useRef({ x: -200, y: -200 });
    const raf = useRef<number>(0);
    const hovering = useRef(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const sparkleId = useRef(0);

    const animate = useCallback(() => {
        const lerpFactor = 0.12;
        ring.current.x += (pos.current.x - ring.current.x) * lerpFactor;
        ring.current.y += (pos.current.y - ring.current.y) * lerpFactor;

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
        const onMove = (e: MouseEvent) => {
            pos.current = { x: e.clientX, y: e.clientY };
        };

        const onEnterInteractive = () => { hovering.current = true; };
        const onLeaveInteractive = () => { hovering.current = false; };

        const onClick = (e: MouseEvent) => {
            const burst: Sparkle[] = Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dist = 32 + Math.random() * 20;
                return {
                    id: ++sparkleId.current,
                    x: e.clientX,
                    y: e.clientY,
                    tx: Math.cos(angle) * dist,
                    ty: Math.sin(angle) * dist,
                    color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
                };
            });
            setSparkles(prev => [...prev, ...burst]);
            setTimeout(() => {
                setSparkles(prev => prev.filter(s => !burst.find(b => b.id === s.id)));
            }, 700);
        };

        const attachHoverListeners = () => {
            document.querySelectorAll('a, button, [role="button"]').forEach(el => {
                el.addEventListener('mouseenter', onEnterInteractive);
                el.addEventListener('mouseleave', onLeaveInteractive);
            });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('click', onClick);
        attachHoverListeners();
        // Re-attach on DOM changes (dynamic content)
        const mo = new MutationObserver(attachHoverListeners);
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

function CustomCursor() {
    const { dotRef, ringRef, sparkles } = useCursor();
    return (
        <>
            {/* Dot */}
            <div
                ref={dotRef}
                style={{
                    position: 'fixed', top: 0, left: 0, zIndex: 9999,
                    width: 10, height: 10,
                    background: 'radial-gradient(circle, #f97316, #f59e0b)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    marginLeft: -4, marginTop: -4,
                    boxShadow: '0 0 6px rgba(249,115,22,0.8)',
                }}
            />
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
                    backdropFilter: 'none',
                }}
            />
            {/* Sparkles */}
            {sparkles.map(s => (
                <div
                    key={s.id}
                    style={{
                        position: 'fixed',
                        top: s.y,
                        left: s.x,
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

// ─── Count-up hook (triggers on scroll into view) ────────────────────────────
function useCountUp(target: number, duration = 1800) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
            { threshold: 0.5 },
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!started || target === 0) return;
        let current = 0;
        const steps = 60;
        const increment = target / steps;
        const interval = duration / steps;
        const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            setCount(Math.round(current));
            if (current >= target) clearInterval(timer);
        }, interval);
        return () => clearInterval(timer);
    }, [started, target, duration]);

    return { count, ref };
}

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
    const { count, ref } = useCountUp(target);
    return (
        <div ref={ref} className="text-center text-white">
            <h3 className="text-4xl lg:text-5xl font-extrabold tabular-nums">
                {count.toLocaleString()}{suffix}
            </h3>
            <p className="text-orange-100 font-semibold mt-2">{label}</p>
        </div>
    );
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
const TYPEWRITER_PHRASES = ['Connect Volunteers', 'Track Impact', 'Issue Certificates', 'Build Community'];

function useTypewriter(phrases: string[], speed = 80, pause = 2000) {
    const [displayed, setDisplayed] = useState('');
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const phrase = phrases[phraseIdx];
        let timeout: ReturnType<typeof setTimeout>;

        if (!deleting && charIdx < phrase.length) {
            timeout = setTimeout(() => setCharIdx(c => c + 1), speed);
        } else if (!deleting && charIdx === phrase.length) {
            timeout = setTimeout(() => setDeleting(true), pause);
        } else if (deleting && charIdx > 0) {
            timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2);
        } else {
            setDeleting(false);
            setPhraseIdx(i => (i + 1) % phrases.length);
        }

        setDisplayed(phrase.slice(0, charIdx));
        return () => clearTimeout(timeout);
    }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

    return displayed;
}

// ─── Testimonials data ────────────────────────────────────────────────────────
const TESTIMONIALS = [
    {
        name: 'Sarah Chen',
        role: 'Volunteer',
        avatar: 'SC',
        avatarColor: 'from-amber-400 to-orange-500',
        stars: 5,
        quote: 'VSMS made finding volunteer opportunities so easy. The geo-check-in is brilliant — no more paper sign-in sheets!',
    },
    {
        name: 'Marcus Rivera',
        role: 'Event Coordinator',
        avatar: 'MR',
        avatarColor: 'from-blue-400 to-blue-600',
        stars: 5,
        quote: 'Managing 200+ volunteers across 12 events used to be chaos. Now everything is in one place and our no-show rate dropped by 40%.',
    },
    {
        name: 'Priya Nair',
        role: 'Volunteer',
        avatar: 'PN',
        avatarColor: 'from-violet-400 to-violet-600',
        stars: 5,
        quote: 'The skill-matching AI found me opportunities I never would have discovered on my own. My certificate collection is growing fast!',
    },
    {
        name: 'James Okafor',
        role: 'Organization Admin',
        avatar: 'JO',
        avatarColor: 'from-emerald-400 to-emerald-600',
        stars: 4,
        quote: 'The approval workflow and dispute resolution features saved us countless hours. The platform health dashboard is a nice bonus.',
    },
];

export default function LandingPage({ onGoLogin, onGoRegister }: Props) {
    const typewriterText = useTypewriter(TYPEWRITER_PHRASES);

    // Hero card cycling
    const [heroCard, setHeroCard] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setHeroCard(p => (p + 1) % 4), 3000);
        return () => clearInterval(t);
    }, []);

    // Testimonials auto-scroll
    const carouselRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const scrollDir = useRef(1);

    useEffect(() => {
        if (isPaused) return;
        const el = carouselRef.current;
        if (!el) return;

        const timer = setInterval(() => {
            const maxScroll = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= maxScroll - 2) scrollDir.current = -1;
            if (el.scrollLeft <= 2) scrollDir.current = 1;
            el.scrollBy({ left: scrollDir.current * 1.5, behavior: 'auto' });
        }, 20);

        return () => clearInterval(timer);
    }, [isPaused]);

    return (
        <div className="light-page min-h-screen bg-[#fffaf5] flex flex-col font-sans">
            <CustomCursor />

            {/* ─── Header ─── */}
            <header className="bg-white/70 backdrop-blur-xl shadow-sm shadow-stone-100/80 sticky top-0 z-50 border-b border-stone-100/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                            <Heart className="h-4 w-4 text-white fill-white" />
                        </div>
                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500 tracking-tight">VSMS</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
                        <a href="#how-it-works" className="hover:text-orange-500 transition-colors">How It Works</a>
                        <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
                        <a href="#testimonials" className="hover:text-orange-500 transition-colors">Testimonials</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button onClick={onGoLogin} className="text-stone-600 hover:text-orange-500 font-semibold transition-colors text-sm">
                            Log In
                        </button>
                        <button
                            onClick={onGoRegister}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-5 py-2 rounded-full font-semibold transition-all shadow-sm shadow-orange-400/30 text-sm"
                        >
                            Join Now
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* ─── Hero Section ─── */}
                <section className="relative overflow-hidden">
                    {/* Animated gradient orb blobs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl animate-gradient"
                            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)' }} />
                        <div className="absolute top-10 -right-20 w-96 h-96 rounded-full blur-3xl animate-gradient"
                            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)', animationDelay: '2s' }} />
                        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full blur-3xl animate-gradient"
                            style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)', animationDelay: '4s' }} />
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-12 relative z-10">
                        {/* Left: text */}
                        <div className="lg:w-1/2 flex flex-col items-start text-left animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm mb-6 shadow-sm border border-amber-200/80">
                                <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                                VSMS V1.0 is spreading hope
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-extrabold text-stone-900 leading-tight mb-4">
                                Empower care, making volunteering{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                                    brighter
                                </span>
                            </h1>
                            {/* Typewriter subtitle */}
                            <div className="h-9 flex items-center mb-6">
                                <p className="text-xl font-bold text-orange-500">
                                    {typewriterText}
                                    <span className="inline-block w-0.5 h-5 bg-orange-400 ml-0.5 animate-pulse" />
                                </p>
                            </div>
                            <p className="text-lg text-stone-500 mb-8 max-w-lg leading-relaxed">
                                An all-in-one volunteer service management platform. From publishing opportunities and smart matching to real-time geo-attendance and automated certificate generation.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <button
                                    onClick={onGoRegister}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-8 py-3 rounded-full text-base font-bold transition-all shadow-lg shadow-orange-400/30 hover:shadow-orange-400/50 hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    Get Started <ChevronRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onGoLogin}
                                    className="bg-white hover:bg-orange-50 text-stone-700 border border-stone-200 px-8 py-3 rounded-full text-base font-semibold transition-all shadow-sm hover:-translate-y-0.5"
                                >
                                    Log In
                                </button>
                            </div>
                        </div>

                        {/* Right: hero visual — 3 auto-cycling cards */}
                        <div className="lg:w-1/2 w-full flex items-center justify-center py-10 lg:py-0 lg:min-h-[480px]">
                            <div className="relative" style={{ width: 360, height: 360 }}>
                                {[
                                    /* ── Card 0: Certificate ── */
                                    <div key="cert" className="absolute inset-0 bg-white rounded-2xl p-5 flex flex-col">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-amber-100 p-2 rounded-xl shrink-0"><Award className="w-5 h-5 text-amber-600" /></div>
                                            <div>
                                                <p className="text-xs text-stone-400">Certificate Issued</p>
                                                <p className="font-bold text-stone-800 text-sm">Light Bringer</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-1">
                                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: '72%' }} />
                                        </div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs text-stone-400">72% toward next tier</p>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Gold</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="bg-stone-50 rounded-xl p-2.5 text-center">
                                                <div className="text-sm font-black text-stone-800">128</div>
                                                <div className="text-[10px] text-stone-400">Hours</div>
                                            </div>
                                            <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                                                <div className="text-sm font-black text-amber-600">24</div>
                                                <div className="text-[10px] text-stone-400">Events</div>
                                            </div>
                                            <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                                                <div className="text-sm font-black text-orange-500">6</div>
                                                <div className="text-[10px] text-stone-400">Badges</div>
                                            </div>
                                        </div>
                                        {/* Footer — pinned to bottom */}
                                        <div className="mt-auto pt-3 border-t border-stone-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                                        <span className="text-[9px] font-black text-white">S</span>
                                                    </div>
                                                    <span className="text-xs text-stone-500 font-medium">Sarah Chen</span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Active Volunteer</span>
                                            </div>
                                        </div>
                                    </div>,

                                    /* ── Card 1: Check-in ── */
                                    <div key="checkin" className="absolute inset-0 bg-white rounded-2xl p-5 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="bg-emerald-100 p-2 rounded-xl shrink-0">
                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-stone-400">Checked In</p>
                                                <p className="font-bold text-stone-800 text-sm">Riverside Park</p>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3.5 mb-3">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                                <span className="text-xs font-semibold text-emerald-700">Active Session</span>
                                            </div>
                                            <p className="text-sm font-bold text-stone-800">Beach Cleanup Day</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3 text-stone-400" />
                                                <p className="text-xs text-stone-400">9:00 AM — 1:00 PM</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 mb-3">
                                            <span className="text-xs text-stone-500">Hours logged today</span>
                                            <span className="text-lg font-black text-emerald-600">3.5 h</span>
                                        </div>
                                        {/* Footer */}
                                        <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-xs text-stone-500">Coordinator confirmed</span>
                                            </div>
                                            <div className="flex -space-x-1.5">
                                                {['A', 'B', 'C', 'D'].map((l, idx) => (
                                                    <div key={l} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white"
                                                        style={{ background: ['#f59e0b', '#10b981', '#8b5cf6', '#f97316'][idx] }}>
                                                        {l}
                                                    </div>
                                                ))}
                                                <div className="w-5 h-5 rounded-full border border-white bg-stone-200 flex items-center justify-center text-[8px] font-bold text-stone-500">+8</div>
                                            </div>
                                        </div>
                                    </div>,

                                    /* ── Card 2: AI Match ── */
                                    <div key="aimatch" className="absolute inset-0 rounded-2xl p-5 overflow-hidden flex flex-col"
                                        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)' }}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Star className="w-5 h-5 text-white fill-white/70" />
                                            <div>
                                                <p className="text-[10px] text-white/70">Powered by AI</p>
                                                <p className="text-sm font-bold text-white">Matched Events</p>
                                            </div>
                                        </div>
                                        {[
                                            { name: 'Beach Cleanup', tag: 'Environment', pct: 98 },
                                            { name: 'Food Bank Help', tag: 'Community', pct: 91 },
                                            { name: 'Tree Planting', tag: 'Green', pct: 87 },
                                        ].map(ev => (
                                            <div key={ev.name} className="flex items-center justify-between bg-white/20 rounded-xl px-3 py-2.5 mb-2">
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{ev.name}</p>
                                                    <p className="text-[10px] text-white/60">{ev.tag}</p>
                                                </div>
                                                <span className="text-xs font-black text-white bg-white/25 px-2 py-0.5 rounded-full">{ev.pct}%</span>
                                            </div>
                                        ))}
                                        {/* Footer */}
                                        <div className="mt-auto pt-3 border-t border-white/20 flex items-center justify-between">
                                            <span className="text-[10px] text-white/60">Based on your skills &amp; location</span>
                                            <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded-full">12 total</span>
                                        </div>
                                    </div>,

                                    /* ── Card 3: AI Assistant ── */
                                    <div key="ai" className="absolute inset-0 rounded-2xl p-5 flex flex-col overflow-hidden"
                                        style={{ background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>
                                        {/* Header */}
                                        <div className="flex items-center gap-2.5 mb-4">
                                            <div className="w-8 h-8 rounded-xl bg-violet-500/30 flex items-center justify-center">
                                                <Star className="w-4 h-4 text-violet-300 fill-violet-300/50" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-violet-300/70">VSMS</p>
                                                <p className="text-sm font-bold text-white">AI Assistant</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                                            </div>
                                        </div>
                                        {/* Chat bubbles */}
                                        <div className="flex flex-col gap-2.5 flex-1">
                                            <div className="self-end bg-violet-500/40 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                                                <p className="text-xs text-violet-100">What events match my skills?</p>
                                            </div>
                                            <div className="self-start bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]">
                                                <p className="text-xs text-white/90 leading-relaxed">I found <span className="font-bold text-violet-300">3 great matches</span> near you — Beach Cleanup (98%), Food Bank (91%), and Tree Planting (87%). Want me to apply for you?</p>
                                            </div>
                                            <div className="self-end bg-violet-500/40 rounded-2xl rounded-tr-sm px-3 py-2">
                                                <p className="text-xs text-violet-100">Yes, apply to the top 2!</p>
                                            </div>
                                            <div className="self-start bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2">
                                                <p className="text-xs text-white/90">Done! ✅ Applications submitted.</p>
                                            </div>
                                        </div>
                                        {/* Footer */}
                                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                                            <div className="flex-1 bg-white/10 rounded-xl px-3 py-2">
                                                <p className="text-[10px] text-white/40">Ask anything about volunteering…</p>
                                            </div>
                                            <div className="w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center shrink-0">
                                                <ChevronRight className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        </div>
                                    </div>,
                                ].map((cardContent, i) => {
                                    const rank = (i - heroCard + 4) % 4; // 0=front, 1=mid, 2=back2, 3=back3
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 16,
                                                overflow: 'hidden',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                zIndex: rank === 0 ? 10 : rank === 1 ? 6 : rank === 2 ? 3 : 1,
                                                transform: rank === 0
                                                    ? 'rotate(0deg) scale(1) translate(0px, 0px)'
                                                    : rank === 1
                                                        ? 'rotate(4deg) scale(0.95) translate(18px, 14px)'
                                                        : rank === 2
                                                            ? 'rotate(8deg) scale(0.90) translate(36px, 28px)'
                                                            : 'rotate(11deg) scale(0.85) translate(52px, 40px)',
                                                opacity: rank === 0 ? 1 : rank === 1 ? 0.72 : rank === 2 ? 0.45 : 0.2,
                                                boxShadow: rank === 0
                                                    ? '0 20px 40px -8px rgba(0,0,0,0.18)'
                                                    : rank === 1
                                                        ? '0 8px 20px -4px rgba(0,0,0,0.10)'
                                                        : '0 4px 8px -2px rgba(0,0,0,0.06)',
                                                transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, box-shadow 0.5s ease',
                                            }}
                                        >
                                            {cardContent}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Trust Bar ─── */}
                <section className="bg-white border-y border-stone-100 py-5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Trusted by organizations including</span>
                            {['City Volunteer Hub', 'Green Future NGO', 'Youth Connect', 'Care Together', 'HopeReach'].map(name => (
                                <span key={name} className="text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors cursor-default">{name}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── How It Works ─── */}
                <section id="how-it-works" className="bg-white py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">How It Works</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Three simple steps to start your volunteer journey</p>
                        </div>
                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Connecting dashes (desktop only) */}
                            <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-0 pointer-events-none"
                                style={{ borderTop: '2px dashed #e7e5e4', zIndex: 0 }} />

                            {[
                                { step: '01', title: 'Sign Up & Create Profile', desc: 'Register as a volunteer, coordinator, or organization admin. Set up your skills and preferences.', color: 'from-amber-400 to-orange-500' },
                                { step: '02', title: 'Discover & Apply', desc: 'Browse published opportunities, use smart matching to find the best fit, and submit applications.', color: 'from-orange-500 to-rose-500' },
                                { step: '03', title: 'Check-in & Earn Certificates', desc: 'Validate attendance with geo-location, log hours automatically, and receive digital certificates.', color: 'from-rose-500 to-pink-500' },
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    className="relative group animate-fade-in-up z-10"
                                    style={{ animationDelay: `${idx * 0.15}s` }}
                                >
                                    <div className={`absolute -top-4 -left-2 w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center font-extrabold text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                                        {item.step}
                                    </div>
                                    <div className="bg-stone-50 rounded-3xl p-8 pt-14 border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                                        <h3 className="text-xl font-bold text-stone-800 mb-3">{item.title}</h3>
                                        <p className="text-stone-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Platform Features ─── */}
                <section id="features" className="py-20" style={{ background: 'linear-gradient(135deg, #fffaf5 0%, #fff7ee 100%)' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Platform Features</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Everything you need to manage volunteer services effectively</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { icon: Briefcase, title: 'Opportunity Management', desc: 'Create, publish, and manage volunteer opportunities with shifts and capacity control.', bg: 'from-blue-400 to-blue-600' },
                                { icon: Users, title: 'AI Smart Matching', desc: 'AI-driven skill matching to connect the right volunteers with the right opportunities.', bg: 'from-amber-400 to-orange-500' },
                                { icon: MapPin, title: 'Geo-Attendance', desc: 'Real-time location validation for check-in/check-out with proof of attendance.', bg: 'from-emerald-400 to-emerald-600' },
                                { icon: FileCheck, title: 'Auto Certificates', desc: 'Generate and issue digital certificates automatically upon completion of volunteer hours.', bg: 'from-rose-400 to-rose-600' },
                                { icon: ShieldCheck, title: 'Organization Control', desc: 'Full admin dashboard for managing organizations, users, and resolving disputes.', bg: 'from-violet-400 to-violet-600' },
                                { icon: Clock, title: 'Hours Tracking', desc: 'Automatic calculation and tracking of volunteer hours with detailed reports.', bg: 'from-cyan-400 to-cyan-600' },
                            ].map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="group relative p-[1px] rounded-3xl bg-gradient-to-br from-stone-100 to-stone-50 hover:from-orange-200 hover:to-amber-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="bg-white rounded-3xl p-7 h-full">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm`}>
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-stone-800 mb-2">{feature.title}</h3>
                                        <p className="text-stone-500 leading-relaxed text-sm">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Stats Banner (count-up) ─── */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <StatCounter target={10000} suffix="+" label="Volunteers" />
                            <StatCounter target={500} suffix="+" label="Organizations" />
                            <StatCounter target={2000} suffix="+" label="Opportunities" />
                            <StatCounter target={50000} suffix="+" label="Hours Logged" />
                        </div>
                    </div>
                </section>

                {/* ─── Testimonials ─── */}
                <section id="testimonials" className="bg-white py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">What People Are Saying</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Real stories from volunteers and coordinators</p>
                        </div>
                        <div
                            ref={carouselRef}
                            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                        >
                            {/* Duplicate for seamless scroll feel */}
                            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
                                <div
                                    key={idx}
                                    className="shrink-0 w-72 bg-stone-50 rounded-2xl p-6 border border-stone-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    {/* Stars */}
                                    <div className="flex gap-0.5 mb-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < t.stars ? 'text-amber-400 fill-amber-400' : 'text-stone-200 fill-stone-200'}`} />
                                        ))}
                                    </div>
                                    <p className="text-stone-600 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                                            {t.avatar}
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">{t.name}</p>
                                            <p className="text-stone-400 text-xs">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Role-based Access Section ─── */}
                <section className="py-20" style={{ background: 'linear-gradient(135deg, #fffaf5 0%, #fff7ee 100%)' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Built for Every Role</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Tailored experiences for volunteers, coordinators, and administrators</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { role: 'Volunteer', desc: 'Find opportunities, track hours, manage skills, earn certificates, and build your impact profile.', features: ['Opportunity Search & Matching', 'Geo-Location Check-in', 'Skill Management', 'Certificate Collection'], gradient: 'from-amber-400 to-orange-500', icon: '🙋' },
                                { role: 'Coordinator', desc: 'Manage events, review applications, issue certificates, and track organizational metrics.', features: ['Event & Shift Management', 'Application Review', 'Certificate Templates', 'Org Analytics Dashboard'], gradient: 'from-orange-500 to-rose-500', icon: '👩‍💼' },
                                { role: 'System Admin', desc: 'Oversee the entire platform, approve organizations, manage users, and resolve disputes.', features: ['Org Approval Workflow', 'User Access Control', 'Dispute Resolution', 'Platform Health Metrics'], gradient: 'from-rose-500 to-violet-500', icon: '🛡️' },
                            ].map((item, idx) => (
                                <div key={idx} className="rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                                    <div className={`bg-gradient-to-r ${item.gradient} p-7 text-white relative overflow-hidden`}>
                                        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                                        <span className="text-4xl mb-3 block">{item.icon}</span>
                                        <h3 className="text-xl font-extrabold">{item.role}</h3>
                                    </div>
                                    <div className="p-7 bg-white">
                                        <p className="text-stone-500 mb-5 leading-relaxed text-sm">{item.desc}</p>
                                        <ul className="space-y-2.5">
                                            {item.features.map((f, i) => (
                                                <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── CTA Section ─── */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fff7ed 100%)' }} />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-3xl opacity-60"
                        style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.3) 0%, transparent 70%)' }} />
                    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-stone-900 mb-5 leading-tight">
                            Ready to Make a{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                                Difference?
                            </span>
                        </h2>
                        <p className="text-lg text-stone-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of volunteers and organizations on VSMS and start creating positive change in your community today.
                        </p>
                        <div className="flex justify-center gap-4 flex-wrap">
                            <button
                                onClick={onGoRegister}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-orange-400/30 hover:shadow-orange-400/50 hover:-translate-y-1 flex items-center gap-2"
                            >
                                Start Volunteering <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onGoLogin}
                                className="bg-white text-stone-700 border border-stone-200 px-10 py-4 rounded-full text-lg font-semibold transition-all hover:bg-orange-50 hover:border-orange-200 hover:-translate-y-1 shadow-sm"
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* ─── Footer (3-col) ─── */}
            <footer className="bg-stone-900 text-stone-400 pt-14 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-stone-800">
                        {/* Brand col */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                    <Heart className="h-4 w-4 text-white fill-white" />
                                </div>
                                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">VSMS</span>
                            </div>
                            <p className="text-sm leading-relaxed text-stone-500">
                                Volunteer Service Management System — connecting passionate people with meaningful opportunities.
                            </p>
                            <div className="flex gap-3 mt-1">
                                {[Twitter, Github, Mail].map((Icon, i) => (
                                    <button key={i} className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors">
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick links col */}
                        <div>
                            <h4 className="text-white font-bold mb-4 text-sm">Quick Links</h4>
                            <ul className="space-y-2.5 text-sm">
                                {[
                                    { label: 'How It Works', href: '#how-it-works' },
                                    { label: 'Platform Features', href: '#features' },
                                    { label: 'Testimonials', href: '#testimonials' },
                                    { label: 'Register', onClick: onGoRegister },
                                    { label: 'Log In', onClick: onGoLogin },
                                ].map((link, i) => (
                                    <li key={i}>
                                        {'onClick' in link ? (
                                            <button onClick={link.onClick} className="hover:text-orange-400 transition-colors">{link.label}</button>
                                        ) : (
                                            <a href={link.href} className="hover:text-orange-400 transition-colors">{link.label}</a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact col */}
                        <div>
                            <h4 className="text-white font-bold mb-4 text-sm">Contact</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /><span>support@vsms.app</span></li>
                                <li className="text-stone-500 leading-relaxed">Built as a Capstone project. Open to contributions and feedback from the community.</li>
                            </ul>
                            <div className="mt-5 flex gap-2 flex-wrap">
                                <span className="px-2.5 py-1 bg-stone-800 rounded-full text-xs font-medium text-stone-400">React 19</span>
                                <span className="px-2.5 py-1 bg-stone-800 rounded-full text-xs font-medium text-stone-400">ASP.NET Core</span>
                                <span className="px-2.5 py-1 bg-stone-800 rounded-full text-xs font-medium text-stone-400">Orleans</span>
                                <span className="px-2.5 py-1 bg-stone-800 rounded-full text-xs font-medium text-stone-400">PostgreSQL</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-stone-600">
                        <span>© 2026 Volunteer Service Management System. All rights reserved.</span>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
