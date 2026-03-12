import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Clock, Award, Users, Plus, Loader2, AlertCircle, ChevronLeft, Star, X, CheckCircle2, XCircle } from 'lucide-react';
import type { OpportunitySummary, ApplicationSummary, CertificateTemplate, OrgState, OpportunityState, Shift, Skill } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { organizationService } from '../../services/organizations';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { certificateService } from '../../services/certificates';
import { skillService } from '../../services/skills';
import { attendanceService } from '../../services/attendance';


function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" /><p className="text-rose-700 font-medium">{msg}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}</div>);
}
function Empty({ msg }: { msg: string }) { return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COORDINATOR DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CoordDashboard() {
    const auth = useAuth();
    const [org, setOrg] = useState<OrgState | null>(null);
    const [opps, setOpps] = useState<OpportunitySummary[]>([]);
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const [o, ops, ap] = await Promise.all([
                organizationService.getById(auth.linkedGrainId),
                organizationService.getOpportunities(auth.linkedGrainId),
                organizationService.getApplications(auth.linkedGrainId),
            ]);
            setOrg(o);
            setOpps(ops);
            setApps(ap);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load organization data');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;

    const pendingApps = apps.filter(a => a.status === 'Pending').length;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Organization Overview</h1><p className="text-stone-500 mt-2 text-lg">{org?.name || 'Your Organization'}</p></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Opportunities', val: String(opps.filter(o => o.status === 'Published').length), icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Pending Applications', val: String(pendingApps), icon: Users, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Total Applicants', val: String(apps.length), icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Members', val: String(org?.members?.length ?? 0), icon: Award, color: 'text-rose-500', bg: 'bg-rose-50' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}><s.icon className="w-6 h-6" /></div>
                        <h3 className="text-3xl font-extrabold text-stone-800">{s.val}</h3>
                        <p className="text-sm font-bold text-stone-400 uppercase tracking-wide mt-1">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANAGE EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CoordManageEventsProps { onViewDetail?: (id: string) => void; }
export function CoordManageEvents({ onViewDetail }: CoordManageEventsProps = {}) {
    const auth = useAuth();
    const [opps, setOpps] = useState<OpportunitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ title: '', description: '', category: '' });
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await organizationService.getOpportunities(auth.linkedGrainId);
            setOpps(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load events');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!auth.linkedGrainId || !createForm.title) return;
        setCreating(true);
        try {
            await organizationService.createOpportunity(auth.linkedGrainId, createForm);
            setShowCreate(false);
            setCreateForm({ title: '', description: '', category: '' });
            load();
        } catch (err: any) {
            setError(err.response?.data || 'Failed to create opportunity');
        } finally { setCreating(false); }
    };

    const handlePublish = async (id: string) => {
        try {
            await opportunityService.publish(id);
            load();
        } catch (err: any) {
            setError(err.response?.data || 'Failed to publish');
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
                <button onClick={() => setShowCreate(!showCreate)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2"><Plus className="w-5 h-5" /> Create Opportunity</button>
            </div>
            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <h3 className="text-lg font-bold text-stone-800">New Opportunity</h3>
                    <input placeholder="Title" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <input placeholder="Category (e.g. Environment)" value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <textarea placeholder="Description" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={3} />
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                        <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}Create
                        </button>
                    </div>
                </div>
            )}
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : opps.length === 0 ? <Empty msg="No opportunities yet. Create your first one!" /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">Event Title</th><th className="p-5 font-bold">Category</th><th className="p-5 font-bold">Status</th><th className="p-5 font-bold">Spots</th><th className="p-5 font-bold">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {opps.map(o => (
                                <tr key={o.opportunityId} className="hover:bg-orange-50/30 cursor-pointer" onClick={() => onViewDetail?.(o.opportunityId)}>
                                    <td className="p-5 text-stone-800 font-bold text-orange-700 hover:underline">{o.title} →</td>
                                    <td className="p-5 text-stone-500 font-medium">{o.category}</td>
                                    <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[o.status] || 'bg-stone-100 text-stone-600'}`}>{o.status}</span></td>
                                    <td className="p-5 text-stone-800 font-bold">{o.availableSpots} / {o.totalSpots}</td>
                                    <td className="p-5">
                                        {o.status === 'Draft' && <button onClick={() => handlePublish(o.opportunityId)} className="text-orange-500 font-bold text-sm hover:underline">Publish</button>}
                                        {o.status === 'Published' && <span className="text-emerald-500 font-bold text-sm">Active</span>}
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

    const load = useCallback(async () => {
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await organizationService.getApplications(auth.linkedGrainId);
            setApps(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load applications');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id: string) => {
        try { await applicationService.approve(id); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to approve'); }
    };

    const handleReject = async (id: string) => {
        try { await applicationService.reject(id, 'Application rejected.'); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to reject'); }
    };

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-700', Approved: 'bg-emerald-100 text-emerald-700',
        Rejected: 'bg-rose-100 text-rose-700', Waitlisted: 'bg-blue-100 text-blue-700',
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Review Applications</h1><p className="text-stone-500 mt-2 text-lg">Approve or reject volunteer requests.</p></div>
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : apps.length === 0 ? <Empty msg="No applications to review." /> : (
                <div className="grid gap-4">
                    {apps.map(app => (
                        <div key={app.applicationId} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500">{app.volunteerName?.charAt(0) || '?'}</div>
                                <div>
                                    <h3 className="font-bold text-stone-800">{app.volunteerName} <span className="text-sm font-medium text-stone-400">applied for</span> {app.opportunityTitle}</h3>
                                    <p className="text-sm text-stone-400 mt-1">Shift: {app.shiftName} · Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-bold rounded ${statusColors[app.status] || 'bg-stone-100 text-stone-600'}`}>{app.status}</span>
                                </div>
                            </div>
                            {app.status === 'Pending' && (
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => handleReject(app.applicationId)} className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100">Reject</button>
                                    <button onClick={() => handleApprove(app.applicationId)} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100">Approve</button>
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
        if (!auth.linkedGrainId) return;
        setLoading(true); setError('');
        try {
            const data = await organizationService.getById(auth.linkedGrainId);
            setOrg(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load organization');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

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
            load();
        } catch (err: any) {
            showToast(err.response?.data?.toString() || 'Failed to invite member');
        } finally { setInviting(false); }
    };

    const handleBlock = async (userId: string) => {
        if (!auth.linkedGrainId) return;
        try {
            await organizationService.blockVolunteer(auth.linkedGrainId, userId);
            showToast('Volunteer blocked');
            load();
        } catch { showToast('Failed to block volunteer'); }
    };

    const handleUnblock = async (userId: string) => {
        if (!auth.linkedGrainId) return;
        try {
            await organizationService.unblockVolunteer(auth.linkedGrainId, userId);
            showToast('Volunteer unblocked');
            load();
        } catch { showToast('Failed to unblock volunteer'); }
    };

    const roleColors: Record<string, string> = {
        Admin: 'bg-violet-100 text-violet-700',
        Coordinator: 'bg-blue-100 text-blue-700',
        Member: 'bg-stone-100 text-stone-600',
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Members</h1><p className="text-stone-500 mt-2 text-lg">Manage your organization's members.</p></div>
                <button onClick={() => setShowInvite(!showInvite)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Invite Member
                </button>
            </div>

            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

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

            {/* Tabs */}
            <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl w-fit">
                {(['members', 'blocked'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-5 py-2 rounded-xl font-bold text-sm transition-all capitalize ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                        {t === 'members' ? `Members (${org?.members?.length ?? 0})` : `Blocked (${org?.blockedVolunteerIds?.length ?? 0})`}
                    </button>
                ))}
            </div>

            {loading ? <Spinner /> : tab === 'members' ? (
                org?.members?.length ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                                <tr><th className="p-5 font-bold">Email</th><th className="p-5 font-bold">Role</th><th className="p-5 font-bold">Joined</th><th className="p-5 font-bold text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {org.members.map(m => (
                                    <tr key={m.userId} className="hover:bg-orange-50/30">
                                        <td className="p-5 text-stone-800 font-bold">{m.email}</td>
                                        <td className="p-5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${roleColors[m.role] || 'bg-stone-100 text-stone-600'}`}>{m.role}</span></td>
                                        <td className="p-5 text-stone-400 text-sm">{new Date(m.joinedAt).toLocaleDateString()}</td>
                                        <td className="p-5 text-right"><button onClick={() => handleBlock(m.userId)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Block</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <Empty msg="No members yet. Use the Invite button to add some." />
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
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', primaryColor: '#F59E0B', accentColor: '#EA580C' });
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await certificateService.getTemplates(auth.linkedGrainId || undefined);
            setTemplates(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load templates');
        } finally { setLoading(false); }
    }, [auth.linkedGrainId]);

    useEffect(() => { load(); }, [load]);

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
            load();
        } catch (err: any) {
            setError(err.response?.data || 'Failed to create template');
        } finally { setCreating(false); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Certificate Templates</h1><p className="text-stone-500 mt-2 text-lg">Manage your organization's certificate designs.</p></div>
                <button onClick={() => setShowCreate(!showCreate)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2"><Plus className="w-5 h-5" /> New Template</button>
            </div>
            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-4">
                    <input placeholder="Template Name" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
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
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : templates.length === 0 ? <Empty msg="No templates yet." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates.map(t => (
                        <div key={t.id} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primaryColor }}></div>
                                <h3 className="font-bold text-stone-800">{t.name}</h3>
                                {t.isSystemPreset && <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-xs font-bold rounded">System</span>}
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

    // Skills
    const [showSkills, setShowSkills] = useState(false);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [selSkillIds, setSelSkillIds] = useState<Set<string>>(new Set());
    const [savingSkills, setSavingSkills] = useState(false);

    // Certificate
    const [showCert, setShowCert] = useState(false);
    const [certTemplates, setCertTemplates] = useState<CertificateTemplate[]>([]);
    const [certTargetId, setCertTargetId] = useState<string | null>(null);
    const [certTargetName, setCertTargetName] = useState('');
    const [selTemplate, setSelTemplate] = useState<string | null>(null);
    const [issuingCert, setIssuingCert] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [d, a] = await Promise.all([opportunityService.getById(oppId), applicationService.getForOpportunity(oppId)]);
            setOpp(d); setApps(a);
        } catch (err: any) { setError(err.response?.data || 'Failed to load'); }
        finally { setLoading(false); }
    }, [oppId]);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const doPublish = async () => {
        setActionId('pub');
        try { await opportunityService.publish(oppId); showToast('Published ✅'); load(); }
        catch (err: any) { showToast(err.response?.data?.toString() || 'Failed to publish'); }
        finally { setActionId(null); }
    };

    const doCancelSubmit = async () => {
        if (!cancelReason) return; setCancelling(true);
        try { await opportunityService.cancel(oppId, cancelReason); setShowCancel(false); showToast('Cancelled'); load(); }
        catch (err: any) { showToast(err.response?.data?.toString() || 'Failed'); }
        finally { setCancelling(false); }
    };

    const doAddShift = async () => {
        if (!shiftName || !shiftStart || !shiftEnd) return; setAddingShift(true);
        try {
            await opportunityService.addShift(oppId, { name: shiftName, startTime: new Date(shiftStart).toISOString(), endTime: new Date(shiftEnd).toISOString(), maxCapacity: parseInt(shiftCap) || 10 });
            setShowAddShift(false); setShiftName(''); setShiftStart(''); setShiftEnd(''); setShiftCap('10');
            showToast('Shift added!'); load();
        } catch (err: any) { showToast(err.response?.data?.toString() || 'Failed'); }
        finally { setAddingShift(false); }
    };

    const openSkills = async () => {
        try { const l = await skillService.getAll(); setAllSkills(l); setSelSkillIds(new Set(opp?.requiredSkillIds || [])); setShowSkills(true); }
        catch { showToast('Failed to load skills'); }
    };

    const doSaveSkills = async () => {
        setSavingSkills(true);
        try { await skillService.setRequiredSkills(oppId, Array.from(selSkillIds)); setShowSkills(false); showToast('Skills updated'); load(); }
        catch { showToast('Failed'); }
        finally { setSavingSkills(false); }
    };

    const doApprove = async (id: string) => { setActionId(id); try { await applicationService.approve(id); showToast('Approved ✅'); load(); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doReject = async (id: string) => { setActionId(id); try { await applicationService.reject(id, 'Rejected'); showToast('Rejected'); load(); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doNoShow = async (appId: string) => { setActionId(appId + '_ns'); try { await applicationService.markNoShow(appId); showToast('No-show marked'); load(); } catch { showToast('Failed'); } finally { setActionId(null); } };
    const doConfirm = async (vid: string) => { setActionId(vid + '_a'); try { await attendanceService.confirm(vid, { supervisorId: oppId, rating: 5 }); showToast('Attendance confirmed'); } catch { showToast('Failed'); } finally { setActionId(null); } };

    const openCert = async (vid: string, name: string) => {
        try { const l = await certificateService.getTemplates(); setCertTemplates(l); setSelTemplate(l.length > 0 ? l[0].id : null); setCertTargetId(vid); setCertTargetName(name); setShowCert(true); }
        catch { showToast('Failed to load templates'); }
    };

    const doIssueCert = async () => {
        if (!certTargetId || !selTemplate) return; setIssuingCert(true);
        try { const r = await certificateService.generate(certTargetId, selTemplate); setShowCert(false); showToast(`Certificate issued: ${r.fileName}`); window.open(r.downloadUrl, '_blank'); }
        catch (err: any) { showToast(err.response?.data?.toString() || 'Failed'); }
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
                        <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${statusColors[opp.status] || 'bg-stone-100 text-stone-500'}`}>{opp.status}</span>
                    </div>
                    <p className="text-orange-500 text-sm font-bold mb-4">{opp.info.category}</p>
                    <p className="text-stone-600 leading-relaxed mb-6">{opp.info.description}</p>
                    <div className="flex flex-wrap gap-3">
                        {opp.status === 'Draft' && <button onClick={doPublish} disabled={actionId === 'pub'} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-60 flex items-center gap-2">{actionId === 'pub' && <Loader2 className="w-4 h-4 animate-spin" />} Publish</button>}
                        {(opp.status === 'Draft' || opp.status === 'Published') && <button onClick={() => setShowCancel(true)} className="px-5 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 border border-rose-200">Cancel Event</button>}
                        <button onClick={openSkills} className="px-5 py-2.5 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 border border-orange-200 flex items-center gap-2"><Star className="w-4 h-4" /> Skills ({opp.requiredSkillIds?.length || 0})</button>
                    </div>
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
                                <div key={s.shiftId} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
                                    <div><p className="font-bold text-stone-800">{s.name}</p><p className="text-sm text-stone-400 mt-0.5">📅 {new Date(s.startTime).toLocaleString()} — {new Date(s.endTime).toLocaleString()}</p><p className="text-sm text-stone-400">👥 {s.currentCount}/{s.maxCapacity}</p></div>
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
                                    <button onClick={() => doConfirm(app.volunteerId)} disabled={actionId === app.volunteerId + '_a'} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm hover:bg-blue-100 disabled:opacity-50">Confirm Attend</button>
                                    <button onClick={() => doNoShow(app.applicationId)} disabled={actionId === app.applicationId + '_ns'} className="px-3 py-1.5 bg-stone-100 text-stone-500 font-bold rounded-lg text-sm hover:bg-stone-200 disabled:opacity-50">No-Show</button>
                                    <button onClick={() => openCert(app.volunteerId, app.volunteerName || app.volunteerId)} className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-lg text-sm hover:bg-amber-100 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Certificate</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>)}

            {/* Modals */}
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
