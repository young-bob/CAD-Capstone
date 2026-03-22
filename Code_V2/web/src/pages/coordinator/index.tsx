import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Briefcase, Clock, Award, Users, Plus, Loader2, AlertCircle, ChevronLeft, Star, X, CheckCircle2, XCircle, Pencil, Trash2, ExternalLink, Download, CalendarDays, Bell, ShieldCheck, Square, CheckSquare, BookOpen, Bookmark, Heart, Globe, Mail, Tag, Megaphone, Sparkles, Copy, RefreshCw } from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';
import OrgHealthCard from '../../components/OrgHealthCard';
import EventKanbanPreview from '../../components/EventKanbanPreview';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonDashboard } from '../../components/Skeleton';
import type { ViewName, OpportunitySummary, ApplicationSummary, AttendanceSummary, CertificateTemplate, EventTemplate, OrgState, OpportunityState, Shift, Skill, VolunteerProfile, OrgVolunteerSummary } from '../../types';
import { OrgRole, ApplicationStatus, OpportunityStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { organizationService } from '../../services/organizations';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { certificateService } from '../../services/certificates';
import { skillService } from '../../services/skills';
import { attendanceService } from '../../services/attendance';
import { volunteerService } from '../../services/volunteers';
import { MiniCalendar } from '../../components/MiniCalendar';
import EventCalendar from '../../components/EventCalendar';
import ActivityFeed, { type ActivityItem } from '../../components/ActivityFeed';
import { useCountUp } from '../../hooks/useCountUp';
import { useDarkMode } from '../../hooks/useTheme';
import { useInfiniteList } from '../../hooks/useInfiniteList';
const MapPicker = lazy(() => import('../../components/MapPicker'));

function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }
function StatNum({ value, decimals = 0 }: { value: number; decimals?: number }) {
    const animated = useCountUp(value);
    return <>{decimals > 0 ? animated.toFixed(decimals) : String(animated)}</>;
}

function useOrgStatus(): string | null {
    const auth = useAuth();
    const [status, setStatus] = useState<string | null>(null);
    useEffect(() => {
        if (!auth.linkedGrainId) return;
        organizationService.getById(auth.linkedGrainId).then(o => setStatus(o.status)).catch(() => {});
    }, [auth.linkedGrainId]);
    return status;
}

function OrgPendingBanner() {
    const auth = useAuth();
    const status = useOrgStatus();
    // Show when: no org at all, OR org exists but status is known and not Approved
    const shouldShow = !auth.linkedGrainId || (status !== null && status !== 'Approved');
    if (!shouldShow) return null;
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-amber-500 text-xl">🔒</span>
            <p className="text-amber-700 text-sm font-medium">Creating events, inviting members, and other actions require admin approval first.</p>
        </div>
    );
}
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" /><p className="text-rose-700 font-medium">{msg}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}</div>);
}
function Empty({ msg }: { msg: string }) { return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>; }
function getErr(err: any, fallback: string): string { const d = err?.response?.data; if (!d) return fallback; if (typeof d === 'string') return d || fallback; return String(d.detail || d.error || d.message || d.title || fallback); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CoordDashboardProps { onNavigate: (view: ViewName) => void; }
export function CoordDashboard({ onNavigate }: CoordDashboardProps) {
    const dark = useDarkMode();
    const auth = useAuth();
    const [org, setOrg] = useState<OrgState | null>(null);
    const [orgNotFound, setOrgNotFound] = useState(false);
    const [opps, setOpps] = useState<OpportunitySummary[]>([]);
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');

    // Create org form
    const [showCreate, setShowCreate] = useState(false);
    const [orgName, setOrgName] = useState('');
    const [orgDesc, setOrgDesc] = useState('');
    const [orgProofFile, setOrgProofFile] = useState<File | null>(null);
    const [orgProofUploading, setOrgProofUploading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Edit org form (approved orgs)
    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // Org Profile (website, contact, tags)
    const AVAILABLE_TAGS = ['Environment','Education','Health','Animals','Community','Arts','Seniors','Youth','Disaster Relief','Food Security'];
    const [profileWebsite, setProfileWebsite] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profileTags, setProfileTags] = useState<string[]>([]);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // Announcements
    const [announcements, setAnnouncements] = useState<{ id: string; text: string; createdAt: string }[]>([]);
    const [annText, setAnnText] = useState('');
    const [postingAnn, setPostingAnn] = useState(false);

    // Resubmit / edit application form (pending or rejected orgs)
    const [showResubmit, setShowResubmit] = useState(false);
    const [resubmitName, setResubmitName] = useState('');
    const [resubmitDesc, setResubmitDesc] = useState('');
    const [resubmitProofFile, setResubmitProofFile] = useState<File | null>(null);
    const [resubmitUploading, setResubmitUploading] = useState(false);
    const [resubmitting, setResubmitting] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) { setLoading(false); return; }
        setLoading(true);
        try {
            const o = await organizationService.getById(auth.linkedGrainId);
            setOrg(o); setOrgNotFound(false);
        } catch {
            setOrg(null); setOrgNotFound(true);
            setLoading(false);
            return;
        }
        // Fetch sub-resources separately so a Bad Request here doesn't hide the org
        try {
            const [ops, ap] = await Promise.all([
                organizationService.getOpportunities(auth.linkedGrainId),
                organizationService.getApplications(auth.linkedGrainId),
            ]);
            setOpps(ops || []); setApps(ap || []);
        } catch {
            setOpps([]); setApps([]);
        } finally { setLoading(false); }
        // Load profile + announcements (non-blocking)
        if (!profileLoaded) {
            try {
                const [orgData, anns] = await Promise.all([
                    organizationService.getById(auth.linkedGrainId),
                    organizationService.getAnnouncements(auth.linkedGrainId),
                ]);
                setProfileWebsite((orgData as any).websiteUrl ?? '');
                setProfileEmail((orgData as any).contactEmail ?? '');
                setProfileTags((orgData as any).tags ?? []);
                setAnnouncements(anns ?? []);
                setProfileLoaded(true);
            } catch { /* non-critical */ }
        }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

    const handleCreateOrg = async () => {
        if (!orgName || !auth.userId) return;
        setCreating(true);
        try {
            let proofUrl: string | undefined;
            if (orgProofFile) {
                setOrgProofUploading(true);
                try {
                    proofUrl = await organizationService.uploadProof(orgProofFile);
                } catch {
                    showToast('Proof upload failed. Submitting without proof.');
                } finally { setOrgProofUploading(false); }
            }
            const capturedName = orgName;
            const capturedDesc = orgDesc;
            const res = await organizationService.create({ name: capturedName, description: capturedDesc, creatorUserId: auth.userId, creatorEmail: auth.email || '', proofUrl });
            setShowCreate(false); setOrgName(''); setOrgDesc(''); setOrgProofFile(null);
            auth.setLinkedGrainId(res.orgId);
            showToast('Organization created! Awaiting admin approval.');
            setOrg({ name: capturedName, description: capturedDesc, status: 'PendingApproval', members: [], opportunityIds: [], blockedVolunteerIds: [], isInitialized: true, createdAt: new Date().toISOString(), proofUrl });
            setOrgNotFound(false);
        } catch (err: any) { showToast(getErr(err, 'Failed to create organization')); }
        finally { setCreating(false); }
    };

    const handleSaveOrg = async () => {
        if (!editName.trim() || !auth.linkedGrainId) return;
        setSaving(true);
        try {
            await organizationService.updateInfo(auth.linkedGrainId, { name: editName, description: editDesc });
            setShowEdit(false); showToast('Organization updated!'); refreshSoon();
        } catch (err: any) { showToast(getErr(err, 'Failed to update')); }
        finally { setSaving(false); }
    };

    const handleSaveProfile = async () => {
        if (!auth.linkedGrainId) return;
        setSavingProfile(true);
        try {
            await organizationService.updateProfile(auth.linkedGrainId, {
                websiteUrl: profileWebsite.trim() || undefined,
                contactEmail: profileEmail.trim() || undefined,
                tags: profileTags,
            });
            showToast('Profile updated!');
        } catch (err: any) { showToast(getErr(err, 'Failed to save profile')); }
        finally { setSavingProfile(false); }
    };

    const handlePostAnnouncement = async () => {
        if (!auth.linkedGrainId || !annText.trim()) return;
        setPostingAnn(true);
        try {
            await organizationService.postAnnouncement(auth.linkedGrainId, annText.trim());
            const updated = await organizationService.getAnnouncements(auth.linkedGrainId);
            setAnnouncements(updated ?? []);
            setAnnText('');
            showToast('Announcement posted!');
        } catch (err: any) { showToast(getErr(err, 'Failed to post announcement')); }
        finally { setPostingAnn(false); }
    };

    const openResubmitForm = (prefill: boolean) => {
        setResubmitName(prefill && org ? org.name : '');
        setResubmitDesc(prefill && org ? (org.description || '') : '');
        setResubmitProofFile(null);
        setShowResubmit(true);
    };

    const handleResubmit = async () => {
        if (!resubmitName || !auth.linkedGrainId) return;
        setResubmitting(true);
        try {
            let proofUrl: string | undefined = org?.proofUrl;
            if (resubmitProofFile) {
                setResubmitUploading(true);
                try {
                    proofUrl = await organizationService.uploadProof(resubmitProofFile);
                } catch {
                    showToast('Proof upload failed. Submitting without new proof.');
                } finally { setResubmitUploading(false); }
            }
            await organizationService.resubmit(auth.linkedGrainId, { name: resubmitName, description: resubmitDesc, proofUrl });
            setShowResubmit(false);
            showToast('Application resubmitted! Awaiting admin approval.');
            setOrg(prev => prev ? { ...prev, name: resubmitName, description: resubmitDesc, status: 'PendingApproval', proofUrl } : prev);
        } catch (err: any) { showToast(getErr(err, 'Failed to resubmit')); }
        finally { setResubmitting(false); }
    };

    // ── Chart data — must be before early returns (Rules of Hooks) ─────────
    const appsPerEvent = useMemo(() => {
        const counts: Record<string, { title: string; count: number }> = {};
        apps.forEach(a => {
            if (!counts[a.opportunityId]) counts[a.opportunityId] = { title: a.opportunityTitle, count: 0 };
            counts[a.opportunityId].count++;
        });
        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
            .map(e => ({
                event: e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title,
                count: e.count,
            }));
    }, [apps]);

    const statusConfig: Record<string, { color: string; bg: string; icon: string; msg: string }> = {
        PendingApproval: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '⏳', msg: 'Your organization is pending admin approval. You cannot create events until approved.' },
        Approved: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '✅', msg: 'Your organization is approved and active.' },
        Rejected: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: '❌', msg: 'Your organization registration was rejected. Contact support or re-apply.' },
        Suspended: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: '🚫', msg: 'Your organization has been suspended.' },
    };

    if (loading) return <Spinner />;

    // ─── No Org yet (includes backend-allocated empty org grain with no name) ──
    if (orgNotFound || !org || !org.name) {
        return (
            <div className="max-w-2xl mx-auto">
                {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
                {!showCreate ? (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-stone-100 text-center space-y-6">
                        <div className="text-6xl">🏢</div>
                        <h1 className="text-2xl font-extrabold text-stone-800">No Organization Found</h1>
                        <p className="text-stone-500 leading-relaxed">You don't have an organization yet. Create one to start managing events and volunteers. It will be reviewed by an administrator.</p>
                        <button onClick={() => setShowCreate(true)} className="px-8 py-3 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-sm shadow-orange-500/20">
                            Create Organization
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 space-y-5">
                        <h1 className="text-2xl font-extrabold text-stone-800">Register Your Organization</h1>
                        <div className="space-y-3">
                            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization name *" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                            <textarea value={orgDesc} onChange={e => setOrgDesc(e.target.value)} placeholder="Description (what your organization does)" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-1">Proof of Organization *</label>
                                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                                    <span className="text-sm text-stone-500">{orgProofFile ? orgProofFile.name : 'Upload document (PDF, image, etc.)'}</span>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => setOrgProofFile(e.target.files?.[0] ?? null)} />
                                </label>
                                <p className="text-xs text-stone-400 mt-1">Upload your organization's registration certificate or proof of identity.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowCreate(false); setOrgProofFile(null); }} className="px-5 py-2.5 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleCreateOrg} disabled={!orgName || creating || orgProofUploading} className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2">
                                {(creating || orgProofUploading) && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Has Org ──────────────────────────────────────────────────
    const status = statusConfig[org.status] || statusConfig['PendingApproval'];
    const isApproved = org.status === 'Approved';
    const isPrimaryCoord = org.members?.some(m => m.userId === auth.userId && m.role === OrgRole.Admin) ?? false;
    const pendingApps = apps.filter(a => a.status === 'Pending').length;
    const oppStatusCounts = [
        { key: 'Draft', label: 'Draft', count: opps.filter(o => o.status === 'Draft').length, gradient: 'from-stone-400 to-slate-500' },
        { key: 'Published', label: 'Published', count: opps.filter(o => o.status === 'Published').length, gradient: 'from-emerald-400 to-teal-500' },
        { key: 'Completed', label: 'Completed', count: opps.filter(o => o.status === 'Completed').length, gradient: 'from-blue-400 to-cyan-500' },
        { key: 'Cancelled', label: 'Cancelled', count: opps.filter(o => o.status === 'Cancelled').length, gradient: 'from-rose-400 to-pink-500' },
    ];
    const appStatusCounts = [
        { key: 'Pending', label: 'Pending', count: apps.filter(a => a.status === 'Pending').length, gradient: 'from-amber-400 to-orange-400' },
        { key: 'Approved', label: 'Approved', count: apps.filter(a => a.status === 'Approved').length, gradient: 'from-emerald-400 to-teal-500' },
        { key: 'Waitlisted', label: 'Waitlisted', count: apps.filter(a => a.status === 'Waitlisted' || a.status === 'Promoted').length, gradient: 'from-blue-400 to-cyan-500' },
        { key: 'Rejected', label: 'Rejected', count: apps.filter(a => a.status === 'Rejected').length, gradient: 'from-rose-400 to-pink-500' },
    ];
    const totalOpps = oppStatusCounts.reduce((sum, s) => sum + s.count, 0);
    const totalApps = appStatusCounts.reduce((sum, s) => sum + s.count, 0);
    const categoryCounts = Object.entries(
        opps.reduce<Record<string, number>>((acc, opp) => {
            const key = opp.category || 'Uncategorized';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const upcomingWorkload = apps
        .filter(a => a.shiftStartTime && new Date(a.shiftStartTime).getTime() >= Date.now())
        .sort((a, b) => new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime())
        .slice(0, 6);
    const formatDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (loading) return <SkeletonDashboard />;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            {/* Zone A: Org Health Card */}
            <OrgHealthCard
                orgName={org.name}
                orgStatus={org.status}
                publishedEvents={opps.filter(o => o.status === 'Published').length}
                totalApplications={apps.length}
                memberCount={org.members?.length ?? 0}
                onEdit={isApproved && isPrimaryCoord ? () => { setEditName(org.name); setEditDesc(org.description || ''); setShowEdit(true); } : undefined}
                onResubmit={org.status === 'Rejected' ? () => openResubmitForm(true) : undefined}
            />

            {/* Submission details for pending */}
            {org.status === 'PendingApproval' && (
                <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-level-1 space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Submission Details</p>
                        <button onClick={() => openResubmitForm(true)} className="text-sm text-orange-500 font-bold hover:underline flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" /> Edit Submission
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-stone-500 font-medium">Name: </span><span className="text-stone-800 font-bold">{org.name}</span></div>
                        <div><span className="text-stone-500 font-medium">Submitted: </span><span className="text-stone-700">{new Date(org.createdAt).toLocaleDateString()}</span></div>
                        {org.proofUrl && (
                            <div className="flex items-center gap-1">
                                <span className="text-stone-500 font-medium">Proof: </span>
                                <a href={org.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                                    View Document <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isApproved && (
                <>
                    {/* Zone B: KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Active Events', numVal: opps.filter(o => o.status === 'Published').length, icon: Briefcase, gradient: 'from-blue-500 to-cyan-400', target: 'manage_events' as ViewName },
                            { label: 'Pending Applications', numVal: pendingApps, icon: Users, gradient: 'from-amber-400 to-orange-500', target: 'org_applications' as ViewName },
                            { label: 'Total Applicants', numVal: apps.length, icon: Clock, gradient: 'from-emerald-500 to-teal-400', target: 'org_applications' as ViewName },
                            { label: 'Members', numVal: org.members?.length ?? 0, icon: Award, gradient: 'from-rose-500 to-pink-500', target: 'org_members' as ViewName },
                        ].map((s, i) => (
                            <button key={i} onClick={() => onNavigate(s.target)}
                                className="bg-white rounded-2xl p-5 shadow-level-1 border border-stone-100 flex flex-col items-start text-left card-interactive group animate-content-reveal"
                                style={{ animationDelay: `${i * 0.07}s` }}>
                                <div className={`bg-gradient-to-br ${s.gradient} p-3 rounded-xl text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5" /></div>
                                <div className="text-2xl font-black text-stone-800"><StatNum value={s.numVal} /></div>
                                <div className="text-xs font-medium text-stone-400 mt-0.5">{s.label}</div>
                            </button>
                        ))}
                    </div>

                    {/* Zone C: Application funnel + Kanban */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                            <h3 className="text-base font-bold text-stone-800 mb-4">Application Funnel</h3>
                            <div className="space-y-3">
                                {appStatusCounts.map(s => {
                                    const pct = totalApps === 0 ? 0 : Math.round((s.count / totalApps) * 100);
                                    return (
                                        <div key={s.key}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-semibold text-stone-700">{s.label}</span>
                                                <span className="text-xs font-bold text-stone-500">{s.count} <span className="text-stone-400 font-normal">({pct}%)</span></span>
                                            </div>
                                            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                                                <div className={`h-full bg-gradient-to-r ${s.gradient} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <EventKanbanPreview
                            opportunities={opps.map(o => ({ opportunityId: o.opportunityId, title: o.title, status: o.status }))}
                            onViewDetail={(id) => onNavigate('manage_events')}
                        />
                    </div>

                    {/* Zone D: Applications per event chart */}
                    <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                        <h3 className="text-base font-bold text-stone-800 mb-4">Applications per Event</h3>
                        {appsPerEvent.length === 0 ? (
                            <p className="text-sm text-stone-400 py-8 text-center">No application data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={appsPerEvent} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="coordAppsGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#f97316" />
                                            <stop offset="100%" stopColor="#ef4444" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#3f3f46' : '#f5f5f4'} horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: dark ? '#a1a1aa' : '#a8a29e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="event" width={100} tick={{ fontSize: 10, fill: dark ? '#a1a1aa' : '#78716c' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: dark ? '#18181b' : '#1c1917', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : '#fff7ed' }} />
                                    <Bar dataKey="count" fill="url(#coordAppsGrad)" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Upcoming workload */}
                    <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                        <h3 className="text-base font-bold text-stone-800 mb-4">Upcoming Volunteer Shifts</h3>
                        {upcomingWorkload.length === 0 ? (
                            <p className="text-sm text-stone-400">No upcoming shifts yet.</p>
                        ) : (
                            <div className="divide-y divide-stone-50">
                                {upcomingWorkload.map(app => (
                                    <div key={app.applicationId} className="py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-stone-800 text-sm">{app.opportunityTitle}</p>
                                            <p className="text-xs text-stone-400 mt-0.5">{app.shiftName} · {formatDateTime(app.shiftStartTime)} · {app.volunteerName}</p>
                                        </div>
                                        <StatusBadge status={app.status} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity Feed */}
                    <div className="xl:col-span-2">
                        <ActivityFeed title="Application Activity" items={[
                            ...apps.slice().sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()).slice(0, 20).map((a): ActivityItem => ({
                                id: `app-${a.applicationId}`,
                                type: a.status === 'Approved' ? 'approved'
                                    : a.status === 'Rejected' ? 'rejected'
                                    : a.status === 'Completed' ? 'completed'
                                    : 'applied',
                                label: a.volunteerName ?? 'Volunteer',
                                sub: `${a.opportunityTitle}${a.shiftName ? ` · ${a.shiftName}` : ''}`,
                                timestamp: a.appliedAt,
                            })),
                        ]} />
                    </div>
                </>
            )}

            {/* ── Org Profile Editor ─────────────────────────────────── */}
            {isApproved && isPrimaryCoord && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 space-y-4">
                        <h3 className="font-bold text-stone-800 dark:text-zinc-100 flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> Public Profile</h3>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">Website URL</label>
                            <input value={profileWebsite} onChange={e => setProfileWebsite(e.target.value)} placeholder="https://yourorg.com" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 dark:text-zinc-400 mb-1">Contact Email</label>
                            <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="contact@yourorg.com" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 dark:text-zinc-400 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Category Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_TAGS.map(tag => {
                                    const selected = profileTags.includes(tag);
                                    return (
                                        <button key={tag} onClick={() => setProfileTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                                            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-zinc-700 hover:border-orange-300'}`}>
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />} Save Profile
                        </button>
                    </div>

                    {/* Announcements Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 space-y-4">
                        <h3 className="font-bold text-stone-800 dark:text-zinc-100 flex items-center gap-2"><Megaphone className="w-4 h-4 text-orange-500" /> Post Announcement</h3>
                        <div>
                            <textarea value={annText} onChange={e => setAnnText(e.target.value.slice(0, 500))} placeholder="Share an update with your followers…" rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none" />
                            <p className="text-right text-xs text-stone-400 mt-1">{annText.length}/500</p>
                        </div>
                        <button onClick={handlePostAnnouncement} disabled={postingAnn || !annText.trim()} className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                            {postingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Post Update
                        </button>
                        {announcements.length > 0 && (
                            <div className="space-y-2 pt-1">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Recent</p>
                                {announcements.slice(0, 3).map(a => (
                                    <div key={a.id} className="bg-stone-50 dark:bg-zinc-800 rounded-xl p-3 text-xs text-stone-600 dark:text-zinc-300">
                                        <p className="italic">"{a.text}"</p>
                                        <p className="text-stone-400 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal (approved orgs) */}
            {showEdit && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-stone-800">Edit Organization</h3><button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-stone-400" /></button></div>
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Organization name *" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSaveOrg} disabled={!editName.trim() || saving} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resubmit Modal (pending / rejected orgs) */}
            {showResubmit && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-stone-800">
                                {org.status === 'Rejected' ? 'Resubmit Application' : 'Edit Submission'}
                            </h3>
                            <button onClick={() => setShowResubmit(false)}><X className="w-5 h-5 text-stone-400" /></button>
                        </div>
                        <input value={resubmitName} onChange={e => setResubmitName(e.target.value)} placeholder="Organization name *" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                        <textarea value={resubmitDesc} onChange={e => setResubmitDesc(e.target.value)} placeholder="Description" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">
                                Proof of Organization {org.proofUrl ? '(leave empty to keep existing)' : '*'}
                            </label>
                            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                                <span className="text-sm text-stone-500">{resubmitProofFile ? resubmitProofFile.name : 'Upload new document (PDF, image, etc.)'}</span>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => setResubmitProofFile(e.target.files?.[0] ?? null)} />
                            </label>
                            {org.proofUrl && !resubmitProofFile && (
                                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                    Current: <a href={org.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-0.5">View existing <ExternalLink className="w-3 h-3" /></a>
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowResubmit(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button
                                onClick={handleResubmit}
                                disabled={!resubmitName.trim() || resubmitting || resubmitUploading || (!org.proofUrl && !resubmitProofFile)}
                                className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2"
                            >
                                {(resubmitting || resubmitUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                                {org.status === 'Rejected' ? 'Resubmit' : 'Save & Resubmit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI SOCIAL POST MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SocialPostModalProps { opp: OpportunitySummary; orgName: string; onClose: () => void; }
function SocialPostModal({ opp, orgName, onClose }: SocialPostModalProps) {
    const [twitter, setTwitter] = useState('');
    const [instagram, setInstagram] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<'tw'|'ig'|null>(null);

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

    const fallback = () => {
        const tag = opp.category ? `#${opp.category.replace(/\s+/g,'')}` : '#volunteer';
        setTwitter(`Join us at ${orgName}! We need volunteers for "${opp.title}". Sign up today! ${tag} #volunteering`);
        setInstagram(`🌟 ${orgName} is looking for passionate volunteers for our "${opp.title}" opportunity!\n\n${opp.title ? `This is a great chance to make a difference in your community.` : 'Be the change you want to see!'}\n\nVisit our profile to apply and be part of something meaningful. 💪\n\n${tag} #volunteering #community #giveback #makeadifference`);
    };

    const generate = async () => {
        if (!apiKey) { fallback(); return; }
        setLoading(true);
        try {
            const prompt = `Org: ${orgName}\nEvent: ${opp.title}\nCategory: ${opp.category || 'General'}\nDescription: ${('description' in opp ? (opp as any).description : '') || opp.title}`;
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 600,
                    stream: false,
                    system: `You are a social media copywriter for nonprofits. Given a volunteer opportunity, generate:
1. Twitter/X version: ≤280 chars with 2–3 hashtags
2. Instagram/LinkedIn version: 3–4 engaging sentences + call to action + 4–5 hashtags
Be enthusiastic, authentic, and volunteer-focused. Return plain text with "TWITTER:" and "INSTAGRAM:" labels on separate lines.`,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            const data = await res.json();
            const text: string = data?.content?.[0]?.text ?? '';
            const twMatch = text.match(/TWITTER:\s*([\s\S]*?)(?=INSTAGRAM:|$)/i);
            const igMatch = text.match(/INSTAGRAM:\s*([\s\S]*)/i);
            setTwitter(twMatch ? twMatch[1].trim() : text.slice(0, 280));
            setInstagram(igMatch ? igMatch[1].trim() : text);
        } catch { fallback(); }
        finally { setLoading(false); }
    };

    const copyTo = async (text: string, key: 'tw'|'ig') => {
        await navigator.clipboard.writeText(text);
        setCopied(key); setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-stone-800 dark:text-zinc-100 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> Generate Social Post</h3>
                        <p className="text-xs text-stone-400 mt-0.5">"{opp.title}"</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
                </div>
                {!twitter && !instagram ? (
                    <button onClick={generate} disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {loading ? 'Generating…' : 'Generate with AI'}
                    </button>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Twitter / X</p>
                                    <button onClick={() => copyTo(twitter, 'tw')} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1">
                                        {copied === 'tw' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        {copied === 'tw' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <textarea value={twitter} onChange={e => setTwitter(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 dark:text-zinc-100 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-400" />
                                <p className="text-right text-xs text-stone-400 mt-0.5">{twitter.length}/280</p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Instagram / LinkedIn</p>
                                    <button onClick={() => copyTo(instagram, 'ig')} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1">
                                        {copied === 'ig' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        {copied === 'ig' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <textarea value={instagram} onChange={e => setInstagram(e.target.value)} rows={5} className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 dark:text-zinc-100 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-400" />
                            </div>
                        </div>
                        <button onClick={() => { setTwitter(''); setInstagram(''); generate(); }} disabled={loading} className="text-xs text-purple-500 hover:text-purple-700 font-bold flex items-center gap-1 disabled:opacity-50">
                            <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANAGE EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CoordManageEventsProps { onViewDetail?: (id: string) => void; }
export function CoordManageEvents({ onViewDetail }: CoordManageEventsProps) {
    const auth = useAuth();
    const orgStatus = useOrgStatus();
    const isOrgApproved = !!auth.linkedGrainId && orgStatus === 'Approved';
    const [opps, setOpps] = useState<OpportunitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const DRAFT_KEY = `vsms_draft_event_${auth.linkedGrainId ?? ''}`;
    const DEFAULT_FORM = { title: '', description: '', category: '', lat: 43.6532, lon: -79.3832, radius: 200 };
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(DEFAULT_FORM);
    const [draftRestored, setDraftRestored] = useState(false);
    const [creating, setCreating] = useState(false);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [recoveringId, setRecoveringId] = useState<string | null>(null);
    const [calendarView, setCalendarView] = useState(false);
    const [templates, setTemplates] = useState<EventTemplate[]>([]);
    const [showTemplatePanel, setShowTemplatePanel] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
    const [socialPostOpp, setSocialPostOpp] = useState<OpportunitySummary | null>(null);
    const [orgName, setOrgName] = useState('');

    // Restore draft on mount
    useEffect(() => {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.title || parsed.description || parsed.category) {
                    setCreateForm(parsed);
                    setDraftRestored(true);
                }
            } catch { /* ignore */ }
        }
    }, [DRAFT_KEY]);

    // Auto-save draft every 2s when form is open
    useEffect(() => {
        if (!showCreate) return;
        const t = setTimeout(() => {
            const isEmpty = !createForm.title && !createForm.description && !createForm.category;
            if (!isEmpty) localStorage.setItem(DRAFT_KEY, JSON.stringify(createForm));
        }, 2000);
        return () => clearTimeout(t);
    }, [createForm, showCreate, DRAFT_KEY]);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) { setLoading(false); return; }
        setLoading(true); setError('');
        try {
            const data = await organizationService.getOpportunities(auth.linkedGrainId);
            setOpps(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load events'));
        } finally { setLoading(false); }
        // Fetch org name for Social Post modal
        if (!orgName) {
            organizationService.getById(auth.linkedGrainId).then(o => setOrgName(o.name)).catch(() => {});
        }
    }, [auth.linkedGrainId, orgName]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

    // Load templates when create form opens
    useEffect(() => {
        if (showCreate && auth.linkedGrainId) {
            organizationService.getEventTemplates(auth.linkedGrainId).then(setTemplates).catch(() => {});
        }
    }, [showCreate, auth.linkedGrainId]);

    const applyTemplate = (t: EventTemplate) => {
        setCreateForm(p => ({
            ...p,
            title: t.title || p.title,
            description: t.description || p.description,
            category: t.category || p.category,
            lat: t.latitude ?? p.lat,
            lon: t.longitude ?? p.lon,
            radius: t.radiusMeters ?? p.radius,
        }));
        setShowTemplatePanel(false);
        setDraftRestored(false);
    };

    const handleSaveTemplate = async () => {
        if (!auth.linkedGrainId || !templateName.trim()) return;
        setSavingTemplate(true);
        try {
            await organizationService.saveEventTemplate(auth.linkedGrainId, {
                name: templateName.trim(),
                title: createForm.title,
                description: createForm.description,
                category: createForm.category,
                tags: [], approvalPolicy: 'ManualApprove', requiredSkillIds: [],
                latitude: createForm.lat, longitude: createForm.lon, radiusMeters: createForm.radius,
            });
            const updated = await organizationService.getEventTemplates(auth.linkedGrainId);
            setTemplates(updated);
            setShowSaveTemplate(false);
            setTemplateName('');
        } catch { /* ignore */ }
        finally { setSavingTemplate(false); }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!auth.linkedGrainId) return;
        setDeletingTemplateId(templateId);
        try {
            await organizationService.deleteEventTemplate(auth.linkedGrainId, templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch { /* ignore */ }
        finally { setDeletingTemplateId(null); }
    };

    const handleCreate = async () => {
        if (!auth.linkedGrainId || !createForm.title) { setError('Title is required.'); return; }
        setCreating(true); setError('');
        try {
            const res = await organizationService.createOpportunity(auth.linkedGrainId, {
                title: createForm.title,
                description: createForm.description,
                category: createForm.category
            });
            
            // Set geofence immediately after creation
            await opportunityService.setGeoFence(res.opportunityId, {
                lat: createForm.lat,
                lon: createForm.lon,
                radiusMeters: createForm.radius
            });

            setShowCreate(false);
            setCreateForm(DEFAULT_FORM);
            setDraftRestored(false);
            localStorage.removeItem(DRAFT_KEY);
            
            // Add a slight delay for Orleans CQRS read-model to sync
            setTimeout(() => {
                load();
                setCreating(false);
            }, 600);
        } catch (err: any) {
            setError(getErr(err, 'Failed to create opportunity'));
            setCreating(false);
        }
    };

    const handlePublish = async (id: string) => {
        setPublishingId(id);
        try {
            await opportunityService.publish(id);
            setOpps(prev => prev.map(o => o.opportunityId === id ? { ...o, status: OpportunityStatus.Published } : o));
            refreshSoon();
        } catch (err: any) {
            setError(getErr(err, 'Failed to publish'));
        } finally { setPublishingId(null); }
    };

    const handleRecover = async (id: string) => {
        setRecoveringId(id);
        try {
            await opportunityService.recover(id);
            setOpps(prev => prev.map(o => o.opportunityId === id ? { ...o, status: OpportunityStatus.Draft } : o));
            refreshSoon();
        } catch (err: any) {
            setError(getErr(err, 'Failed to recover'));
        } finally { setRecoveringId(null); }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCreateForm(p => ({ ...p, lat: pos.coords.latitude, lon: pos.coords.longitude })),
                () => alert('Please enable location access in your browser.')
            );
        }
    };

    const statusColors: Record<string, string> = {
        Published: 'bg-emerald-100 text-emerald-700',
        Draft: 'bg-stone-100 text-stone-600',
        InProgress: 'bg-blue-100 text-blue-700',
        Completed: 'bg-stone-100 text-stone-600',
        Cancelled: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-stone-800">Manage Events</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCalendarView(v => !v)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            calendarView
                                ? 'bg-amber-50 border-amber-300 text-amber-600'
                                : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" />
                        {calendarView ? 'List View' : 'Calendar View'}
                    </button>
                    {isOrgApproved && (
                        <button onClick={() => { setShowCreate(!showCreate); setError(''); }} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2"><Plus className="w-5 h-5" /> Create Opportunity</button>
                    )}
                </div>
            </div>
            <OrgPendingBanner />
            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-lg font-bold text-stone-800">New Opportunity</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {draftRestored && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                                    <span>Draft restored</span>
                                    <button onClick={() => { setCreateForm(DEFAULT_FORM); setDraftRestored(false); localStorage.removeItem(DRAFT_KEY); }} className="text-amber-500 hover:text-amber-700 underline">Discard</button>
                                </div>
                            )}
                            <button
                                onClick={() => setShowTemplatePanel(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${showTemplatePanel ? 'bg-violet-50 border-violet-200 text-violet-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                {templates.length > 0 ? `Load Template (${templates.length})` : 'Load Template'}
                            </button>
                        </div>
                    </div>

                    {/* Template panel */}
                    {showTemplatePanel && (
                        <div className="bg-violet-50 rounded-xl border border-violet-200 p-4 space-y-2">
                            <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Saved Templates</p>
                            {templates.length === 0 ? (
                                <p className="text-sm text-stone-400">No templates saved yet. Fill out the form below and save it as a template.</p>
                            ) : (
                                <div className="space-y-2">
                                    {templates.map(t => (
                                        <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-100">
                                            <div>
                                                <p className="font-bold text-stone-800 text-sm">{t.name}</p>
                                                {t.title && <p className="text-xs text-stone-400">{t.title} · {t.category}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => applyTemplate(t)} className="px-3 py-1 bg-violet-500 text-white text-xs font-bold rounded-lg hover:bg-violet-600">Use</button>
                                                <button onClick={() => handleDeleteTemplate(t.id)} disabled={deletingTemplateId === t.id} className="px-2 py-1 text-rose-400 hover:text-rose-600 disabled:opacity-50">
                                                    {deletingTemplateId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1.5">Title <span className="text-rose-500">*</span></label>
                        <input placeholder="e.g. Park Cleanup Drive" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1.5">Category</label>
                        <input placeholder="e.g. Environment, Medical, Education" value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1.5">Description</label>
                        <textarea placeholder="Describe the volunteer opportunity…" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={3} />
                    </div>
                    <div className="pt-4 border-t border-stone-100">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-stone-700">Check-In Location (Geofence)</h4>
                            <button onClick={handleGetLocation} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1">📍 Use My Location</button>
                        </div>
                        <Suspense fallback={<div className="h-60 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400 text-sm">Loading map…</div>}>
                            <MapPicker
                                lat={createForm.lat}
                                lon={createForm.lon}
                                radius={createForm.radius}
                                onChange={(lat, lon) => setCreateForm(p => ({ ...p, lat, lon }))}
                                onRadiusChange={(radius) => setCreateForm(p => ({ ...p, radius }))}
                            />
                        </Suspense>
                    </div>

                    {/* Save as Template */}
                    {showSaveTemplate ? (
                        <div className="flex items-center gap-3 bg-violet-50 rounded-xl px-4 py-3 border border-violet-200">
                            <Bookmark className="w-4 h-4 text-violet-600 shrink-0" />
                            <input
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                placeholder="Template name (e.g. Weekly Bingo Night)…"
                                className="flex-1 bg-transparent outline-none text-sm font-medium text-stone-700 placeholder-stone-400"
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
                                autoFocus
                            />
                            <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()} className="px-3 py-1 bg-violet-500 text-white text-xs font-bold rounded-lg hover:bg-violet-600 disabled:opacity-50 flex items-center gap-1">
                                {savingTemplate && <Loader2 className="w-3 h-3 animate-spin" />} Save
                            </button>
                            <button onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setShowSaveTemplate(true)} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 self-start">
                            <Bookmark className="w-3.5 h-3.5" /> Save current form as template
                        </button>
                    )}

                    <div className="flex gap-3 justify-end mt-2">
                        <button onClick={() => { setShowCreate(false); setError(''); setShowSaveTemplate(false); setShowTemplatePanel(false); }} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                        <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}Create
                        </button>
                    </div>
                </div>
            )}
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {calendarView && (
                <EventCalendar
                    events={opps.map(o => ({
                        id: o.opportunityId,
                        title: o.title,
                        date: o.publishDate,
                        color: o.status === 'Published' ? 'bg-emerald-500' : o.status === 'InProgress' ? 'bg-blue-400' : o.status === 'Cancelled' ? 'bg-rose-400' : 'bg-stone-400',
                        label: o.status,
                    }))}
                    onEventClick={onViewDetail}
                />
            )}
            <div className={calendarView ? 'hidden' : ''}>
            {loading ? <Spinner /> : opps.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-100 shadow-sm text-center">
                    <p className="text-stone-400 font-medium mb-5">No opportunities yet.</p>
                    {isOrgApproved ? (
                        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600">
                            Create First Opportunity
                        </button>
                    ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 inline-block">Organization approval is required before creating opportunities.</p>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">Event Title</th><th className="p-5 font-bold">Category</th><th className="p-5 font-bold">Status</th><th className="p-5 font-bold">Spots</th><th className="p-5 font-bold">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {opps.map(o => (
                                <tr key={o.opportunityId} className={`hover:bg-orange-50/30 cursor-pointer ${publishingId === o.opportunityId ? 'opacity-70' : ''}`} onClick={() => onViewDetail?.(o.opportunityId)}>
                                    <td className="p-5 text-stone-800 font-bold text-orange-700 hover:underline">{o.title} →</td>
                                    <td className="p-5 text-stone-500 font-medium">{o.category}</td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[o.status] || 'bg-stone-100 text-stone-600'}`}>{o.status}</span></td>
                                    <td className="p-5 text-stone-800 font-bold">{o.availableSpots} / {o.totalSpots}</td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            {o.status === 'Draft' && (
                                                <button onClick={(e) => { e.stopPropagation(); onViewDetail?.(o.opportunityId); }} className="text-blue-500 font-bold text-sm hover:underline inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                                            )}
                                            {o.status === 'Draft' && (
                                                <button onClick={(e) => { e.stopPropagation(); handlePublish(o.opportunityId); }} disabled={publishingId === o.opportunityId} className="text-orange-500 font-bold text-sm hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                                                    {publishingId === o.opportunityId && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    Publish
                                                </button>
                                            )}
                                            {o.status === 'Published' && <span className="text-emerald-500 font-bold text-sm">Active</span>}
                                            {o.status === 'Cancelled' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleRecover(o.opportunityId); }} disabled={recoveringId === o.opportunityId} className="text-amber-600 font-bold text-sm hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                                                    {recoveringId === o.opportunityId && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    Recover
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setSocialPostOpp(o); }} title="Generate Social Post" className="text-purple-400 hover:text-purple-600 transition-colors ml-1">
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </div>
            {socialPostOpp && (
                <SocialPostModal opp={socialPostOpp} orgName={orgName} onClose={() => setSocialPostOpp(null)} />
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR APPLICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordApplications() {
    const auth = useAuth();
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const { visible: visibleApps, hasMore: appsHasMore, sentinelRef: appsSentinel } = useInfiniteList(apps);
    const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [volunteerProfiles, setVolunteerProfiles] = useState<Map<string, VolunteerProfile>>(new Map());
    const [showCredOnly, setShowCredOnly] = useState(false);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) { setLoading(false); return; }
        setLoading(true); setError('');
        try {
            const data = await organizationService.getApplications(auth.linkedGrainId);
            const incoming = data || [];
            setApps(prev => {
                const prevMap = new Map(prev.map(a => [a.applicationId, a]));
                return incoming.map(a => {
                    const before = prevMap.get(a.applicationId);
                    if (!before) return a;
                    // Keep optimistic terminal status if projection temporarily still shows Pending.
                    if ((before.status === ApplicationStatus.Approved || before.status === ApplicationStatus.Rejected)
                        && a.status === ApplicationStatus.Pending) {
                        return { ...a, status: before.status };
                    }
                    return a;
                });
            });
        } catch (err: any) {
            setError(getErr(err, 'Failed to load applications'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (apps.length === 0) return;
        const uniqueIds = [...new Set(apps.map(a => a.volunteerId))];
        Promise.all(uniqueIds.map(id => volunteerService.getProfile(id).then(p => [id, p] as const).catch(() => null)))
            .then(results => {
                const map = new Map<string, VolunteerProfile>();
                results.forEach(r => { if (r) map.set(r[0], r[1]); });
                setVolunteerProfiles(map);
            });
    }, [apps]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const handleApprove = async (id: string) => {
        setActionId(id);
        try {
            await applicationService.approve(id);
            // Optimistic update: immediately show new status
            setApps(prev => prev.map(a => a.applicationId === id ? { ...a, status: ApplicationStatus.Approved } : a));
            showToast('Application approved ✅');
            setTimeout(() => { void load(); }, 900);
        } catch (err: any) {
            showToast(getErr(err, 'Failed to approve'));
        } finally { setActionId(null); }
    };

    const handleReject = async (id: string) => {
        setActionId(id);
        try {
            await applicationService.reject(id, 'Application rejected.');
            // Optimistic update
            setApps(prev => prev.map(a => a.applicationId === id ? { ...a, status: ApplicationStatus.Rejected } : a));
            showToast('Application rejected');
            setTimeout(() => { void load(); }, 900);
        } catch (err: any) {
            showToast(getErr(err, 'Failed to reject'));
        } finally { setActionId(null); }
    };

    const handleBulkApprove = async () => {
        const ids = [...selectedApps].filter(id => apps.find(a => a.applicationId === id)?.status === 'Pending');
        if (ids.length === 0) return;
        setBulkProcessing(true);
        const results = await Promise.allSettled(ids.map(id => applicationService.approve(id)));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        setApps(prev => prev.map(a => ids.includes(a.applicationId) ? { ...a, status: ApplicationStatus.Approved } : a));
        setSelectedApps(new Set());
        showToast(failed > 0 ? `Approved ${succeeded}, ${failed} failed` : `Approved ${succeeded} applications ✅`);
        setBulkProcessing(false);
        setTimeout(() => { void load(); }, 900);
    };

    const handleBulkReject = async () => {
        const ids = [...selectedApps].filter(id => apps.find(a => a.applicationId === id)?.status === 'Pending');
        if (ids.length === 0) return;
        setBulkProcessing(true);
        const results = await Promise.allSettled(ids.map(id => applicationService.reject(id, 'Application rejected.')));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        setApps(prev => prev.map(a => ids.includes(a.applicationId) ? { ...a, status: ApplicationStatus.Rejected } : a));
        setSelectedApps(new Set());
        showToast(failed > 0 ? `Rejected ${succeeded}, ${failed} failed` : `Rejected ${succeeded} applications`);
        setBulkProcessing(false);
        setTimeout(() => { void load(); }, 900);
    };

    const toggleSelect = (id: string) => setSelectedApps(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const pendingAppsList = apps.filter(a => a.status === 'Pending');
    const selectAllPending = () => setSelectedApps(new Set(pendingAppsList.map(a => a.applicationId)));
    const deselectAll = () => setSelectedApps(new Set());

    const handleSetBgc = async (volunteerId: string, status: string) => {
        try {
            await volunteerService.setBackgroundCheckStatus(volunteerId, status);
            setVolunteerProfiles(prev => {
                const map = new Map(prev);
                const p = map.get(volunteerId);
                if (p) map.set(volunteerId, { ...p, backgroundCheckStatus: status });
                return map;
            });
            showToast(`BGC status updated to ${status} ✅`);
        } catch { showToast('Failed to update BGC status'); }
    };

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-emerald-100 text-emerald-700',
        Rejected: 'bg-rose-100 text-rose-700', Waitlisted: 'bg-blue-100 text-blue-700',
    };

    const filteredApps = showCredOnly
        ? visibleApps.filter(a => (volunteerProfiles.get(a.volunteerId)?.credentials?.length ?? 0) > 0)
        : visibleApps;
    const selectedPendingCount = [...selectedApps].filter(id => apps.find(a => a.applicationId === id)?.status === 'Pending').length;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <div className="flex justify-between items-start">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Review Applications</h1><p className="text-stone-500 mt-2 text-lg">Approve or reject volunteer requests.</p></div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCredOnly(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${showCredOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> {showCredOnly ? 'Credentialed only' : 'All applicants'}
                    </button>
                    {apps.length > 0 && (
                        <button
                            onClick={() => downloadCsv('applications', apps.map(a => ({ Volunteer: a.volunteerName, Opportunity: a.opportunityTitle, Shift: a.shiftName, Status: a.status, Applied: new Date(a.appliedAt).toLocaleDateString() })))}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    )}
                </div>
            </div>
            <OrgPendingBanner />
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {selectedApps.size > 0 && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3">
                    <span className="text-orange-700 font-bold text-sm">{selectedApps.size} selected ({selectedPendingCount} pending)</span>
                    <div className="flex items-center gap-3">
                        <button onClick={deselectAll} className="text-stone-500 hover:text-stone-700 text-sm font-medium">Deselect all</button>
                        <button onClick={handleBulkReject} disabled={bulkProcessing || selectedPendingCount === 0} className="px-4 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-100 border border-rose-200 disabled:opacity-50 flex items-center gap-1.5">{bulkProcessing && <Loader2 className="w-3 h-3 animate-spin" />} Reject {selectedPendingCount > 0 ? selectedPendingCount : ''}</button>
                        <button onClick={handleBulkApprove} disabled={bulkProcessing || selectedPendingCount === 0} className="px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5">{bulkProcessing && <Loader2 className="w-3 h-3 animate-spin" />} Approve {selectedPendingCount > 0 ? selectedPendingCount : ''}</button>
                    </div>
                </div>
            )}
            {pendingAppsList.length > 1 && selectedApps.size === 0 && (
                <div className="flex items-center gap-2 text-sm text-stone-400">
                    <button onClick={selectAllPending} className="text-orange-600 font-bold hover:underline">Select all {pendingAppsList.length} pending</button>
                </div>
            )}
            {loading ? <Spinner /> : apps.length === 0 ? <Empty msg="No applications to review." /> : (
                <div className="grid gap-4">
                    {filteredApps.map(app => {
                        const profile = volunteerProfiles.get(app.volunteerId);
                        const hasCredentials = (profile?.credentials?.length ?? 0) > 0;
                        const bgcStatus = profile?.backgroundCheckStatus ?? 'NotSubmitted';
                        const waiverSigned = !!profile?.waiverSignedAt;
                        const bgcChip: Record<string, { label: string; cls: string }> = {
                            NotSubmitted: { label: '🔴 BGC: Not Submitted', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
                            Pending: { label: '🟡 BGC: Pending', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
                            Cleared: { label: '✅ BGC: Cleared', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                            Expired: { label: '🔴 BGC: Expired', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
                        };
                        const chip = bgcChip[bgcStatus] ?? bgcChip['NotSubmitted'];
                        const isSelected = selectedApps.has(app.applicationId);
                        return (
                            <div key={app.applicationId} onClick={() => app.status === 'Pending' && toggleSelect(app.applicationId)} className={`bg-white rounded-2xl p-6 shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${isSelected ? 'border-orange-300 bg-orange-50/40' : actionId === app.applicationId ? 'border-orange-200 opacity-70' : 'border-stone-100 hover:border-stone-200'}`}>
                                <div className="flex items-start gap-4">
                                    {app.status === 'Pending' && (
                                        <div className="shrink-0 mt-1" onClick={e => { e.stopPropagation(); toggleSelect(app.applicationId); }}>
                                            {isSelected ? <CheckSquare className="w-5 h-5 text-orange-500" /> : <Square className="w-5 h-5 text-stone-300" />}
                                        </div>
                                    )}
                                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500 shrink-0">{app.volunteerName?.charAt(0) || '?'}</div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-stone-800">{app.volunteerName} <span className="text-sm font-medium text-stone-400">applied for</span> {app.opportunityTitle}</h3>
                                            {hasCredentials ? (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200"><ShieldCheck className="w-3 h-3" /> {profile!.credentials.length} Credentials</span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-200">⚠ No credentials</span>
                                            )}
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${chip.cls}`}>{chip.label}</span>
                                            {waiverSigned
                                                ? <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✅ Waiver signed</span>
                                                : <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200">⚠ Waiver not signed</span>
                                            }
                                        </div>
                                        <p className="text-sm text-stone-400 mt-1">Shift: {app.shiftName} · Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${statusColors[app.status] || 'bg-stone-100 text-stone-600'}`}>{app.status}</span>
                                            {profile && (
                                                <select
                                                    value={bgcStatus}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => { e.stopPropagation(); handleSetBgc(app.volunteerId, e.target.value); }}
                                                    className="text-xs font-medium border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-orange-400"
                                                >
                                                    <option value="NotSubmitted">BGC: Not Submitted</option>
                                                    <option value="Pending">BGC: Pending</option>
                                                    <option value="Cleared">BGC: Cleared</option>
                                                    <option value="Expired">BGC: Expired</option>
                                                </select>
                                            )}
                                        </div>
                                        {actionId === app.applicationId && <p className="text-xs text-orange-600 font-semibold mt-2">Processing review...</p>}
                                    </div>
                                </div>
                                {app.status === 'Pending' && (
                                    <div className="flex gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleReject(app.applicationId)} disabled={actionId === app.applicationId} className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 disabled:opacity-50 flex items-center gap-1">
                                            {actionId === app.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Reject
                                        </button>
                                        <button onClick={() => handleApprove(app.applicationId)} disabled={actionId === app.applicationId} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1">
                                            {actionId === app.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {appsHasMore && <div ref={appsSentinel} className="h-6 flex items-center justify-center text-xs text-stone-400">Loading more…</div>}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR MEMBERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordMembers() {
    const auth = useAuth();
    const orgStatus = useOrgStatus();
    const isOrgApproved = !!auth.linkedGrainId && orgStatus === 'Approved';
    const [org, setOrg] = useState<OrgState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'members' | 'blocked'>('members');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'Admin' | 'Coordinator' | 'Member'>('Member');
    const [inviting, setInviting] = useState(false);
    const [toast, setToast] = useState('');
    const { visible: pagedMembers, hasMore: membersHasMore, sentinelRef: membersSentinel } = useInfiniteList(org?.members ?? []);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) { setLoading(false); return; }
        setLoading(true); setError('');
        try {
            const data = await organizationService.getById(auth.linkedGrainId);
            setOrg(data);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load organization'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !auth.linkedGrainId) return;
        setInviting(true);
        try {
            await organizationService.inviteMember(auth.linkedGrainId, { email: inviteEmail, role: inviteRole as any });
            setShowInvite(false);
            setInviteEmail('');
            showToast('Member invited!');
            refreshSoon();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to invite member'));
        } finally { setInviting(false); }
    };

    const handleBlock = async (userId: string) => {
        if (!auth.linkedGrainId) return;
        try {
            await organizationService.blockVolunteer(auth.linkedGrainId, userId);
            setOrg(prev => prev ? {
                ...prev,
                blockedVolunteerIds: prev.blockedVolunteerIds.includes(userId)
                    ? prev.blockedVolunteerIds
                    : [...prev.blockedVolunteerIds, userId],
            } : prev);
            showToast('Volunteer blocked');
            refreshSoon();
        } catch { showToast('Failed to block volunteer'); }
    };

    const handleUnblock = async (userId: string) => {
        if (!auth.linkedGrainId) return;
        try {
            await organizationService.unblockVolunteer(auth.linkedGrainId, userId);
            setOrg(prev => prev ? {
                ...prev,
                blockedVolunteerIds: prev.blockedVolunteerIds.filter(id => id !== userId),
            } : prev);
            showToast('Volunteer unblocked');
            refreshSoon();
        } catch { showToast('Failed to unblock volunteer'); }
    };

    const roleColors: Record<string, string> = {
        Admin: 'bg-violet-100 text-violet-700',
        Coordinator: 'bg-blue-100 text-blue-700',
        Member: 'bg-stone-100 text-stone-600',
    };
    const canBlockMember = (userId: string) => !!userId && userId !== auth.userId && userId !== '00000000-0000-0000-0000-000000000000';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Members</h1><p className="text-stone-500 mt-2 text-lg">Manage your organization's members.</p></div>
                <div className="flex items-center gap-2">
                    {org?.members && org.members.length > 0 && (
                        <button
                            onClick={() => downloadCsv('members', (org.members ?? []).map(m => ({ Email: m.email, Role: m.role, Joined: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '' })))}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    )}
                    {isOrgApproved && (
                        <button onClick={() => setShowInvite(!showInvite)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Add Coordinator
                        </button>
                    )}
                </div>
            </div>

            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <OrgPendingBanner />

            {showInvite && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <h3 className="text-lg font-bold text-stone-800">Add Coordinator</h3>
                    <p className="text-sm text-stone-500 -mt-2">The person must already have a coordinator account in the system.</p>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Coordinator Email</label>
                            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="coordinator@email.com" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-2">Role</label>
                            <div className="flex gap-3">
                                {(['Member', 'Coordinator', 'Admin'] as const).map(r => (
                                    <button key={r} type="button" onClick={() => setInviteRole(r)}
                                        className={`px-4 py-2 rounded-full font-bold text-sm border transition-all ${inviteRole === r ? 'bg-orange-500 text-white border-orange-500' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button type="submit" disabled={inviting} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                                {inviting && <Loader2 className="w-4 h-4 animate-spin" />}Invite
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && <ErrorBox msg={error} onRetry={load} />}

            <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl w-fit">
                {(['members', 'blocked'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-5 py-2 rounded-xl font-bold text-sm transition-all capitalize ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                        {t === 'members' ? `Members (${(org?.members?.length ?? 0)})` : `Blocked (${org?.blockedVolunteerIds?.length ?? 0})`}
                    </button>
                ))}
            </div>

            {loading ? <Spinner /> : tab === 'members' ? (
                (() => {
                    const allMembers = org?.members ?? [];
                    return allMembers.length ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                                    <tr><th className="p-5 font-bold">Email</th><th className="p-5 font-bold">Role</th><th className="p-5 font-bold">Joined</th><th className="p-5 font-bold text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {pagedMembers.map((m, idx) => (
                                        <tr key={`${m.userId}-${m.email}-${m.joinedAt}-${idx}`} className="hover:bg-orange-50/30">
                                            <td className="p-5 text-stone-800 font-bold">
                                                {m.email}
                                                {m.userId === auth.userId && <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">You</span>}
                                            </td>
                                            <td className="p-5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${roleColors[m.role] || 'bg-stone-100 text-stone-600'}`}>{m.role}</span></td>
                                            <td className="p-5 text-stone-400 text-sm">{new Date(m.joinedAt).toLocaleDateString()}</td>
                                            <td className="p-5 text-right">
                                                {canBlockMember(m.userId) ? (
                                                    <button onClick={() => handleBlock(m.userId)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Block</button>
                                                ) : (
                                                    <span className="text-stone-300 text-sm">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {membersHasMore && <div ref={membersSentinel} className="py-3 text-center text-xs text-stone-400">Loading more…</div>}
                        </div>
                    ) : <Empty msg="No members yet. Use the Invite button to add some." />;
                })()
            ) : (
                org?.blockedVolunteerIds?.length ? (
                    <div className="space-y-3">
                        {org.blockedVolunteerIds.map(id => (
                            <div key={id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-stone-700">Volunteer {id.substring(0, 8)}…</p>
                                    <p className="text-sm text-stone-400">Blocked from applying to your events</p>
                                </div>
                                <button onClick={() => handleUnblock(id)} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 text-sm">Unblock</button>
                            </div>
                        ))}
                    </div>
                ) : <Empty msg="No blocked volunteers." />
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR CERT TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordCertTemplates() {
    const auth = useAuth();
    const orgStatus = useOrgStatus();
    const isOrgApproved = !!auth.linkedGrainId && orgStatus === 'Approved';
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', primaryColor: '#F59E0B', accentColor: '#EA580C' });
    const [creating, setCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', primaryColor: '', accentColor: '' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await certificateService.getTemplates(auth.linkedGrainId || undefined);
            setTemplates(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load templates'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

    const handleCreate = async () => {
        if (!createForm.name) return;
        setCreating(true);
        try {
            await certificateService.createTemplate({
                ...createForm,
                organizationId: auth.linkedGrainId || undefined,
            });
            setShowCreate(false);
            setCreateForm({ name: '', description: '', primaryColor: '#F59E0B', accentColor: '#EA580C' });
            showToast('Template created!');
            refreshSoon();
        } catch (err: any) {
            setError(getErr(err, 'Failed to create template'));
        } finally { setCreating(false); }
    };

    const openEdit = (t: CertificateTemplate) => {
        setShowCreate(false);
        setEditingTemplate(t);
        setEditForm({ name: t.name, description: t.description, primaryColor: t.primaryColor, accentColor: t.accentColor });
        setDeleteConfirm(null);
    };

    const handleSaveEdit = async () => {
        if (!editingTemplate) return;
        setSaving(true);
        try {
            await certificateService.updateTemplate(editingTemplate.id, editForm);
            setEditingTemplate(null);
            showToast('Template updated!');
            refreshSoon();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to update template'));
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await certificateService.deleteTemplate(id);
            setDeleteConfirm(null);
            setEditingTemplate(null);
            showToast('Template deleted');
            refreshSoon();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to delete template'));
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <OrgPendingBanner />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-stone-800">Certificate Templates</h1>
                    <p className="text-stone-500 mt-2 text-lg">Click any template to edit. Manage your certificate designs.</p>
                </div>
                {isOrgApproved && (
                    <button onClick={() => { setShowCreate(!showCreate); setEditingTemplate(null); }} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2"><Plus className="w-5 h-5" /> New Template</button>
                )}
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <h3 className="text-lg font-bold text-stone-800">New Template</h3>
                    <input placeholder="Template Name *" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <input placeholder="Description" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <div className="flex gap-4">
                        <div><label className="block text-sm font-medium text-stone-600 mb-1">Primary Color</label><input type="color" value={createForm.primaryColor} onChange={e => setCreateForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer" /></div>
                        <div><label className="block text-sm font-medium text-stone-600 mb-1">Accent Color</label><input type="color" value={createForm.accentColor} onChange={e => setCreateForm(p => ({ ...p, accentColor: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer" /></div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                        <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}Create
                        </button>
                    </div>
                </div>
            )}

            {/* Edit panel */}
            {editingTemplate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Pencil className="w-5 h-5 text-orange-500" /> Edit Template</h3>
                        <button onClick={() => setEditingTemplate(null)} className="p-1 text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
                    </div>
                    <input placeholder="Template Name *" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <input placeholder="Description" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <div className="flex gap-4">
                        <div><label className="block text-sm font-medium text-stone-600 mb-1">Primary Color</label><input type="color" value={editForm.primaryColor} onChange={e => setEditForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer" /></div>
                        <div><label className="block text-sm font-medium text-stone-600 mb-1">Accent Color</label><input type="color" value={editForm.accentColor} onChange={e => setEditForm(p => ({ ...p, accentColor: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer" /></div>
                    </div>
                    <div className="flex gap-3 justify-between">
                        {deleteConfirm === editingTemplate.id ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-rose-600 font-medium">Delete this template?</span>
                                <button onClick={() => handleDelete(editingTemplate.id)} className="px-3 py-1.5 bg-rose-500 text-white font-bold rounded-lg text-sm hover:bg-rose-600">Yes, Delete</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 bg-stone-100 text-stone-600 font-bold rounded-lg text-sm hover:bg-stone-200">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setDeleteConfirm(editingTemplate.id)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : templates.length === 0 ? <Empty msg="No templates yet." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates.map(t => (
                        <div key={t.id}
                            onClick={() => openEdit(t)}
                            className={`bg-white rounded-3xl p-6 shadow-sm border cursor-pointer hover:shadow-md hover:border-orange-200 transition-all ${editingTemplate?.id === t.id ? 'border-orange-300 ring-2 ring-orange-200' : 'border-stone-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primaryColor }}></div>
                                    <h3 className="font-bold text-stone-800">{t.name}</h3>
                                    {t.isSystemPreset && <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-xs font-bold rounded">System</span>}
                                </div>
                                <Pencil className="w-4 h-4 text-stone-300" />
                            </div>
                            <p className="text-sm text-stone-500">{t.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR OPPORTUNITY DETAIL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OppDetailModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-stone-800">{title}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-stone-400 hover:text-stone-700" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

interface CoordOppDetailProps { oppId: string; onBack: () => void; }
export function CoordOpportunityDetail({ oppId, onBack }: CoordOppDetailProps) {
    const auth = useAuth();
    const [opp, setOpp] = useState<OpportunityState | null>(null);
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceSummary[]>([]);

    // Add Shift
    const [showAddShift, setShowAddShift] = useState(false);
    const [shiftName, setShiftName] = useState('');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [shiftCap, setShiftCap] = useState('10');
    const [addingShift, setAddingShift] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'weekly' | 'monthly'>('none');
    const [repeatUntil, setRepeatUntil] = useState('');
    const [addingProgress, setAddingProgress] = useState('');

    // Cancel
    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Recover
    const [recovering, setRecovering] = useState(false);

    // Skills
    const [showSkills, setShowSkills] = useState(false);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [selSkillIds, setSelSkillIds] = useState<Set<string>>(new Set());
    const [savingSkills, setSavingSkills] = useState(false);
    const [displaySkills, setDisplaySkills] = useState<Skill[]>([]);

    // Shift edit / delete
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [editShiftForm, setEditShiftForm] = useState({ name: '', start: '', end: '', cap: '10' });
    const [savingShift, setSavingShift] = useState(false);
    const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);

    // Edit Info (Draft only)
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', category: '', lat: 43.6532, lon: -79.3832, radius: 200 });
    const [saving, setSaving] = useState(false);

    const openEdit = () => {
        if (!opp) return;
        setEditForm({
            title: opp.info.title,
            description: opp.info.description,
            category: opp.info.category,
            lat: opp.geoFence?.latitude ?? 43.6532,
            lon: opp.geoFence?.longitude ?? -79.3832,
            radius: opp.geoFence?.radiusMeters ?? 200,
        });
        setShowEdit(true);
    };

    const doSaveEdit = async () => {
        if (!opp) return;
        setSaving(true);
        try {
            await opportunityService.updateInfo(oppId, {
                title: editForm.title, description: editForm.description, category: editForm.category,
                lat: editForm.lat, lon: editForm.lon, radiusMeters: editForm.radius,
            });
            setShowEdit(false);
            showToast('Opportunity updated ✅');
            refreshSoon();
        } catch (err: any) { showToast(getErr(err, 'Failed to update')); }
        finally { setSaving(false); }
    };

    // Notify volunteers
    const [showNotify, setShowNotify] = useState(false);
    const [notifyMsg, setNotifyMsg] = useState('');
    const [notifyTarget, setNotifyTarget] = useState<'Approved' | 'All'>('Approved');
    const [notifying, setNotifying] = useState(false);

    // Certificate
    const [showCert, setShowCert] = useState(false);
    const [certTemplates, setCertTemplates] = useState<CertificateTemplate[]>([]);
    const [certTargetId, setCertTargetId] = useState<string | null>(null);
    const [certTargetName, setCertTargetName] = useState('');
    const [selTemplate, setSelTemplate] = useState<string | null>(null);
    const [issuingCert, setIssuingCert] = useState(false);
    const [issuedCerts, setIssuedCerts] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [d, a, att] = await Promise.all([
                opportunityService.getById(oppId),
                applicationService.getForOpportunity(oppId),
                attendanceService.getByOpportunity(oppId),
            ]);
            setOpp(d); setApps(a); setAttendanceRecords(att);
        } catch (err: any) { setError(getErr(err, 'Failed to load')); }
        finally { setLoading(false); }
    }, [oppId]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const doPublish = async () => {
        setActionId('pub');
        try { await opportunityService.publish(oppId); showToast('Published ✅'); refreshSoon(); }
        catch (err: any) { showToast(getErr(err, 'Failed to publish')); }
        finally { setActionId(null); }
    };

    const doCancelSubmit = async () => {
        if (!cancelReason) return; setCancelling(true);
        try { await opportunityService.cancel(oppId, cancelReason); setShowCancel(false); showToast('Cancelled'); refreshSoon(); }
        catch (err: any) { showToast(getErr(err, 'Failed')); }
        finally { setCancelling(false); }
    };

    const doAddShift = async () => {
        if (!shiftName || !shiftStart || !shiftEnd) return; setAddingShift(true);
        try {
            const baseStart = new Date(shiftStart);
            const baseEnd = new Date(shiftEnd);
            const shifts: { name: string; startTime: string; endTime: string; maxCapacity: number }[] = [];
            if (repeatMode === 'none' || !repeatUntil) {
                shifts.push({ name: shiftName, startTime: baseStart.toISOString(), endTime: baseEnd.toISOString(), maxCapacity: parseInt(shiftCap) || 10 });
            } else {
                const until = new Date(repeatUntil);
                const intervalMs = (repeatMode === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000;
                let cur = new Date(baseStart);
                let curEnd = new Date(baseEnd);
                let count = 0;
                while (cur <= until && count < 52) {
                    shifts.push({ name: shiftName, startTime: cur.toISOString(), endTime: curEnd.toISOString(), maxCapacity: parseInt(shiftCap) || 10 });
                    cur = new Date(cur.getTime() + intervalMs);
                    curEnd = new Date(curEnd.getTime() + intervalMs);
                    count++;
                }
            }
            for (let i = 0; i < shifts.length; i++) {
                if (shifts.length > 1) setAddingProgress(`Creating shift ${i + 1} of ${shifts.length}…`);
                await opportunityService.addShift(oppId, shifts[i]);
            }
            setShowAddShift(false); setShiftName(''); setShiftStart(''); setShiftEnd(''); setShiftCap('10');
            setRepeatMode('none'); setRepeatUntil(''); setAddingProgress('');
            showToast(shifts.length > 1 ? `${shifts.length} shifts added! 🎉` : 'Shift added!'); refreshSoon();
        } catch (err: any) { showToast(getErr(err, 'Failed')); setAddingProgress(''); }
        finally { setAddingShift(false); }
    };

    const openSkills = async () => {
        try { const l = await skillService.getAll(); setAllSkills(l); setSelSkillIds(new Set(opp?.requiredSkillIds || [])); setShowSkills(true); }
        catch { showToast('Failed to load skills'); }
    };

    const doSaveSkills = async () => {
        setSavingSkills(true);
        try { await skillService.setRequiredSkills(oppId, Array.from(selSkillIds)); setShowSkills(false); showToast('Skills updated'); refreshSoon(); }
        catch { showToast('Failed'); }
        finally { setSavingSkills(false); }
    };

    // Load all skills for display (skill name tags)
    useEffect(() => {
        skillService.getAll().then(skills => setDisplaySkills(skills)).catch(() => {});
    }, []);

    const doRecover = async () => {
        setRecovering(true);
        try { await opportunityService.recover(oppId); showToast('Recovered to Draft ✅'); refreshSoon(); }
        catch (err: any) { showToast(getErr(err, 'Failed to recover')); }
        finally { setRecovering(false); }
    };

    const toLocalDatetime = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const openEditShift = (s: Shift) => {
        setEditingShiftId(s.shiftId);
        setEditShiftForm({ name: s.name, start: toLocalDatetime(s.startTime), end: toLocalDatetime(s.endTime), cap: String(s.maxCapacity) });
    };

    const doUpdateShift = async () => {
        if (!editingShiftId || !editShiftForm.name || !editShiftForm.start || !editShiftForm.end) return;
        setSavingShift(true);
        try {
            await opportunityService.updateShift(oppId, editingShiftId, {
                name: editShiftForm.name,
                startTime: new Date(editShiftForm.start).toISOString(),
                endTime: new Date(editShiftForm.end).toISOString(),
                maxCapacity: parseInt(editShiftForm.cap) || 10,
            });
            setEditingShiftId(null);
            showToast('Shift updated ✅');
            refreshSoon();
        } catch (err: any) { showToast(getErr(err, 'Failed to update shift')); }
        finally { setSavingShift(false); }
    };

    const doDeleteShift = async (shiftId: string) => {
        setDeletingShiftId(shiftId);
        try { await opportunityService.removeShift(oppId, shiftId); showToast('Shift deleted'); refreshSoon(); }
        catch (err: any) { showToast(getErr(err, 'Failed to delete shift')); }
        finally { setDeletingShiftId(null); }
    };

    const doApprove = async (id: string) => { setActionId(id); try { await applicationService.approve(id); showToast('Approved ✅'); setTimeout(() => load(), 600); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doReject = async (id: string) => { setActionId(id); try { await applicationService.reject(id, 'Rejected'); showToast('Rejected'); setTimeout(() => load(), 600); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doNoShow = async (appId: string) => { setActionId(appId + '_ns'); try { await applicationService.markNoShow(appId); showToast('No-show marked'); setTimeout(() => load(), 600); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doInitAndCheckIn = async (app: ApplicationSummary) => {
        setActionId(app.volunteerId + '_init');
        try {
            const attId = crypto.randomUUID();
            await attendanceService.init(attId, { volunteerId: app.volunteerId, applicationId: app.applicationId, opportunityId: app.opportunityId });
            await attendanceService.coordinatorCheckIn(attId);
            showToast(`${app.volunteerName || 'Volunteer'} checked in ✅`);
            setTimeout(() => load(), 600);
        } catch (err: any) { showToast(getErr(err, 'Failed to check in')); }
        finally { setActionId(null); }
    };

    const doCoordCheckIn = async (record: AttendanceSummary) => {
        setActionId(record.attendanceId + '_cin');
        try {
            await attendanceService.coordinatorCheckIn(record.attendanceId);
            showToast('Checked in ✅');
            setTimeout(() => load(), 600);
        } catch (err: any) { showToast(getErr(err, 'Failed to check in')); }
        finally { setActionId(null); }
    };

    const doCoordCheckOut = async (record: AttendanceSummary) => {
        setActionId(record.attendanceId + '_cout');
        try {
            await attendanceService.checkOut(record.attendanceId);
            showToast('Checked out ✅');
            setTimeout(() => load(), 600);
        } catch (err: any) { showToast(getErr(err, 'Failed to check out')); }
        finally { setActionId(null); }
    };

    const doConfirm = async (app: ApplicationSummary) => {
        setActionId(app.volunteerId + '_a');
        try {
            const record = attendanceRecords.find(r => r.volunteerId === app.volunteerId);
            if (!record) { showToast('No attendance record found — check in first'); return; }
            await attendanceService.confirm(record.attendanceId, { supervisorId: oppId, rating: 5 });
            showToast('Attendance confirmed ✅');
            setTimeout(() => load(), 600);
        } catch (err: any) { showToast(getErr(err, 'Failed to confirm')); }
        finally { setActionId(null); }
    };

    const openCert = async (vid: string, name: string) => {
        try { 
            const l = await certificateService.getTemplates(auth.linkedGrainId || undefined); 
            setCertTemplates(l); 
            setSelTemplate(l.length > 0 ? l[0].id : null); 
            setCertTargetId(vid); 
            setCertTargetName(name); 
            setShowCert(true); 
        } catch { 
            showToast('Failed to load templates'); 
        }
    };

    const doIssueCert = async () => {
        if (!certTargetId || !selTemplate) return; setIssuingCert(true);
        try { 
            const r = await certificateService.generate(certTargetId, selTemplate); 
            setShowCert(false); 
            showToast(`Certificate issued: ${r.fileName}`); 
            setIssuedCerts(prev => new Set(prev).add(certTargetId));
            await certificateService.openGeneratedFile(r.fileKey, r.fileName);
        }
        catch (err: any) { showToast(getErr(err, 'Failed')); }
        finally { setIssuingCert(false); }
    };

    const doNotify = async () => {
        if (!notifyMsg.trim()) return;
        setNotifying(true);
        try {
            const res = await opportunityService.notifyVolunteers(oppId, { message: notifyMsg, targetStatus: notifyTarget });
            setNotifyMsg('');
            showToast(`Message sent to ${res.sent} volunteer${res.sent !== 1 ? 's' : ''} 📣`);
            setShowNotify(false);
        } catch (err: any) { showToast(getErr(err, 'Failed to send notification')); }
        finally { setNotifying(false); }
    };

    const pendingApps = apps.filter(a => a.status === 'Pending');
    const confirmedApps = apps.filter(a => a.status === 'Approved' || a.status === 'Promoted');
    const statusColors: Record<string, string> = { Published: 'bg-emerald-100 text-emerald-700', Draft: 'bg-stone-100 text-stone-500', InProgress: 'bg-blue-100 text-blue-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-rose-100 text-rose-700' };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-orange-600 font-bold transition-colors"><ChevronLeft className="w-5 h-5" /> Back to Events</button>

            {loading ? <Spinner /> : error ? <ErrorBox msg={error} onRetry={load} /> : opp && (<>
                {/* Header */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                    <div className="flex justify-between items-start mb-2">
                        <h1 className="text-3xl font-extrabold text-stone-800 flex-1 mr-4">{opp.info.title}</h1>
                        <div className="flex items-center gap-2 shrink-0">
                            {opp.status === 'Cancelled' && (
                                <button onClick={doRecover} disabled={recovering} className="px-4 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-xl hover:bg-amber-100 border border-amber-200 text-sm flex items-center gap-1.5">{recovering && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Recover Event</button>
                            )}
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColors[opp.status] || 'bg-stone-100 text-stone-500'}`}>{opp.status}</span>
                        </div>
                    </div>
                    <p className="text-orange-500 text-sm font-bold mb-4">{opp.info.category}</p>
                    <p className="text-stone-600 leading-relaxed mb-6">{opp.info.description}</p>
                    <div className="flex flex-wrap gap-3">
                        {opp.status === 'Draft' && <button onClick={doPublish} disabled={actionId === 'pub'} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-60 flex items-center gap-2">{actionId === 'pub' && <Loader2 className="w-4 h-4 animate-spin" />} Publish</button>}
                        {opp.status === 'Draft' && <button onClick={openEdit} className="px-5 py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 border border-blue-200 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit</button>}
                        {(opp.status === 'Draft' || opp.status === 'Published') && <button onClick={() => setShowCancel(true)} className="px-5 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 border border-rose-200">Cancel Event</button>}
                        <button onClick={openSkills} className="px-5 py-2.5 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 border border-orange-200 flex items-center gap-2"><Star className="w-4 h-4" /> Required Skills ({opp.requiredSkillIds?.length || 0})</button>
                        {(opp.status === 'Published' || opp.status === 'InProgress') && apps.length > 0 && (
                            <button onClick={() => setShowNotify(true)} className="px-5 py-2.5 bg-violet-50 text-violet-600 font-bold rounded-xl hover:bg-violet-100 border border-violet-200 flex items-center gap-2"><Bell className="w-4 h-4" /> Notify Volunteers</button>
                        )}
                    </div>
                    {opp.requiredSkillIds && opp.requiredSkillIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                            {(() => {
                                const reqSkills = opp.requiredSkillIds.map(id => displaySkills.find(s => s.id === id)).filter(Boolean) as Skill[];
                                const trainingSkills = reqSkills.filter(s => s.category === 'Training');
                                const regularSkills = reqSkills.filter(s => s.category !== 'Training');
                                return (
                                    <>
                                        {trainingSkills.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wide mr-2">Required Training:</span>
                                                <div className="inline-flex flex-wrap gap-2 mt-1">
                                                    {trainingSkills.map(s => <span key={s.id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200">{s.name}</span>)}
                                                </div>
                                            </div>
                                        )}
                                        {regularSkills.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-orange-500 uppercase tracking-wide mr-2">Required Skills:</span>
                                                <div className="inline-flex flex-wrap gap-2 mt-1">
                                                    {regularSkills.map(s => <span key={s.id} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold border border-orange-200">{s.name}</span>)}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Shifts */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-xl font-bold text-stone-800">Shifts</h2>
                        <button onClick={() => setShowAddShift(!showAddShift)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600"><Plus className="w-4 h-4" /> Add Shift</button>
                    </div>
                    {showAddShift && (
                        <div className="bg-stone-50 rounded-2xl p-5 mb-5 border border-stone-200 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input value={shiftName} onChange={e => setShiftName(e.target.value)} placeholder="Shift name" className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm col-span-2 md:col-span-1" />
                                <input value={shiftCap} onChange={e => setShiftCap(e.target.value)} type="number" placeholder="Capacity" className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                                <div><label className="text-xs font-medium text-stone-500 mb-1 block">Start</label><input type="datetime-local" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                <div><label className="text-xs font-medium text-stone-500 mb-1 block">End</label><input type="datetime-local" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                <div><label className="text-xs font-medium text-stone-500 mb-1 block">Repeat</label>
                                    <select value={repeatMode} onChange={e => setRepeatMode(e.target.value as 'none' | 'weekly' | 'monthly')} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm">
                                        <option value="none">No repeat</option>
                                        <option value="weekly">Weekly (every 7 days)</option>
                                        <option value="monthly">Monthly (every 30 days)</option>
                                    </select>
                                </div>
                                {repeatMode !== 'none' && (
                                    <div><label className="text-xs font-medium text-stone-500 mb-1 block">Repeat until</label><input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                )}
                            </div>
                            {addingProgress && <p className="text-xs text-orange-600 font-semibold">{addingProgress}</p>}
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setShowAddShift(false); setRepeatMode('none'); setRepeatUntil(''); }} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-200">Cancel</button>
                                <button onClick={doAddShift} disabled={addingShift || !shiftName || !shiftStart || !shiftEnd} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2">{addingShift && <Loader2 className="w-3 h-3 animate-spin" />} {repeatMode !== 'none' && repeatUntil ? 'Add Series' : 'Add'}</button>
                            </div>
                        </div>
                    )}
                    {opp.shifts.length === 0 ? <Empty msg="No shifts yet. Add shifts before publishing." /> : (
                        <div className="space-y-3">
                            {opp.shifts.map((s: Shift) => (
                                <div key={s.shiftId} className="border border-stone-100 rounded-2xl overflow-hidden">
                                    {editingShiftId === s.shiftId ? (
                                        <div className="bg-stone-50 p-4 space-y-3">
                                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Edit Shift</p>
                                            <div className="space-y-3">
                                                <div><label className="text-xs font-bold text-stone-500 mb-1 block">Shift Name</label><input value={editShiftForm.name} onChange={e => setEditShiftForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                                <div><label className="text-xs font-bold text-stone-500 mb-1 block">Max Capacity</label><input type="number" value={editShiftForm.cap} onChange={e => setEditShiftForm(p => ({ ...p, cap: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div><label className="text-xs font-bold text-stone-500 mb-1 block">Start Time</label><input type="datetime-local" value={editShiftForm.start} onChange={e => setEditShiftForm(p => ({ ...p, start: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                                    <div><label className="text-xs font-bold text-stone-500 mb-1 block">End Time</label><input type="datetime-local" value={editShiftForm.end} onChange={e => setEditShiftForm(p => ({ ...p, end: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingShiftId(null)} className="px-3 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-200">Cancel</button>
                                                <button onClick={doUpdateShift} disabled={savingShift || !editShiftForm.name || !editShiftForm.start || !editShiftForm.end} className="px-3 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">{savingShift && <Loader2 className="w-3 h-3 animate-spin" />} Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div>
                                                <p className="font-bold text-stone-800">{s.name}</p>
                                                <p className="text-sm text-stone-400 mt-0.5">📅 {new Date(s.startTime).toLocaleString()} — {new Date(s.endTime).toLocaleString()}</p>
                                                <p className="text-sm text-stone-400">👥 {s.currentCount}/{s.maxCapacity} filled</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0 ml-3">
                                                <button onClick={() => openEditShift(s)} className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit shift"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => doDeleteShift(s.shiftId)} disabled={deletingShiftId === s.shiftId} className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50" title="Delete shift">{deletingShiftId === s.shiftId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Apps */}
                {pendingApps.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                        <h2 className="text-xl font-bold text-stone-800 mb-4">Pending Applications ({pendingApps.length})</h2>
                        {pendingApps.map(app => (
                            <div key={app.applicationId} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
                                <div><p className="font-bold text-stone-800">{app.volunteerName || app.volunteerId.substring(0, 12)}</p><p className="text-sm text-stone-400">{app.shiftName}</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => doApprove(app.applicationId)} disabled={actionId === app.applicationId} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm hover:bg-emerald-100 disabled:opacity-50">Approve</button>
                                    <button onClick={() => doReject(app.applicationId)} disabled={actionId === app.applicationId} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100 disabled:opacity-50">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Attendance Management */}
                {confirmedApps.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-stone-800">Attendance Management ({confirmedApps.length})</h2>
                            <div className="flex gap-2 text-xs font-bold">
                                <span className="px-2 py-1 bg-stone-100 text-stone-500 rounded-lg">{attendanceRecords.filter(r => r.status === 'Pending').length} pending</span>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">{attendanceRecords.filter(r => r.status === 'CheckedIn').length} in</span>
                                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">{attendanceRecords.filter(r => r.status === 'CheckedOut' || r.status === 'Resolved').length} out</span>
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">{attendanceRecords.filter(r => r.status === 'Confirmed').length} confirmed</span>
                            </div>
                        </div>
                        {confirmedApps.map(app => {
                            const rec = attendanceRecords.find(r => r.volunteerId === app.volunteerId);
                            const status = rec?.status;
                            return (
                                <div key={app.applicationId} className="flex items-start justify-between py-3.5 border-b border-stone-50 last:border-0 gap-4">
                                    <div className="min-w-0">
                                        <p className="font-bold text-stone-800 truncate">{app.volunteerName || app.volunteerId.substring(0, 12)}</p>
                                        <p className="text-xs text-stone-400 mt-0.5">{app.shiftName}</p>
                                        {rec?.checkInTime && (
                                            <p className="text-xs text-stone-400 mt-0.5">
                                                In: {new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {rec.checkOutTime && <> · Out: {new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <span className="font-bold text-emerald-600">{rec.totalHours.toFixed(1)}h</span></>}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end shrink-0">
                                        {!rec && (
                                            <button onClick={() => doInitAndCheckIn(app)} disabled={actionId === app.volunteerId + '_init'} className="px-3 py-1.5 bg-blue-500 text-white font-bold rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                                                {actionId === app.volunteerId + '_init' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Check In
                                            </button>
                                        )}
                                        {status === 'Pending' && (
                                            <button onClick={() => doCoordCheckIn(rec!)} disabled={actionId === rec!.attendanceId + '_cin'} className="px-3 py-1.5 bg-blue-500 text-white font-bold rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                                                {actionId === rec!.attendanceId + '_cin' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Check In
                                            </button>
                                        )}
                                        {status === 'CheckedIn' && (
                                            <button onClick={() => doCoordCheckOut(rec!)} disabled={actionId === rec!.attendanceId + '_cout'} className="px-3 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1">
                                                {actionId === rec!.attendanceId + '_cout' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Check Out
                                            </button>
                                        )}
                                        {(status === 'CheckedOut' || status === 'Resolved') && (
                                            <button onClick={() => doConfirm(app)} disabled={actionId === app.volunteerId + '_a'} className="px-3 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
                                                {actionId === app.volunteerId + '_a' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Confirm
                                            </button>
                                        )}
                                        {status === 'Confirmed' && (
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm">✅ Confirmed</span>
                                        )}
                                        {status !== 'Confirmed' && (
                                            <button onClick={() => doNoShow(app.applicationId)} disabled={actionId === app.applicationId + '_ns'} className="px-3 py-1.5 bg-stone-100 text-stone-500 font-bold rounded-lg text-sm hover:bg-stone-200 disabled:opacity-50">No-Show</button>
                                        )}
                                        {status === 'Confirmed' && (
                                            <button
                                                onClick={() => openCert(app.volunteerId, app.volunteerName || app.volunteerId)}
                                                disabled={issuedCerts.has(app.volunteerId)}
                                                className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-lg text-sm hover:bg-amber-100 flex items-center gap-1 disabled:opacity-50 disabled:bg-stone-100 disabled:text-stone-400">
                                                <Award className="w-3.5 h-3.5" /> {issuedCerts.has(app.volunteerId) ? 'Issued' : 'Certificate'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </>)}

            {/* Edit Info Modal */}
            <OppDetailModal show={showEdit} onClose={() => setShowEdit(false)} title="Edit Opportunity">
                <div className="space-y-3">
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Title <span className="text-rose-500">*</span></label><input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Category</label><input value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Environment, Medical" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-stone-500 mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this opportunity" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" /></div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Check-In Location (Geofence)</label>
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-stone-400 mb-1 block">Latitude</label><input type="number" step="any" value={editForm.lat} onChange={e => setEditForm(p => ({ ...p, lat: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                            <div><label className="text-xs text-stone-400 mb-1 block">Longitude</label><input type="number" step="any" value={editForm.lon} onChange={e => setEditForm(p => ({ ...p, lon: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                            <div><label className="text-xs text-stone-400 mb-1 block">Radius (m)</label><input type="number" value={editForm.radius} onChange={e => setEditForm(p => ({ ...p, radius: parseInt(e.target.value) || 200 }))} className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                    <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                    <button onClick={doSaveEdit} disabled={!editForm.title || saving} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                </div>
            </OppDetailModal>

            <OppDetailModal show={showCancel} onClose={() => setShowCancel(false)} title="Cancel Event">
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason (required)" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-rose-500 outline-none resize-none" />
                <div className="flex gap-3 justify-end"><button onClick={() => setShowCancel(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Back</button><button onClick={doCancelSubmit} disabled={!cancelReason || cancelling} className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2">{cancelling && <Loader2 className="w-4 h-4 animate-spin" />} Confirm</button></div>
            </OppDetailModal>

            <OppDetailModal show={showSkills} onClose={() => setShowSkills(false)} title="Required Skills">
                <div className="max-h-56 overflow-y-auto flex flex-wrap gap-2">
                    {allSkills.map((s: Skill) => { const sel = selSkillIds.has(s.id); return <button key={s.id} onClick={() => setSelSkillIds(p => { const n = new Set(p); sel ? n.delete(s.id) : n.add(s.id); return n; })} className={`px-4 py-2 rounded-full font-bold text-sm border transition-all ${sel ? 'bg-orange-500 text-white border-orange-500' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300'}`}>{sel && '✓ '}{s.name}</button>; })}
                    {allSkills.length === 0 && <p className="text-stone-400 text-sm">No skills in system.</p>}
                </div>
                <div className="flex gap-3 justify-end"><button onClick={() => setShowSkills(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button><button onClick={doSaveSkills} disabled={savingSkills} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">{savingSkills && <Loader2 className="w-4 h-4 animate-spin" />} Save</button></div>
            </OppDetailModal>

            <OppDetailModal show={showCert} onClose={() => setShowCert(false)} title="Issue Certificate">
                <p className="text-stone-500 text-sm">To: <span className="font-bold text-stone-700">{certTargetName}</span></p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                    {certTemplates.map((t: CertificateTemplate) => (
                        <button key={t.id} onClick={() => setSelTemplate(t.id)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${selTemplate === t.id ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.primaryColor }} />
                            <div className="flex-1"><p className="font-bold text-stone-800 text-sm">{t.name}</p><p className="text-xs text-stone-400">{t.description}</p></div>
                            {selTemplate === t.id && <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />}
                        </button>
                    ))}
                    {certTemplates.length === 0 && <p className="text-stone-400 text-sm">No templates. Create one in Cert Templates.</p>}
                </div>
                <div className="flex gap-3 justify-end"><button onClick={() => setShowCert(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button><button onClick={doIssueCert} disabled={!selTemplate || issuingCert || certTemplates.length === 0} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">{issuingCert && <Loader2 className="w-4 h-4 animate-spin" />} Issue</button></div>
            </OppDetailModal>

            <OppDetailModal show={showNotify} onClose={() => setShowNotify(false)} title="Notify Volunteers">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-stone-600 mb-2 block">Send to</label>
                        <select value={notifyTarget} onChange={e => setNotifyTarget(e.target.value as 'Approved' | 'All')} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-violet-500 outline-none text-sm">
                            <option value="Approved">Approved volunteers only ({confirmedApps.length})</option>
                            <option value="All">All applicants ({apps.length})</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-stone-600 mb-2 block">Message</label>
                        <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={4} placeholder="e.g. Reminder: tomorrow's bingo session starts at 2pm. Please arrive 10 minutes early." className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none" />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowNotify(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-200">Cancel</button>
                        <button onClick={doNotify} disabled={notifying || !notifyMsg.trim()} className="px-5 py-2.5 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-600 disabled:opacity-50 flex items-center gap-2">{notifying && <Loader2 className="w-4 h-4 animate-spin" />}<Bell className="w-4 h-4" /> Send Notification</button>
                    </div>
                </div>
            </OppDetailModal>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR REPORTS (Hours Export for Accreditation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordReports() {
    const auth = useAuth();
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        return d.toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [records, setRecords] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fetched, setFetched] = useState(false);

    const fetchReport = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const opps = await organizationService.getOpportunities(auth.linkedGrainId);
            const from = new Date(fromDate).getTime();
            const to = new Date(toDate + 'T23:59:59').getTime();
            const filtered = opps.filter(o => {
                if (!o.publishDate) return true;
                const d = new Date(o.publishDate).getTime();
                return d >= from && d <= to;
            });
            const allRecords = await Promise.all(
                filtered.map(o => attendanceService.getByOpportunity(o.opportunityId).catch(() => [] as AttendanceSummary[]))
            );
            setRecords(allRecords.flat().filter(r => r.totalHours > 0));
            setFetched(true);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load report data'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId, fromDate, toDate]);

    const handleExportCsv = () => {
        const rows = records.map(r => ({
            'Volunteer': r.volunteerName,
            'Opportunity': r.opportunityTitle,
            'Check-In': r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '',
            'Check-Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '',
            'Hours': r.totalHours.toFixed(2),
            'Status': r.status,
        }));
        downloadCsv('volunteer-hours-' + fromDate + '-to-' + toDate + '.csv', rows);
    };

    const totalHours = records.reduce((s, r) => s + r.totalHours, 0);
    const uniqueVolunteers = new Set(records.map(r => r.volunteerId)).size;
    const uniqueOpps = new Set(records.map(r => r.opportunityId)).size;
    const avgHours = uniqueVolunteers > 0 ? totalHours / uniqueVolunteers : 0;

    const byOpp = records.reduce<Record<string, { title: string; records: AttendanceSummary[] }>>((acc, r) => {
        if (!acc[r.opportunityId]) acc[r.opportunityId] = { title: r.opportunityTitle, records: [] };
        acc[r.opportunityId].records.push(r);
        return acc;
    }, {});

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-stone-800">Hours Report</h1>
                    <p className="text-stone-500 mt-1">Export volunteer hours for accreditation and compliance.</p>
                </div>
                {fetched && records.length > 0 && (
                    <button onClick={handleExportCsv} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-36">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">From</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                </div>
                <div className="flex-1 min-w-36">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">To</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                </div>
                <button onClick={fetchReport} disabled={loading} className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2 text-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                    {loading ? 'Loading...' : 'Generate Report'}
                </button>
            </div>

            {error && <div className="bg-rose-50 text-rose-600 rounded-2xl px-5 py-4 text-sm font-medium border border-rose-200">{error}</div>}

            {fetched && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Hours', value: totalHours.toFixed(1), unit: 'hrs', cls: 'bg-blue-50 border-blue-100', valCls: 'text-blue-700' },
                            { label: 'Volunteers', value: String(uniqueVolunteers), unit: 'people', cls: 'bg-violet-50 border-violet-100', valCls: 'text-violet-700' },
                            { label: 'Events', value: String(uniqueOpps), unit: 'events', cls: 'bg-orange-50 border-orange-100', valCls: 'text-orange-600' },
                            { label: 'Avg Hours', value: avgHours.toFixed(1), unit: '/volunteer', cls: 'bg-emerald-50 border-emerald-100', valCls: 'text-emerald-700' },
                        ].map(c => (
                            <div key={c.label} className={`rounded-2xl p-5 ${c.cls} border`}>
                                <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{c.label}</p>
                                <p className={`text-3xl font-extrabold ${c.valCls}`}>{c.value}</p>
                                <p className="text-xs font-medium text-stone-400 mt-0.5">{c.unit}</p>
                            </div>
                        ))}
                    </div>

                    {records.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center text-stone-400 border border-stone-100">No completed attendance records found for this period.</div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(byOpp).map(([oppId, { title, records: oppRecords }]) => {
                                const oppHours = oppRecords.reduce((s, r) => s + r.totalHours, 0);
                                return (
                                    <div key={oppId} className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                                        <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                                            <h3 className="font-bold text-stone-800">{title}</h3>
                                            <span className="text-sm font-bold text-orange-600">{oppHours.toFixed(1)} hrs - {oppRecords.length} volunteer{oppRecords.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="divide-y divide-stone-50">
                                            {oppRecords.map(r => (
                                                <div key={r.attendanceId} className="flex items-center justify-between px-6 py-3 text-sm">
                                                    <span className="font-medium text-stone-700">{r.volunteerName}</span>
                                                    <div className="flex items-center gap-4 text-stone-400 text-xs">
                                                        <span>{r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '-'}</span>
                                                        <span className="font-bold text-stone-600">{r.totalHours.toFixed(2)} hrs</span>
                                                        <span className={'px-2 py-0.5 rounded-full font-bold ' + (r.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500')}>{r.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Volunteer Roster ─────────────────────────────────────────────────────────

const BGC_CHIP: Record<string, string> = {
    NotSubmitted: 'bg-stone-100 text-stone-500',
    Pending:      'bg-yellow-100 text-yellow-700',
    Cleared:      'bg-emerald-100 text-emerald-700',
    Expired:      'bg-rose-100 text-rose-700',
};

export function CoordVolunteers() {
    const auth = useAuth();
    const [volunteers, setVolunteers] = useState<OrgVolunteerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'engaged' | 'following'>('engaged');

    useEffect(() => {
        if (!auth.linkedGrainId) return;
        setLoading(true);
        organizationService.getVolunteers(auth.linkedGrainId)
            .then(setVolunteers)
            .catch(e => setError(e?.response?.data?.error ?? 'Failed to load volunteers'))
            .finally(() => setLoading(false));
    }, [auth.linkedGrainId]);

    const engaged = volunteers.filter(v => v.relationship === 'Engaged' || v.relationship === 'Both');
    const following = volunteers.filter(v => v.relationship === 'Following' || v.relationship === 'Both');
    const shown = tab === 'engaged' ? engaged : following;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-stone-800">Volunteer Roster</h1>
                <p className="text-stone-500 text-sm mt-1">Volunteers engaged with your org's events, and those who follow your organization.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Volunteers', value: new Set(volunteers.map(v => v.grainId)).size, color: 'text-orange-600' },
                    { label: 'Engaged', value: engaged.length, color: 'text-blue-600' },
                    { label: 'Following', value: following.length, color: 'text-purple-600' },
                    { label: 'BGC Cleared', value: volunteers.filter(v => v.backgroundCheckStatus === 'Cleared').length, color: 'text-emerald-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                        <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-stone-200 pb-0">
                {(['engaged', 'following'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-colors capitalize ${tab === t ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        {t === 'engaged' ? `Engaged (${engaged.length})` : `Following (${following.length})`}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
            ) : error ? (
                <div className="bg-rose-50 text-rose-700 rounded-2xl px-5 py-4 text-sm font-medium">{error}</div>
            ) : shown.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{tab === 'engaged' ? 'No volunteers have engaged with your events yet.' : 'No volunteers are following your organization yet.'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {shown.map(v => (
                        <div key={v.grainId} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-stone-800">{v.name || '(No name)'}</p>
                                    {(v.relationship === 'Both') && (
                                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Heart className="w-3 h-3 fill-current" /> Also following
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-stone-400 mt-0.5">{v.email}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                {tab === 'engaged' && (
                                    <>
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold">{v.orgHours.toFixed(1)} hrs</span>
                                        <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-bold">{v.orgEventsAttended} event{v.orgEventsAttended !== 1 ? 's' : ''}</span>
                                    </>
                                )}
                                <span className={`px-2.5 py-1 rounded-full font-bold ${BGC_CHIP[v.backgroundCheckStatus] ?? BGC_CHIP.NotSubmitted}`}>
                                    BGC: {v.backgroundCheckStatus}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full font-bold ${v.hasWaiver ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {v.hasWaiver ? '✓ Waiver' : '⚠ No Waiver'}
                                </span>
                                <span className="bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full font-bold">{v.skillCount} skill{v.skillCount !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
