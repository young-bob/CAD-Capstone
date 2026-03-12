import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Clock, Award, Users, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { OpportunitySummary, ApplicationSummary, CertificateTemplate, OrgState } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { organizationService } from '../../services/organizations';
import { opportunityService } from '../../services/opportunities';
import { applicationService } from '../../services/applications';
import { certificateService } from '../../services/certificates';

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
export function CoordManageEvents() {
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
                                <tr key={o.opportunityId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{o.title}</td>
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
