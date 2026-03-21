import { useState, type FormEvent } from 'react';
import { Heart, Loader2, AlertCircle, Users, Clock, Award, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import CustomCursor from '../components/CustomCursor';

interface Props {
    onBack: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage({ onBack }: Props) {
    const auth = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const emailValid = EMAIL_REGEX.test(email);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await auth.login({ email, password });
        } catch (err: any) {
            const d = err?.response?.data;
            setError(typeof d === 'string' ? d : (d?.message || d?.error || d?.Error || 'Login failed. Please check your credentials.'));
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="text-3xl font-bold mb-3 leading-tight">Volunteer Service<br />Management System</h1>
                    <p className="text-white/75 text-base max-w-xs mx-auto leading-relaxed">Connect volunteers with meaningful opportunities that create lasting impact.</p>

                    <div className="mt-10 grid grid-cols-3 gap-3">
                        {[
                            { val: '10K+', label: 'Volunteers', icon: Users },
                            { val: '500+', label: 'Organizations', icon: Award },
                            { val: '50K+', label: 'Hours Given', icon: Clock },
                        ].map(item => (
                            <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex flex-col items-center gap-1.5">
                                <item.icon className="w-5 h-5 text-white/70" />
                                <div className="text-xl font-black">{item.val}</div>
                                <div className="text-white/70 text-[11px] font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-left">
                        <p className="text-white/90 text-sm italic leading-relaxed">"Making a difference has never been easier. VSMS connects our volunteers with the right opportunities every time."</p>
                        <p className="text-white/55 text-xs mt-3 font-semibold">— Event Coordinator</p>
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

                    <h2 className="text-2xl font-bold text-stone-800 mb-1">Welcome back</h2>
                    <p className="text-stone-400 mb-8 text-sm">Sign in to your account to continue</p>

                    {error && (
                        <div className="mb-5 p-3.5 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email with validation indicator */}
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onBlur={() => setEmailTouched(true)}
                                    placeholder="you@example.com"
                                    className={`w-full px-4 py-3 rounded-xl border bg-stone-50/80 text-stone-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all placeholder:text-stone-300 pr-10 ${
                                        emailTouched && email ? (emailValid ? 'border-emerald-300' : 'border-rose-300') : 'border-stone-200'
                                    }`}
                                    required
                                />
                                {emailTouched && email && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {emailValid
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            : <AlertCircle className="w-4 h-4 text-rose-400" />
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password with show/hide toggle */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-stone-700">Password</label>
                                <button type="button" className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/80 text-stone-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all placeholder:text-stone-300 pr-11"
                                    required
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
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'Signing in...' : 'Log In'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                        <button type="button" onClick={onBack} className="text-sm text-stone-400 hover:text-stone-600 transition-colors font-medium">
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
