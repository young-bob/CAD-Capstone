import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Sun, Heart, Clock, CheckCircle2, Award, Calendar, User, MapPin, Search, Download, BadgeCheck, Camera, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import type { ViewName, OpportunitySummary, ApplicationSummary, AttendanceSummary, VolunteerProfile, Skill, CertificateTemplate, OpportunityState, Shift } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { volunteerService } from '../../services/volunteers';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { attendanceService } from '../../services/attendance';
import { skillService } from '../../services/skills';
import { certificateService } from '../../services/certificates';
import { MiniCalendar } from '../../components/MiniCalendar';
const MapView = lazy(() => import('../../components/MapView'));

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
function getErr(err: any, fallback: string): string { const d = err?.response?.data; if (!d) return fallback; if (typeof d === 'string') return d || fallback; return String(d.error || d.message || d.title || fallback); }

// ─── GPS Check-In Button ──────────────────────────────────────
function GpsCheckInButton({ attendanceId, opportunityId, shiftStartTime, onDone }: {
    attendanceId: string; opportunityId: string; shiftStartTime?: string | null; onDone: () => void
}) {
    const [loading, setLoading] = useState(false);
    const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [errMsg, setErrMsg] = useState('');

    // Compute check-in availability (30 min before shift start)
    const checkInOpenTime = shiftStartTime
        ? new Date(new Date(shiftStartTime).getTime() - 30 * 60 * 1000)
        : null;
    const isTooEarly = checkInOpenTime ? new Date() < checkInOpenTime : false;

    const formatTime = (d: Date) => d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const extractErrMsg = (e: any): string => {
        const data = e?.response?.data;
        if (typeof data === 'string') return data;
        if (data?.detail) return data.detail;
        if (data?.title) return data.title;
        return 'Check-in failed. Please try again.';
    };

    const locate = () => {
        if (!navigator.geolocation) { doFallback(); return; }
        setGpsState('locating');
        navigator.geolocation.getCurrentPosition(
            (pos) => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setGpsState('ready'); },
            () => { setErrMsg('Location access denied – submitting without GPS.'); setGpsState('error'); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    };

    const doFallback = async () => {
        setLoading(true);
        try { await attendanceService.webCheckIn(attendanceId); onDone(); }
        catch (e: any) { setErrMsg(extractErrMsg(e)); setGpsState('error'); }
        finally { setLoading(false); }
    };

    const doCheckIn = async () => {
        if (!coords) { doFallback(); return; }
        setLoading(true);
        try {
            await attendanceService.checkIn(attendanceId, { lat: coords.lat, lon: coords.lon, proofPhotoUrl: '' });
            onDone();
        } catch (e: any) { setErrMsg(extractErrMsg(e)); setGpsState('error'); }
        finally { setLoading(false); }
    };

    // Too early — show disabled button with available time
    if (isTooEarly) return (
        <div className="mt-2 space-y-1">
            <button disabled className="text-xs font-bold text-stone-400 bg-stone-100 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-1">
                🕐 Check-In Not Yet Available
            </button>
            <p className="text-xs text-stone-400">
                Available from <span className="font-semibold text-stone-600">{formatTime(checkInOpenTime!)}</span>
            </p>
        </div>
    );

    if (gpsState === 'idle') return (
        <button onClick={locate} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 mt-2 flex items-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '📍'} Check In Now
        </button>
    );

    if (gpsState === 'locating') return (
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Getting your location…
        </div>
    );

    if (gpsState === 'error') return (
        <div className="mt-2 space-y-2">
            <p className="text-xs text-rose-500 font-medium">⚠️ {errMsg}</p>
            <button onClick={() => { setGpsState('idle'); setErrMsg(''); }} className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-200">
                Try Again
            </button>
        </div>
    );

    // gpsState === 'ready' — show map preview
    return (
        <div className="mt-3 space-y-3">
            <p className="text-xs font-bold text-stone-600">📍 Your location detected. Confirm check-in:</p>
            <Suspense fallback={<div className="h-48 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 text-xs">Loading map…</div>}>
                {coords && <MapView lat={coords.lat} lon={coords.lon} radius={50} height={200} />}
            </Suspense>
            {errMsg && <p className="text-xs text-rose-500">⚠️ {errMsg}</p>}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setGpsState('idle')} className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-200">Cancel</button>
                <button onClick={locate} disabled={loading} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />} Get Current Location
                </button>
                <button onClick={doCheckIn} disabled={loading} className="text-xs font-bold text-white bg-blue-500 px-4 py-1.5 rounded-lg hover:bg-blue-600 flex items-center gap-1">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '✅'} Confirm Check-In
                </button>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface DashboardProps { onNavigate: (view: ViewName) => void; }

export function VolDashboard({ onNavigate }: DashboardProps) {
    const auth = useAuth();
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const [p, a] = await Promise.all([
                volunteerService.getProfile(auth.linkedGrainId),
                applicationService.getForVolunteer(auth.linkedGrainId)
            ]);
            setProfile(p);
            setApps(a);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load profile'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;

    const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || auth.email : auth.email;
    const approvedShiftDates = apps.filter(a => a.status === 'Approved' && a.shiftStartTime).map(a => new Date(a.shiftStartTime));

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Welcome & Stats */}
                <div className="flex-1 space-y-8">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-extrabold mb-3 flex items-center gap-3">Welcome, {name}! <Sun className="w-8 h-8 text-yellow-200" /></h1>
                            <p className="text-orange-50 text-lg max-w-xl font-medium">Ready to start today's volunteer service? Check your upcoming events.</p>
                            <button onClick={() => onNavigate('attendance')} className="mt-8 bg-white text-orange-600 px-8 py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Check-in</button>
                        </div>
                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                        <Heart className="absolute -right-4 -bottom-4 w-56 h-56 text-white opacity-10" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Hours', val: profile?.totalHours ? profile.totalHours.toFixed(1) : '0', unit: 'hrs', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                            { label: 'Completed', val: String(profile?.completedOpportunities ?? 0), unit: 'events', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { label: 'Credentials', val: String(profile?.credentials?.length ?? 0), unit: 'docs', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
                                <div className={`${s.bg} p-4 rounded-full ${s.color} mb-3 group-hover:bg-${s.color.split('-')[1]}-500 group-hover:text-white transition-colors`}><s.icon className="w-8 h-8" /></div>
                                <div>
                                    <h3 className="text-2xl font-extrabold text-stone-800">{s.val} <span className="text-sm font-medium text-stone-400">{s.unit}</span></h3>
                                    <p className="text-xs font-semibold text-stone-400 tracking-wide uppercase mt-1">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Calendar */}
                <div className="w-full lg:w-80 shrink-0">
                    <MiniCalendar eventDates={approvedShiftDates} />
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 mt-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="bg-rose-100 p-3 rounded-2xl text-rose-500"><Heart className="w-6 h-6 fill-current" /></div>
                            <div>
                                <h3 className="font-extrabold text-stone-800 mb-1">Impact Goal</h3>
                                <p className="text-sm font-medium text-stone-500 leading-relaxed">You've completed {profile?.completedOpportunities ?? 0} events. Just {(5 - ((profile?.completedOpportunities ?? 0) % 5)) || 5} more to reach your next milestone!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER OPPORTUNITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface VolOpportunitiesProps { onViewDetail?: (id: string) => void; }
export function VolOpportunities({ onViewDetail }: VolOpportunitiesProps = {}) {
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
            setError(getErr(err, 'Failed to load opportunities'));
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
                            <button
                                disabled={opp.availableSpots === 0}
                                onClick={() => onViewDetail?.(opp.opportunityId)}
                                className={`w-full py-3.5 rounded-2xl font-bold transition-all ${opp.availableSpots === 0 ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'}`}>
                                {opp.availableSpots === 0 ? 'Fully Booked' : 'View Details →'}
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
    const [toast, setToast] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await applicationService.getForVolunteer(auth.linkedGrainId);
            setApps(data);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load applications'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const handleWithdraw = async (app: ApplicationSummary) => {
        if (!window.confirm(`Withdraw application for "${app.opportunityTitle}"?`)) return;
        setActionId(app.applicationId);
        try {
            await opportunityService.withdrawApplication(app.opportunityId, app.applicationId);
            showToast('Application withdrawn');
            load();
        } catch (err: any) {
            showToast(err.response?.data?.toString() || 'Failed to withdraw');
        } finally { setActionId(null); }
    };

    const handleAccept = async (app: ApplicationSummary) => {
        setActionId(app.applicationId);
        try {
            await applicationService.accept(app.applicationId);
            showToast('Invitation accepted! 🎉');
            load();
        } catch (err: any) {
            showToast(err.response?.data?.toString() || 'Failed to accept');
        } finally { setActionId(null); }
    };

    const statusColors: Record<string, string> = {
        Approved: 'bg-emerald-100 text-emerald-700',
        Pending: 'bg-amber-100 text-amber-700',
        Waitlisted: 'bg-blue-100 text-blue-700',
        Promoted: 'bg-violet-100 text-violet-700',
        Rejected: 'bg-rose-100 text-rose-700',
        Withdrawn: 'bg-stone-100 text-stone-600',
        Completed: 'bg-emerald-100 text-emerald-700',
        NoShow: 'bg-rose-100 text-rose-700',
    };

    const canWithdraw = (status: string) => ['Pending', 'Waitlisted', 'Approved', 'Promoted'].includes(status);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">My Applications</h1><p className="text-stone-500 mt-2 text-lg">Track the status of your applications.</p></div>
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : apps.length === 0 ? <Empty msg="No applications yet." /> : (
                <div className="space-y-4">
                    {apps.map(a => (
                        <div key={a.applicationId} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-stone-800 truncate">{a.opportunityTitle}</p>
                                <p className="text-sm text-stone-500 mt-0.5">{a.shiftName} · {a.shiftStartTime ? new Date(a.shiftStartTime).toLocaleDateString() : ''}</p>
                                <p className="text-xs text-stone-400 mt-1">Applied: {new Date(a.appliedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[a.status] || 'bg-stone-100 text-stone-600'}`}>{a.status}</span>
                                {a.status === 'Promoted' && (
                                    <button onClick={() => handleAccept(a)} disabled={actionId === a.applicationId}
                                        className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
                                        {actionId === a.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Accept Invitation
                                    </button>
                                )}
                                {canWithdraw(a.status) && (
                                    <button onClick={() => handleWithdraw(a)} disabled={actionId === a.applicationId}
                                        className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-100 disabled:opacity-50 flex items-center gap-1">
                                        {actionId === a.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Withdraw
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER ATTENDANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DISPUTABLE = ['NoShow', 'CheckedOut', 'Confirmed'];
export function VolAttendance() {
    const auth = useAuth();
    const [records, setRecords] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    // Dispute modal
    const [disputeId, setDisputeId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeEvidence, setDisputeEvidence] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await attendanceService.getByVolunteer(auth.linkedGrainId);
            setRecords(data);
        } catch (err: any) { setError(getErr(err, 'Failed to load attendance')); }
        finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const openDispute = (id: string) => { setDisputeId(id); setDisputeReason(''); setDisputeEvidence(''); };

    const handleSubmitDispute = async () => {
        if (!disputeId || !disputeReason.trim()) return;
        setSubmitting(true);
        try {
            await attendanceService.dispute(disputeId, { reason: disputeReason, evidenceUrl: disputeEvidence });
            setDisputeId(null); showToast('Dispute submitted for review ✅'); load();
        } catch (err: any) { showToast(err.response?.data?.toString() || 'Failed to submit dispute'); }
        finally { setSubmitting(false); }
    };

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-700', CheckedIn: 'bg-blue-100 text-blue-700',
        CheckedOut: 'bg-emerald-100 text-emerald-700', Confirmed: 'bg-emerald-100 text-emerald-700',
        Disputed: 'bg-rose-100 text-rose-700', Resolved: 'bg-stone-100 text-stone-600', NoShow: 'bg-rose-100 text-rose-700',
    };

    const totalHours = records.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <div><h1 className="text-3xl font-extrabold text-stone-800">My Attendance</h1><p className="text-stone-500 mt-2 text-lg">Your volunteer hour history.</p></div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-8 text-white flex items-center gap-6 shadow-lg shadow-orange-500/20">
                <Clock className="w-12 h-12 opacity-80" />
                <div><p className="text-4xl font-extrabold">{totalHours.toFixed(1)} hrs</p><p className="text-orange-100 font-medium mt-1">{records.length} session{records.length !== 1 ? 's' : ''}</p></div>
            </div>

            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : records.length === 0 ? <Empty msg="No attendance records yet." /> : (
                <div className="space-y-4">
                    {records.map(r => (
                        <div key={r.attendanceId} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                            <div className="flex justify-between items-start mb-3">
                                <p className="font-bold text-stone-800">{r.opportunityTitle}</p>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[r.status] || 'bg-stone-100 text-stone-600'}`}>{r.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-stone-400 mb-3">
                                {r.checkInTime && <span>✅ In: {new Date(r.checkInTime).toLocaleString()}</span>}
                                {r.checkOutTime && <span>🔚 Out: {new Date(r.checkOutTime).toLocaleString()}</span>}
                                {r.totalHours > 0 && <span className="text-orange-600 font-bold">⏱ {r.totalHours.toFixed(1)} hrs</span>}
                            </div>
                            {DISPUTABLE.includes(r.status) && r.status !== 'Disputed' && (
                                <button onClick={() => openDispute(r.attendanceId)}
                                    className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 border border-amber-200 mt-2">
                                    ⚠️ Raise Dispute
                                </button>
                            )}
                            {r.status === 'Pending' && (
                                <GpsCheckInButton attendanceId={r.attendanceId} opportunityId={r.opportunityId} shiftStartTime={r.shiftStartTime} onDone={() => { showToast('Checked in ✅'); load(); }} />
                            )}
                            {r.status === 'CheckedIn' && (
                                <button onClick={async () => {
                                    try {
                                        await attendanceService.checkOut(r.attendanceId);
                                        showToast('Checked out successfully 🔚');
                                        load();
                                    } catch (err: any) { showToast(err.response?.data?.toString() || 'Failed to check out'); }
                                }} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 mt-2">
                                    🔚 Check Out
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Dispute Modal */}
            {disputeId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-4">
                        <h3 className="text-xl font-bold text-stone-800">Raise Dispute</h3>
                        <p className="text-stone-500 text-sm">If your attendance record is incorrect (wrong hours, or marked No-Show incorrectly), describe the issue below.</p>
                        <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="What's wrong? *" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-amber-400 outline-none resize-none" />
                        <input value={disputeEvidence} onChange={e => setDisputeEvidence(e.target.value)} placeholder="Evidence URL (optional)" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-amber-400 outline-none" />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDisputeId(null)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSubmitDispute} disabled={!disputeReason.trim() || submitting}
                                className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Dispute
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER CERTIFICATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function VolCertificates() {
    const auth = useAuth();
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    // Generate modal
    const [showGenerate, setShowGenerate] = useState(false);
    const [selTemplate, setSelTemplate] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { const data = await certificateService.getTemplates(); setTemplates(data); }
        catch (err: any) { setError(getErr(err, 'Failed to load certificates')); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const openGenerate = (templateId: string) => { setSelTemplate(templateId); setShowGenerate(true); };

    const handleGenerate = async () => {
        if (!auth.linkedGrainId || !selTemplate) return;
        setGenerating(true);
        try {
            const result = await certificateService.generate(auth.linkedGrainId, selTemplate);
            setShowGenerate(false);
            showToast(`Certificate ready: ${result.fileName}`);
            window.open(result.downloadUrl, '_blank');
        } catch (err: any) { showToast(err.response?.data?.toString() || 'Failed to generate certificate'); }
        finally { setGenerating(false); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <div><h1 className="text-3xl font-extrabold text-stone-800">Certificates</h1><p className="text-stone-500 mt-2 text-lg">Generate your volunteer participation certificates.</p></div>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : templates.length === 0
                ? <Empty msg="No certificate templates available yet." />
                : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(c => (
                            <div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:shadow-lg transition-shadow flex flex-col">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl" style={{ backgroundColor: c.primaryColor + '20' }}>
                                        <BadgeCheck className="w-8 h-8" style={{ color: c.primaryColor }} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800">{c.name}</h3>
                                        <p className="text-sm text-stone-400">{c.organizationName || 'System Preset'}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-stone-500 mb-5 flex-1">{c.description}</p>
                                <button onClick={() => openGenerate(c.id)}
                                    className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20">
                                    <Download className="w-4 h-4" /> Generate Certificate
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            {/* Confirm Generate Modal */}
            {showGenerate && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-4 text-center">
                        <div className="text-5xl">🏅</div>
                        <h3 className="text-xl font-bold text-stone-800">Generate Certificate</h3>
                        <p className="text-stone-500 text-sm">A PDF certificate will be generated for your volunteer work and opened for download.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowGenerate(false)} className="px-5 py-2.5 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleGenerate} disabled={generating}
                                className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                                {generating && <Loader2 className="w-4 h-4 animate-spin" />} Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface VolProfileProps { onNavigate?: (view: ViewName) => void; }

export function VolProfile({ onNavigate }: VolProfileProps) {
    const auth = useAuth();
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });
    const [showAddSkill, setShowAddSkill] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const [p, s, all] = await Promise.all([
                volunteerService.getProfile(auth.linkedGrainId),
                skillService.getVolunteerSkills(auth.userId!),
                skillService.getAll(),
            ]);
            setProfile(p);
            setSkills(s || []);
            setAllSkills(all || []);
            setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, bio: p.bio });
        } catch (err: any) {
            setError(getErr(err, 'Failed to load profile'));
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
            setError(getErr(err, 'Failed to save profile'));
        } finally { setSaving(false); }
    };

    // Upload Credential
    const [credUrl, setCredUrl] = useState('');
    const [uploadingCred, setUploadingCred] = useState(false);
    const handleUploadCredential = async () => {
        if (!auth.linkedGrainId || !credUrl.trim()) return;
        setUploadingCred(true);
        try {
            await volunteerService.uploadCredential(auth.linkedGrainId, credUrl.trim());
            setCredUrl(''); setSuccess('Credential uploaded! ✅');
        } catch (err: any) { setError(getErr(err, 'Failed to upload credential')); }
        finally { setUploadingCred(false); }
    };

    const handleRemoveSkill = async (skillId: string) => {
        if (!auth.userId) return;
        try {
            await skillService.removeSkill(auth.userId, skillId);
            setSkills(prev => prev.filter(s => s.id !== skillId));
            showToast('Skill removed');
        } catch (err: any) {
            setError(getErr(err, 'Failed to remove skill'));
        }
    };

    const handleAddSkill = async (skill: Skill) => {
        if (!auth.userId) return;
        try {
            await skillService.addSkill(auth.userId, skill.id);
            setSkills(prev => [...prev, skill]);
            showToast(`Added: ${skill.name}`);
        } catch (err: any) {
            showToast(getErr(err, 'Failed to add skill'));
        }
    };

    if (loading) return <Spinner />;
    if (error && !profile) return <ErrorBox msg={error} onRetry={load} />;

    const mySkillIds = new Set(skills.map(s => s.id));
    const availableToAdd = allSkills.filter(s => !mySkillIds.has(s.id));

    const initials = `${form.firstName?.charAt(0) || ''}${form.lastName?.charAt(0) || ''}`.toUpperCase() || '?';

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
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
            {/* Skills section with add */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-stone-800">My Skills</h3>
                    <button
                        onClick={() => setShowAddSkill(v => !v)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 font-bold rounded-full text-sm border border-orange-100 hover:bg-orange-100 transition-colors"
                    >
                        + Add Skill
                    </button>
                </div>
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
            {/* Upload Credential */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h3 className="text-xl font-bold text-stone-800 mb-2">Credentials</h3>
                <p className="text-stone-500 text-sm mb-4">Paste the URL of a credential document (e.g. first-aid certificate, background check) hosted in cloud storage.</p>
                <div className="flex gap-3">
                    <input value={credUrl} onChange={e => setCredUrl(e.target.value)} placeholder="https://..." className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                    <button onClick={handleUploadCredential} disabled={!credUrl.trim() || uploadingCred}
                        className="px-5 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2 text-sm">
                        {uploadingCred ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Submit
                    </button>
                </div>
                {profile?.credentials && profile.credentials.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Uploaded ({profile.credentials.length})</p>
                        {profile.credentials.map((key: string, i: number) => (
                            <a key={i} href={key} target="_blank" rel="noopener noreferrer" className="block text-sm text-orange-600 hover:underline truncate">{key}</a>
                        ))}
                    </div>
                )}
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
            setError(getErr(err, 'Failed to load skills'));
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
                                            className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${selected
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOLUNTEER OPPORTUNITY DETAIL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VolOppDetailProps { oppId: string; onBack: () => void; }
export function VolOpportunityDetail({ oppId, onBack }: VolOppDetailProps) {
    const auth = useAuth();
    const [opp, setOpp] = useState<OpportunityState | null>(null);
    const [myApps, setMyApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [applying, setApplying] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [oppData, appData] = await Promise.all([
                opportunityService.getById(oppId),
                auth.linkedGrainId ? applicationService.getForVolunteer(auth.linkedGrainId) : Promise.resolve([]),
            ]);
            setOpp(oppData);
            setMyApps((appData as ApplicationSummary[]).filter((a: ApplicationSummary) => a.opportunityId === oppId));
        } catch (err: any) {
            setError(getErr(err, 'Failed to load opportunity'));
        } finally { setLoading(false); }
    }, [oppId, auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const handleApply = async (shift: Shift) => {
        if (!auth.linkedGrainId) return;
        setApplying(shift.shiftId);
        try {
            // Deterministic key: same volunteer + shift always produces the same key
            // This lets the backend reject true duplicates even across separate clicks
            const key = `${auth.linkedGrainId}-${shift.shiftId}`;
            await opportunityService.apply(oppId, {
                volunteerId: auth.linkedGrainId,
                shiftId: shift.shiftId,
                idempotencyKey: key,
            });
            showToast(`Applied to "${shift.name}" ✅`);
            // Immediately mark shift as applied so button is disabled before load() completes
            setMyApps(prev => [...prev, { shiftId: shift.shiftId, opportunityId: oppId, status: 'Pending' } as ApplicationSummary]);
            load();
        } catch (err: any) {
            showToast(err.response?.data?.toString() || 'Failed to apply');
        } finally { setApplying(null); }
    };

    const appliedShiftIds = new Set(myApps.map((a: ApplicationSummary) => a.shiftId));


    const statusColors: Record<string, string> = {
        Published: 'bg-emerald-100 text-emerald-700',
        Draft: 'bg-stone-100 text-stone-500',
        InProgress: 'bg-blue-100 text-blue-700',
        Completed: 'bg-emerald-100 text-emerald-700',
        Cancelled: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-orange-600 font-bold transition-colors">
                ← Back to Opportunities
            </button>
            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : opp && (
                <>
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{opp.info.category}</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[opp.status] || 'bg-stone-100 text-stone-500'}`}>{opp.status}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-stone-800 mb-3">{opp.info.title}</h1>
                        <p className="text-stone-500 text-lg leading-relaxed mb-6">{opp.info.description}</p>
                        <div className="flex flex-wrap gap-6 text-sm font-medium text-stone-500">
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" />{opp.shifts.length} shift{opp.shifts.length !== 1 ? 's' : ''}</span>
                            <span className="flex items-center gap-2"><User className="w-4 h-4 text-orange-500" />{opp.confirmedVolunteerIds.length} confirmed</span>
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" />{opp.waitlistQueue.length} on waitlist</span>
                        </div>
                        {opp.info.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {opp.info.tags.map((tag: string) => <span key={tag} className="text-xs font-bold bg-stone-100 text-stone-500 px-3 py-1 rounded-full">{tag}</span>)}
                            </div>
                        )}
                    </div>

                    {myApps.length > 0 && (
                        <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
                            <p className="font-bold text-orange-700 mb-2">Your Applications</p>
                            {myApps.map((a: ApplicationSummary) => (
                                <div key={a.applicationId} className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-stone-700 font-medium">{a.shiftName}</span>
                                    <span className="text-xs font-bold bg-white text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">{a.status}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-stone-800">Available Shifts</h2>
                        {opp.shifts.length === 0 ? <Empty msg="No shifts added yet." /> : opp.shifts.map((shift: Shift) => {
                            const isApplied = appliedShiftIds.has(shift.shiftId);
                            const isFull = shift.currentCount >= shift.maxCapacity;
                            return (
                                <div key={shift.shiftId} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-stone-800 text-lg">{shift.name}</p>
                                        <p className="text-sm text-stone-500 mt-1">📅 {new Date(shift.startTime).toLocaleString()} — {new Date(shift.endTime).toLocaleString()}</p>
                                        <p className="text-sm text-stone-400 mt-0.5">👥 {shift.currentCount} / {shift.maxCapacity} volunteers</p>
                                    </div>
                                    <div className="shrink-0">
                                        {isApplied
                                            ? <span className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm border border-emerald-200">✓ Applied</span>
                                            : isFull
                                                ? <span className="px-5 py-2.5 bg-stone-100 text-stone-400 font-bold rounded-xl text-sm">Full</span>
                                                : <button onClick={() => handleApply(shift)} disabled={applying === shift.shiftId}
                                                    className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600 shadow-sm disabled:bg-orange-300 flex items-center gap-2">
                                                    {applying === shift.shiftId && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Apply for this Shift
                                                </button>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
