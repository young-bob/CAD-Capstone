import { useState, useEffect, useCallback } from 'react';
import { Sun, Heart, Clock, CheckCircle2, Award, Calendar, User, MapPin, Search, Download, BadgeCheck, Camera, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import type { ViewName, OpportunitySummary, ApplicationSummary, AttendanceSummary, VolunteerProfile, Skill, CertificateTemplate } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { volunteerService } from '../../services/volunteers';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { attendanceService } from '../../services/attendance';
import { skillService } from '../../services/skills';
import { certificateService } from '../../services/certificates';

// ─── Shared loading / error / empty states ────────────────────
function Spinner() {
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>;
}
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-rose-700 font-medium">{msg}</p>
            {onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}
        </div>
    );
}
function Empty({ msg }: { msg: string }) {
    return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface DashboardProps { onNavigate: (view: ViewName) => void; }

export function VolDashboard({ onNavigate }: DashboardProps) {
    const auth = useAuth();
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const p = await volunteerService.getProfile(auth.linkedGrainId);
            setProfile(p);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load profile');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;

    const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || auth.email : auth.email;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold mb-3 flex items-center gap-3">Welcome, {name}! <Sun className="w-8 h-8 text-yellow-200" /></h1>
                    <p className="text-orange-50 text-lg max-w-xl font-medium">Ready to start today's volunteer service? Check your upcoming events.</p>
                    <button onClick={() => onNavigate('attendance')} className="mt-8 bg-white text-orange-600 px-8 py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Check-in (Validate Geo)</button>
                </div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                <Heart className="absolute -right-4 -bottom-4 w-56 h-56 text-white opacity-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Hours', val: String(profile?.totalHours ?? 0), unit: 'hrs', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Completed Events', val: String(profile?.completedOpportunities ?? 0), unit: 'times', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Credentials', val: String(profile?.credentials?.length ?? 0), unit: 'docs', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex items-center gap-5 hover:shadow-md transition-shadow group">
                        <div className={`${s.bg} p-4 rounded-2xl ${s.color} group-hover:bg-${s.color.split('-')[1]}-500 group-hover:text-white transition-colors`}><s.icon className="w-8 h-8" /></div>
                        <div>
                            <p className="text-sm font-semibold text-stone-400 uppercase tracking-wide">{s.label}</p>
                            <h3 className="text-3xl font-extrabold text-stone-800">{s.val} <span className="text-base font-medium text-stone-400">{s.unit}</span></h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER OPPORTUNITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolOpportunities() {
    const [opps, setOpps] = useState<OpportunitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

    const load = useCallback(async (q?: string) => {
        setLoading(true); setError('');
        try {
            const data = await opportunityService.search(q);
            setOpps(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load opportunities');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        load(query);
    };

    const tagColors: Record<string, string> = {
        'Community': 'text-rose-600 bg-rose-50',
        'Environment': 'text-emerald-600 bg-emerald-50',
        'Education': 'text-amber-600 bg-amber-50',
        'Health': 'text-blue-600 bg-blue-50',
        'Technology': 'text-violet-600 bg-violet-50',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Opportunities</h1><p className="text-stone-500 mt-2 text-lg">Discover meaningful projects.</p></div>
                <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="w-full pl-12 pr-4 py-3 rounded-full border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" />
                    </div>
                    <button type="submit" className="bg-orange-500 text-white px-6 py-3 rounded-full font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20">Search</button>
                </form>
            </div>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={() => load()} /> : opps.length === 0 ? <Empty msg="No opportunities found." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {opps.map(opp => (
                        <div key={opp.opportunityId} className="bg-white rounded-3xl p-7 shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group">
                            <div className="flex justify-between items-start mb-5">
                                <span className={`inline-block px-4 py-1.5 text-xs font-bold rounded-full ${tagColors[opp.category] || 'text-stone-600 bg-stone-50'}`}>{opp.category}</span>
                                <Heart className="w-6 h-6 text-stone-200 group-hover:text-rose-400 hover:!text-rose-500 hover:!fill-rose-500 cursor-pointer transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">{opp.title}</h3>
                            <p className="text-sm font-medium text-stone-500 mb-6">{opp.organizationName}</p>
                            <div className="mt-auto space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-sm font-medium text-stone-600"><Calendar className="w-4 h-4 text-orange-500" /><span>{opp.publishDate ? new Date(opp.publishDate).toLocaleDateString() : 'N/A'}</span></div>
                                <div className="flex items-center gap-3 text-sm font-medium text-stone-600"><User className="w-4 h-4 text-orange-500" /><span>{opp.availableSpots}/{opp.totalSpots} spots</span></div>
                            </div>
                            <button disabled={opp.availableSpots === 0} className={`w-full py-3.5 rounded-2xl font-bold transition-all ${opp.availableSpots === 0 ? 'bg-stone-100 text-stone-400' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'}`}>
                                {opp.availableSpots === 0 ? 'Fully Booked' : 'View Details'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER APPLICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolApplications() {
    const auth = useAuth();
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await applicationService.getForVolunteer(auth.linkedGrainId);
            setApps(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load applications');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const statusColors: Record<string, string> = {
        Approved: 'bg-emerald-100 text-emerald-700',
        Pending: 'bg-amber-100 text-amber-700',
        Waitlisted: 'bg-blue-100 text-blue-700',
        Rejected: 'bg-rose-100 text-rose-700',
        Withdrawn: 'bg-stone-100 text-stone-600',
        Completed: 'bg-emerald-100 text-emerald-700',
        NoShow: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">My Applications</h1><p className="text-stone-500 mt-2 text-lg">Track the status of your applications.</p></div>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : apps.length === 0 ? <Empty msg="No applications yet." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">Event</th><th className="p-5 font-bold">Shift</th><th className="p-5 font-bold">Status</th><th className="p-5 font-bold">Applied</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {apps.map(a => (
                                <tr key={a.applicationId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{a.opportunityTitle}</td>
                                    <td className="p-5 text-stone-500 font-medium">{a.shiftName}</td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[a.status] || 'bg-stone-100 text-stone-600'}`}>{a.status}</span></td>
                                    <td className="p-5 text-stone-500 text-sm">{new Date(a.appliedAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER ATTENDANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolAttendance() {
    const auth = useAuth();
    const [records, setRecords] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await attendanceService.getByVolunteer(auth.linkedGrainId);
            setRecords(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load attendance');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-700',
        CheckedIn: 'bg-blue-100 text-blue-700',
        CheckedOut: 'bg-emerald-100 text-emerald-700',
        Confirmed: 'bg-emerald-100 text-emerald-700',
        Disputed: 'bg-rose-100 text-rose-700',
        Resolved: 'bg-stone-100 text-stone-600',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">My Attendance</h1><p className="text-stone-500 mt-2 text-lg">Your attendance history.</p></div>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : records.length === 0 ? <Empty msg="No attendance records yet." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">Event</th><th className="p-5 font-bold">Status</th><th className="p-5 font-bold">Check In</th><th className="p-5 font-bold">Check Out</th><th className="p-5 font-bold">Hours</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {records.map(r => (
                                <tr key={r.attendanceId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{r.opportunityTitle}</td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[r.status] || 'bg-stone-100 text-stone-600'}`}>{r.status}</span></td>
                                    <td className="p-5 text-stone-500 text-sm">{r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '—'}</td>
                                    <td className="p-5 text-stone-500 text-sm">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '—'}</td>
                                    <td className="p-5 text-stone-800 font-bold">{r.totalHours.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER CERTIFICATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolCertificates() {
    const [certs, setCerts] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await certificateService.getTemplates();
            setCerts(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load certificates');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Certificates</h1><p className="text-stone-500 mt-2 text-lg">Available certificate templates.</p></div>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : certs.length === 0 ? <Empty msg="No certificates available." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certs.map(c => (
                        <div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:shadow-lg transition-shadow group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: c.primaryColor + '20' }}>
                                    <BadgeCheck className="w-8 h-8" style={{ color: c.primaryColor }} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">{c.name}</h3>
                                    <p className="text-sm text-stone-400">{c.organizationName || 'System Preset'}</p>
                                </div>
                            </div>
                            <p className="text-sm text-stone-500 mb-4">{c.description}</p>
                            <div className="flex justify-end">
                                <button className="flex items-center gap-1 text-orange-500 font-bold hover:underline text-sm"><ChevronRight className="w-4 h-4" /> View</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolProfile() {
    const auth = useAuth();
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const [p, s] = await Promise.all([
                volunteerService.getProfile(auth.linkedGrainId),
                skillService.getVolunteerSkills(auth.userId!),
            ]);
            setProfile(p);
            setSkills(s);
            setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, bio: p.bio });
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load profile');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId, auth.userId]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!auth.linkedGrainId) return;
        setSaving(true); setError(''); setSuccess('');
        try {
            await volunteerService.updateProfile(auth.linkedGrainId, form);
            setSuccess('Profile updated!');
        } catch (err: any) {
            setError(err.response?.data || 'Failed to save profile');
        } finally { setSaving(false); }
    };

    const handleRemoveSkill = async (skillId: string) => {
        if (!auth.userId) return;
        try {
            await skillService.removeSkill(auth.userId, skillId);
            setSkills(prev => prev.filter(s => s.id !== skillId));
        } catch (err: any) {
            setError(err.response?.data || 'Failed to remove skill');
        }
    };

    if (loading) return <Spinner />;
    if (error && !profile) return <ErrorBox msg={error} onRetry={load} />;

    const initials = `${form.firstName?.charAt(0) || ''}${form.lastName?.charAt(0) || ''}`.toUpperCase() || '?';

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Profile & Skills</h1></div>
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-xl border border-emerald-100">{success}</div>}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg">{initials}</div>
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800">{form.firstName} {form.lastName}</h2>
                        <p className="text-stone-500">{form.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-stone-600 mb-1">First Name</label><input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                    <div><label className="block text-sm font-medium text-stone-600 mb-1">Last Name</label><input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                    <div><label className="block text-sm font-medium text-stone-600 mb-1">Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                    <div><label className="block text-sm font-medium text-stone-600 mb-1">Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                </div>
                <button onClick={handleSave} disabled={saving} className="mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h3 className="text-xl font-bold text-stone-800 mb-4">Skills</h3>
                <div className="flex flex-wrap gap-3">
                    {skills.map(s => (
                        <span key={s.id} className="px-4 py-2 bg-orange-50 text-orange-600 font-bold rounded-full text-sm border border-orange-100 flex items-center gap-2">
                            {s.name}
                            <button onClick={() => handleRemoveSkill(s.id)} className="text-orange-300 hover:text-orange-600 transition-colors text-lg leading-none">×</button>
                        </span>
                    ))}
                    {skills.length === 0 && <span className="text-stone-400 text-sm">No skills added yet.</span>}
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER SKILLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolSkills() {
    const auth = useAuth();
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [mySkillIds, setMySkillIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        if (!auth.userId) return;
        setLoading(true); setError('');
        try {
            const [all, mine] = await Promise.all([
                skillService.getAll(),
                skillService.getVolunteerSkills(auth.userId),
            ]);
            setAllSkills(all);
            setMySkillIds(new Set(mine.map(s => s.id)));
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load skills');
        } finally { setLoading(false); }
    }, [auth.userId]);

    useEffect(() => { load(); }, [load]);

    const toggle = async (skill: Skill) => {
        if (!auth.userId) return;
        try {
            if (mySkillIds.has(skill.id)) {
                await skillService.removeSkill(auth.userId, skill.id);
                setMySkillIds(prev => { const s = new Set(prev); s.delete(skill.id); return s; });
                setToast(`Removed: ${skill.name}`);
            } else {
                await skillService.addSkill(auth.userId, skill.id);
                setMySkillIds(prev => new Set([...prev, skill.id]));
                setToast(`Added: ${skill.name}`);
            }
        } catch {
            setToast('Failed to update skill. Please try again.');
        }
        setTimeout(() => setToast(''), 2500);
    };

    // Group by category
    const byCategory = allSkills.reduce<Record<string, Skill[]>>((acc, s) => {
        (acc[s.category || 'General'] ??= []).push(s);
        return acc;
    }, {});

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-stone-800">My Skills</h1>
                <p className="text-stone-500 mt-2 text-lg">Click to add or remove skills from your profile.</p>
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50 transition-all">
                    {toast}
                </div>
            )}

            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : (
                <div className="space-y-6">
                    {Object.entries(byCategory).map(([category, skills]) => (
                        <div key={category} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-4">{category}</h3>
                            <div className="flex flex-wrap gap-3">
                                {skills.map(skill => {
                                    const selected = mySkillIds.has(skill.id);
                                    return (
                                        <button
                                            key={skill.id}
                                            onClick={() => toggle(skill)}
                                            title={skill.description}
                                            className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                                                selected
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/30'
                                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300 hover:text-orange-600'
                                            }`}
                                        >
                                            {selected && <span className="mr-1">✓</span>}
                                            {skill.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {Object.keys(byCategory).length === 0 && <Empty msg="No skills available. Ask your admin to add some." />}
                </div>
            )}
        </div>
    );
}

