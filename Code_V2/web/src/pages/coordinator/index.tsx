import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Briefcase, Clock, Award, Users, Plus, Loader2, AlertCircle, ChevronLeft, Star, X, CheckCircle2, XCircle, Pencil, Trash2, ExternalLink } from 'lucide-react';
import type { ViewName, OpportunitySummary, ApplicationSummary, CertificateTemplate, OrgState, OpportunityState, Shift, Skill } from '../../types';
import { OrgRole, ApplicationStatus, OpportunityStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { organizationService } from '../../services/organizations';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { certificateService } from '../../services/certificates';
import { skillService } from '../../services/skills';
import { attendanceService } from '../../services/attendance';
import { MiniCalendar } from '../../components/MiniCalendar';
const MapPicker = lazy(() => import('../../components/MapPicker'));

function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }

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
function getErr(err: any, fallback: string): string { const d = err?.response?.data; if (!d) return fallback; if (typeof d === 'string') return d || fallback; return String(d.error || d.message || d.title || fallback); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CoordDashboardProps { onNavigate: (view: ViewName) => void; }
export function CoordDashboard({ onNavigate }: CoordDashboardProps) {
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
        { key: 'Draft', label: 'Draft', count: opps.filter(o => o.status === 'Draft').length, color: 'bg-stone-500' },
        { key: 'Published', label: 'Published', count: opps.filter(o => o.status === 'Published').length, color: 'bg-emerald-500' },
        { key: 'Completed', label: 'Completed', count: opps.filter(o => o.status === 'Completed').length, color: 'bg-blue-500' },
        { key: 'Cancelled', label: 'Cancelled', count: opps.filter(o => o.status === 'Cancelled').length, color: 'bg-rose-500' },
    ];
    const appStatusCounts = [
        { key: 'Pending', label: 'Pending', count: apps.filter(a => a.status === 'Pending').length, color: 'bg-amber-400' },
        { key: 'Approved', label: 'Approved', count: apps.filter(a => a.status === 'Approved').length, color: 'bg-emerald-500' },
        { key: 'Waitlisted', label: 'Waitlisted', count: apps.filter(a => a.status === 'Waitlisted' || a.status === 'Promoted').length, color: 'bg-blue-500' },
        { key: 'Rejected', label: 'Rejected', count: apps.filter(a => a.status === 'Rejected').length, color: 'bg-rose-500' },
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

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-extrabold text-stone-800">{org.name}</h1>
                    {org.description && <p className="text-stone-500 mt-1 text-lg">{org.description}</p>}
                </div>
                {isApproved && isPrimaryCoord && (
                    <button onClick={() => { setEditName(org.name); setEditDesc(org.description || ''); setShowEdit(true); }}
                        className="px-4 py-2.5 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 text-sm">
                        ✏️ Edit Organization
                    </button>
                )}
            </div>

            {/* Status Banner */}
            <div className={`flex items-start gap-4 p-5 rounded-2xl border ${status.bg}`}>
                <span className="text-2xl">{status.icon}</span>
                <div>
                    <p className={`font-bold ${status.color}`}>{org.status}</p>
                    <p className="text-stone-500 text-sm mt-0.5">{status.msg}</p>
                </div>
            </div>

            {/* Submission details for pending orgs */}
            {org.status === 'PendingApproval' && (
                <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Submission Details</p>
                        <button onClick={() => openResubmitForm(true)} className="text-sm text-orange-500 font-bold hover:underline flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" /> Edit Submission
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-stone-500 font-medium">Name: </span><span className="text-stone-800 font-bold">{org.name}</span></div>
                        <div><span className="text-stone-500 font-medium">Description: </span><span className="text-stone-700">{org.description || '—'}</span></div>
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

            {/* Rejected actions */}
            {org.status === 'Rejected' && (
                <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-3">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">What would you like to do?</p>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => openResubmitForm(true)} className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 text-sm">
                            ✏️ Edit & Resubmit
                        </button>
                        <button onClick={() => openResubmitForm(false)} className="px-5 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 text-sm">
                            🆕 New Application
                        </button>
                    </div>
                </div>
            )}

            {/* Restricted notice */}
            {!isApproved && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-amber-500 text-xl">🔒</span>
                    <p className="text-amber-700 text-sm font-medium">Creating events, inviting members, and other actions require admin approval first.</p>
                </div>
            )}

            {/* Stats */}
            {isApproved && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Active Events', val: String(opps.filter(o => o.status === 'Published').length), icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50', target: 'manage_events' as ViewName },
                            { label: 'Pending Applications', val: String(pendingApps), icon: Users, color: 'text-amber-500', bg: 'bg-amber-50', target: 'org_applications' as ViewName },
                            { label: 'Total Applicants', val: String(apps.length), icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50', target: 'org_applications' as ViewName },
                            { label: 'Members', val: String(org.members?.length ?? 0), icon: Award, color: 'text-rose-500', bg: 'bg-rose-50', target: 'org_members' as ViewName },
                        ].map((s, i) => (
                            <button key={i} onClick={() => onNavigate(s.target)} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
                                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}><s.icon className="w-6 h-6" /></div>
                                <h3 className="text-3xl font-extrabold text-stone-800">{s.val}</h3>
                                <p className="text-sm font-bold text-stone-400 uppercase tracking-wide mt-1">{s.label}</p>
                            </button>
                        ))}
                    </div>

                    {/* Calendar & Activities */}
                    <div className="flex flex-col lg:flex-row gap-6 mt-8">
                        <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-stone-100 flex flex-col justify-center items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2">
                                <Star className="w-10 h-10 fill-current" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-stone-800">Your Impact Hub</h2>
                            <p className="text-stone-500 max-w-md mx-auto">Track your organization's ongoing events, review new volunteer applications, and confirm attendance all in one place. Use the calendar to see days with active shifts.</p>
                        </div>
                        <div className="w-full lg:w-80 shrink-0">
                            <MiniCalendar eventDates={apps.map(a => new Date(a.shiftStartTime))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-xl font-extrabold text-stone-800 mb-5">Event Pipeline</h3>
                            <div className="space-y-4">
                                {oppStatusCounts.map(s => {
                                    const pct = totalOpps === 0 ? 0 : Math.round((s.count / totalOpps) * 100);
                                    return (
                                        <div key={s.key}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-semibold text-stone-700">{s.label}</span>
                                                <span className="text-stone-500">{s.count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                                                <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-xl font-extrabold text-stone-800 mb-5">Application Funnel</h3>
                            <div className="space-y-4">
                                {appStatusCounts.map(s => {
                                    const pct = totalApps === 0 ? 0 : Math.round((s.count / totalApps) * 100);
                                    return (
                                        <div key={s.key}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-semibold text-stone-700">{s.label}</span>
                                                <span className="text-stone-500">{s.count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                                                <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-xl font-extrabold text-stone-800 mb-5">Top Categories</h3>
                            {categoryCounts.length === 0 ? (
                                <p className="text-sm text-stone-400">No event categories yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {categoryCounts.map(([category, count]) => (
                                        <div key={category} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                                            <span className="text-sm font-semibold text-stone-700">{category}</span>
                                            <span className="text-xs font-bold text-stone-500">{count} event{count > 1 ? 's' : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-xl font-extrabold text-stone-800 mb-5">Upcoming Workload</h3>
                            {upcomingWorkload.length === 0 ? (
                                <p className="text-sm text-stone-400">No upcoming volunteer shifts yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingWorkload.map(app => (
                                        <div key={app.applicationId} className="border border-stone-100 rounded-2xl p-4">
                                            <p className="font-semibold text-stone-800">{app.opportunityTitle}</p>
                                            <p className="text-xs text-stone-500 mt-1">{app.shiftName} · {formatDateTime(app.shiftStartTime)}</p>
                                            <p className="text-xs text-stone-400 mt-1">Volunteer: {app.volunteerName}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
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
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ title: '', description: '', category: '', lat: 43.6532, lon: -79.3832, radius: 200 });
    const [creating, setCreating] = useState(false);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [recoveringId, setRecoveringId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) { setLoading(false); return; }
        setLoading(true); setError('');
        try {
            const data = await organizationService.getOpportunities(auth.linkedGrainId);
            setOpps(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load events'));
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);
    const refreshSoon = () => setTimeout(() => { void load(); }, 900);

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
            setCreateForm({ title: '', description: '', category: '', lat: 43.6532, lon: -79.3832, radius: 200 });
            
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
                {isOrgApproved && (
                    <button onClick={() => { setShowCreate(!showCreate); setError(''); }} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2"><Plus className="w-5 h-5" /> Create Opportunity</button>
                )}
            </div>
            <OrgPendingBanner />
            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <h3 className="text-lg font-bold text-stone-800">New Opportunity</h3>
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

                    <div className="flex gap-3 justify-end mt-4">
                        <button onClick={() => { setShowCreate(false); setError(''); }} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                        <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}Create
                        </button>
                    </div>
                </div>
            )}
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
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
                                        </div>
                                    </td>
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
// COORDINATOR APPLICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordApplications() {
    const auth = useAuth();
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);
    const [toast, setToast] = useState('');

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

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-emerald-100 text-emerald-700',
        Rejected: 'bg-rose-100 text-rose-700', Waitlisted: 'bg-blue-100 text-blue-700',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <div><h1 className="text-3xl font-extrabold text-stone-800">Review Applications</h1><p className="text-stone-500 mt-2 text-lg">Approve or reject volunteer requests.</p></div>
            <OrgPendingBanner />
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : apps.length === 0 ? <Empty msg="No applications to review." /> : (
                <div className="grid gap-4">
                    {apps.map(app => (
                        <div key={app.applicationId} className={`bg-white rounded-2xl p-6 shadow-sm border flex items-center justify-between ${actionId === app.applicationId ? 'border-orange-200 opacity-70' : 'border-stone-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500">{app.volunteerName?.charAt(0) || '?'}</div>
                                <div>
                                    <h3 className="font-bold text-stone-800">{app.volunteerName} <span className="text-sm font-medium text-stone-400">applied for</span> {app.opportunityTitle}</h3>
                                    <p className="text-sm text-stone-400 mt-1">Shift: {app.shiftName} · Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-bold rounded ${statusColors[app.status] || 'bg-stone-100 text-stone-600'}`}>{app.status}</span>
                                    {actionId === app.applicationId && <p className="text-xs text-orange-600 font-semibold mt-2">Processing review...</p>}
                                </div>
                            </div>
                            {app.status === 'Pending' && (
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => handleReject(app.applicationId)} disabled={actionId === app.applicationId} className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 disabled:opacity-50 flex items-center gap-1">
                                        {actionId === app.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Reject
                                    </button>
                                    <button onClick={() => handleApprove(app.applicationId)} disabled={actionId === app.applicationId} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1">
                                        {actionId === app.applicationId && <Loader2 className="w-3 h-3 animate-spin" />} Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
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
                {isOrgApproved && (
                    <button onClick={() => setShowInvite(!showInvite)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Invite Member
                    </button>
                )}
            </div>

            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <OrgPendingBanner />

            {showInvite && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <h3 className="text-lg font-bold text-stone-800">Invite Member</h3>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Email Address</label>
                            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="volunteer@email.com" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
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
                    const visibleMembers = org?.members ?? [];
                    return visibleMembers.length ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                                    <tr><th className="p-5 font-bold">Email</th><th className="p-5 font-bold">Role</th><th className="p-5 font-bold">Joined</th><th className="p-5 font-bold text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {visibleMembers.map((m, idx) => (
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
interface CoordOppDetailProps { oppId: string; onBack: () => void; }
export function CoordOpportunityDetail({ oppId, onBack }: CoordOppDetailProps) {
    const auth = useAuth();
    const [opp, setOpp] = useState<OpportunityState | null>(null);
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    // Add Shift
    const [showAddShift, setShowAddShift] = useState(false);
    const [shiftName, setShiftName] = useState('');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [shiftCap, setShiftCap] = useState('10');
    const [addingShift, setAddingShift] = useState(false);

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
            const [d, a] = await Promise.all([opportunityService.getById(oppId), applicationService.getForOpportunity(oppId)]);
            setOpp(d); setApps(a);
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
            await opportunityService.addShift(oppId, { name: shiftName, startTime: new Date(shiftStart).toISOString(), endTime: new Date(shiftEnd).toISOString(), maxCapacity: parseInt(shiftCap) || 10 });
            setShowAddShift(false); setShiftName(''); setShiftStart(''); setShiftEnd(''); setShiftCap('10');
            showToast('Shift added!'); refreshSoon();
        } catch (err: any) { showToast(getErr(err, 'Failed')); }
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
    const doConfirm = async (app: ApplicationSummary) => {
        setActionId(app.volunteerId + '_a');
        try {
            // Look up the attendance record for this volunteer in this opportunity
            const records = await attendanceService.getByOpportunity(app.opportunityId);
            const record = records.find(r => r.volunteerId === app.volunteerId);
            if (!record) { showToast('No attendance record found — volunteer must check in first'); return; }
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

    const pendingApps = apps.filter(a => a.status === 'Pending');
    const confirmedApps = apps.filter(a => a.status === 'Approved' || a.status === 'Promoted');
    const statusColors: Record<string, string> = { Published: 'bg-emerald-100 text-emerald-700', Draft: 'bg-stone-100 text-stone-500', InProgress: 'bg-blue-100 text-blue-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-rose-100 text-rose-700' };

    const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) =>
        !show ? null : (
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
                    </div>
                    {opp.requiredSkillIds && opp.requiredSkillIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100">
                            <span className="text-xs font-bold text-stone-400 self-center mr-1">Required Skills:</span>
                            {opp.requiredSkillIds.map(id => {
                                const skill = displaySkills.find(s => s.id === id);
                                return skill ? <span key={id} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold border border-orange-200">{skill.name}</span> : null;
                            })}
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
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowAddShift(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-200">Cancel</button>
                                <button onClick={doAddShift} disabled={addingShift || !shiftName || !shiftStart || !shiftEnd} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-2">{addingShift && <Loader2 className="w-3 h-3 animate-spin" />} Add</button>
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

                {/* Confirmed Volunteers */}
                {confirmedApps.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                        <h2 className="text-xl font-bold text-stone-800 mb-4">Confirmed Volunteers ({confirmedApps.length})</h2>
                        {confirmedApps.map(app => (
                            <div key={app.applicationId} className="flex items-start justify-between py-3 border-b border-stone-50 last:border-0">
                                <div><p className="font-bold text-stone-800">{app.volunteerName || app.volunteerId.substring(0, 12)}</p><p className="text-sm text-stone-400">{app.shiftName}</p></div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {app.attendanceStatus === 'Confirmed' ? (
                                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm">✅ Confirmed</span>
                                    ) : app.attendanceStatus === 'CheckedOut' || app.attendanceStatus === 'Resolved' ? (
                                        <button onClick={() => doConfirm(app)} disabled={actionId === app.volunteerId + '_a'} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-100 disabled:opacity-50">Confirm Attend</button>
                                    ) : (
                                        <span className="px-3 py-1.5 bg-stone-100 text-stone-400 rounded-lg text-sm">Awaiting Check-in</span>
                                    )}
                                    {app.attendanceStatus !== 'Confirmed' && (
                                        <button onClick={() => doNoShow(app.applicationId)} disabled={actionId === app.applicationId + '_ns'} className="px-3 py-1.5 bg-stone-100 text-stone-500 font-bold rounded-lg text-sm hover:bg-stone-200 disabled:opacity-50">No-Show</button>
                                    )}
                                    {app.attendanceStatus === 'Confirmed' && (
                                        <button 
                                            onClick={() => openCert(app.volunteerId, app.volunteerName || app.volunteerId)} 
                                            disabled={issuedCerts.has(app.volunteerId)}
                                            className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-lg text-sm hover:bg-amber-100 flex items-center gap-1 disabled:opacity-50 disabled:bg-stone-100 disabled:text-stone-400">
                                            <Award className="w-3.5 h-3.5" /> {issuedCerts.has(app.volunteerId) ? 'Issued' : 'Certificate'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>)}

            {/* Edit Info Modal */}
            <Modal show={showEdit} onClose={() => setShowEdit(false)} title="Edit Opportunity">
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
            </Modal>

            <Modal show={showCancel} onClose={() => setShowCancel(false)} title="Cancel Event">
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason (required)" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-rose-500 outline-none resize-none" />
                <div className="flex gap-3 justify-end"><button onClick={() => setShowCancel(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Back</button><button onClick={doCancelSubmit} disabled={!cancelReason || cancelling} className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2">{cancelling && <Loader2 className="w-4 h-4 animate-spin" />} Confirm</button></div>
            </Modal>

            <Modal show={showSkills} onClose={() => setShowSkills(false)} title="Required Skills">
                <div className="max-h-56 overflow-y-auto flex flex-wrap gap-2">
                    {allSkills.map((s: Skill) => { const sel = selSkillIds.has(s.id); return <button key={s.id} onClick={() => setSelSkillIds(p => { const n = new Set(p); sel ? n.delete(s.id) : n.add(s.id); return n; })} className={`px-4 py-2 rounded-full font-bold text-sm border transition-all ${sel ? 'bg-orange-500 text-white border-orange-500' : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300'}`}>{sel && '✓ '}{s.name}</button>; })}
                    {allSkills.length === 0 && <p className="text-stone-400 text-sm">No skills in system.</p>}
                </div>
                <div className="flex gap-3 justify-end"><button onClick={() => setShowSkills(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button><button onClick={doSaveSkills} disabled={savingSkills} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">{savingSkills && <Loader2 className="w-4 h-4 animate-spin" />} Save</button></div>
            </Modal>

            <Modal show={showCert} onClose={() => setShowCert(false)} title="Issue Certificate">
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
            </Modal>
        </div>
    );
}
