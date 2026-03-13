import { useState, type FormEvent } from 'react';
import { Heart, Sun, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface Props {
    onBack: () => void;
    onGoLogin: () => void;
}

export default function RegisterPage({ onBack, onGoLogin }: Props) {
    const auth = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('Volunteer');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
        try {
            await auth.register({ email, password, role });
            // Navigation is handled by App.tsx effect
        } catch (err: any) {
            const d = err.response?.data;
            const msg = d?.message || (typeof d === 'string' ? d : d?.detail || d?.title || d?.error) || 'Registration failed. Please try again.';
            setError(String(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-orange-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-300/20 blur-3xl"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-rose-200/30 to-orange-200/30 blur-3xl"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-orange-900/10 overflow-hidden border border-white">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-8 text-center relative overflow-hidden">
                        <Sun className="absolute -right-8 -top-8 w-32 h-32 text-white opacity-20 animate-spin-slow" />
                        <Heart className="h-10 w-10 text-white fill-white mx-auto mb-3 relative z-10" />
                        <h2 className="text-2xl font-bold text-white relative z-10">Create an Account</h2>
                        <p className="text-orange-50 mt-1 relative z-10">Join VSMS today</p>
                    </div>

                    <form onSubmit={handleRegister} className="p-8">
                        {error && (
                            <div className="mb-5 p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
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
                                <label className="block text-sm font-medium text-stone-700 mb-1">Account Type</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                    required
                                >
                                    <option value="Volunteer">Volunteer</option>
                                    <option value="Coordinator">Organization Coordinator</option>
                                </select>
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
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 mt-6 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </div>
                        
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <p className="text-sm text-stone-500">
                                Already have an account?{' '}
                                <button type="button" onClick={onGoLogin} className="font-semibold text-orange-600 hover:text-orange-500">
                                    Log in
                                </button>
                            </p>
                            <button type="button" onClick={onBack} className="text-sm font-medium text-stone-400 hover:text-stone-600 transition-colors">
                                Back to Home
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
