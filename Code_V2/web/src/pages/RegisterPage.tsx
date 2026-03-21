import { useState, type FormEvent } from 'react';
import { Heart, Loader2, AlertCircle, Users, Building2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import CustomCursor from '../components/CustomCursor';

interface Props {
    onBack: () => void;
    onGoLogin: () => void;
}

// ─── Password strength ────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const levels = [
        { label: 'Too short', color: 'bg-stone-200' },
        { label: 'Weak', color: 'bg-rose-400' },
        { label: 'Fair', color: 'bg-amber-400' },
        { label: 'Good', color: 'bg-blue-400' },
        { label: 'Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[score] };
}

export default function RegisterPage({ onBack, onGoLogin }: Props) {
    const auth = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [role, setRole] = useState<UserRole>('Volunteer');
    const [tosAccepted, setTosAccepted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const pwStrength = getPasswordStrength(password);

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (!tosAccepted) {
            setError('Please accept the Terms of Service to continue');
            return;
        }

        setLoading(true);
        try {
            await auth.register({ email, password, role });
        } catch (err: any) {
            const d = err.response?.data;
            const msg = d?.message || (typeof d === 'string' ? d : d?.detail || d?.title || d?.error) || 'Registration failed. Please try again.';
            setError(String(msg));
        } finally {
            setLoading(false);
        }
    };

    const roleOptions: { value: UserRole; label: string; desc: string; preview: string; icon: typeof Users; gradient: string }[] = [
        {
            value: 'Volunteer',
            label: 'Volunteer',
            desc: 'Find and join volunteer opportunities',
            preview: 'Browse events · Track hours · Earn certificates',
            icon: Users,
            gradient: 'from-emerald-500 to-teal-500',
        },
        {
            value: 'Coordinator',
            label: 'Organization',
            desc: 'Manage events and recruit volunteers',
            preview: 'Post events · Review applications · Issue certs',
            icon: Building2,
            gradient: 'from-blue-500 to-cyan-500',
        },
    ];

    return (
        <div className="light-page min-h-screen flex">
            <CustomCursor />

            {/* ── Left: Brand panel (lg+) ── */}
            <div className="hidden lg:flex w-[46%] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 relative overflow-hidden flex-col items-center justify-center p-14">
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.13) 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
                <div className="absolute top-1/4 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-rose-400/30 rounded-full blur-3xl" />

                <div className="relative z-10 text-white text-center w-full max-w-sm">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/30 shadow-xl">
                            <Heart className="w-9 h-9 fill-white text-white" />
                        </div>
                        <span className="text-5xl font-black tracking-tight">VSMS</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-3 leading-tight">Join the Community</h1>
                    <p className="text-white/75 text-base max-w-xs mx-auto leading-relaxed">Create your account and start making a difference in your community today.</p>

                    <div className="mt-10 space-y-4">
                        {[
                            { icon: Users, text: 'Connect with 10K+ active volunteers' },
                            { icon: Building2, text: 'Partner with 500+ organizations' },
                            { icon: ShieldCheck, text: 'Verified opportunities & certificates' },
                        ].map(item => (
                            <div key={item.text} className="flex items-center gap-4 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/20 text-left">
                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                    <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/90 text-sm font-medium">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-left">
                        <p className="text-white/90 text-sm italic leading-relaxed">"I found my perfect volunteer match in minutes. The platform is incredibly intuitive and rewarding."</p>
                        <p className="text-white/55 text-xs mt-3 font-semibold">— Active Volunteer</p>
                    </div>
                </div>
            </div>

            {/* ── Right: Form panel ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative overflow-hidden">
                <div className="absolute inset-0 lg:hidden -z-10 pointer-events-none">
                    <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-300/20 blur-3xl" />
                    <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-rose-200/30 to-orange-200/30 blur-3xl" />
                </div>

                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                            <Heart className="w-5 h-5 fill-white text-white" />
                        </div>
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">VSMS</span>
                    </div>

                    <h2 className="text-2xl font-bold text-stone-800 mb-1">Create your account</h2>
                    <p className="text-stone-400 mb-6 text-sm">Join VSMS and start making an impact</p>

                    {error && (
                        <div className="mb-5 p-3.5 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all placeholder:text-stone-300"
                                required
                            />
                        </div>

                        {/* Role selector cards with preview */}
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-2">Account Type</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {roleOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setRole(opt.value)}
                                        className={`p-3.5 rounded-xl border-2 text-left transition-all group ${role === opt.value
                                            ? 'border-orange-400 bg-orange-50'
                                            : 'border-stone-200 bg-stone-50/80 hover:border-stone-300 hover:bg-stone-50'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center mb-2`}>
                                            <opt.icon className="w-4 h-4 text-white" />
                                        </div>
                                        <p className={`text-xs font-bold ${role === opt.value ? 'text-orange-700' : 'text-stone-700'}`}>{opt.label}</p>
                                        <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{opt.desc}</p>
                                        {/* Preview on hover/select */}
                                        <p className={`text-[9px] mt-1.5 leading-tight transition-all ${role === opt.value ? 'text-orange-400 opacity-100' : 'text-stone-300 opacity-0 group-hover:opacity-100'}`}>
                                            {opt.preview}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Password with show/hide + strength bar */}
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all placeholder:text-stone-300 pr-11"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {/* Strength indicator */}
                            {password.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < pwStrength.score ? pwStrength.color : 'bg-stone-100'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-stone-400">{pwStrength.label}</p>
                                </div>
                            )}
                        </div>

                        {/* Confirm password with show/hide */}
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 rounded-xl border bg-stone-50/80 text-stone-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all placeholder:text-stone-300 pr-11 ${
                                        confirmPassword && confirmPassword !== password ? 'border-rose-300' : 'border-stone-200'
                                    }`}
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* ToS checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={tosAccepted}
                                    onChange={e => setTosAccepted(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-4.5 h-4.5 rounded border-2 transition-all flex items-center justify-center ${tosAccepted ? 'bg-orange-500 border-orange-500' : 'border-stone-300 group-hover:border-orange-300'}`}
                                    style={{ width: 18, height: 18 }}>
                                    {tosAccepted && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                            </div>
                            <span className="text-xs text-stone-500 leading-relaxed">
                                I agree to the{' '}
                                <a href="#" className="text-orange-500 hover:text-orange-600 font-semibold">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-orange-500 hover:text-orange-600 font-semibold">Privacy Policy</a>
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !tosAccepted}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-1"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-stone-100 text-center space-y-2">
                        <p className="text-sm text-stone-500">
                            Already have an account?{' '}
                            <button type="button" onClick={onGoLogin} className="font-bold text-orange-500 hover:text-orange-600 transition-colors">
                                Log in
                            </button>
                        </p>
                        <button type="button" onClick={onBack} className="text-sm text-stone-400 hover:text-stone-600 transition-colors font-medium">
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
