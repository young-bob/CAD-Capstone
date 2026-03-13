import { useState, type FormEvent } from 'react';
import { Heart, Sun, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface Props {
    onBack: () => void;
}

export default function LoginPage({ onBack }: Props) {
    const auth = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await auth.login({ email, password });
            // Navigation is handled by App.tsx effect
        } catch (err: any) {
            const d = err?.response?.data;
            setError(typeof d === 'string' ? d : (d?.message || d?.error || d?.Error || 'Login failed. Please check your credentials.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-orange-50/50 flex items-center justify-center p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-300/20 blur-3xl"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-rose-200/30 to-orange-200/30 blur-3xl"></div>
            </div>
            <div className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl shadow-orange-900/10 overflow-hidden border border-white">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-10 text-center relative overflow-hidden">
                    <Sun className="absolute -right-8 -top-8 w-32 h-32 text-white opacity-20 animate-spin-slow" />
                    <Heart className="h-12 w-12 text-white fill-white mx-auto mb-4 relative z-10" />
                    <h2 className="text-2xl font-bold text-white relative z-10">Welcome Back</h2>
                    <p className="text-orange-50 mt-2 relative z-10">Sign in with your VSMS account</p>
                </div>
                <form onSubmit={handleLogin} className="p-8">
                    {error && (
                        <div className="mb-5 p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">
                            {error}
                        </div>
                    )}
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'Signing in...' : 'Log In'}
                        </button>
                    </div>
                    <button type="button" onClick={onBack} className="w-full text-center text-sm text-stone-400 mt-6 hover:text-stone-600 transition-colors">
                        Back to Home
                    </button>
                </form>
            </div>
        </div>
    );
}
