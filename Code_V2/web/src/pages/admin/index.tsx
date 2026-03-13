import { useState, useEffect, useCallback } from 'react';
import { Users, Building, AlertTriangle, Calendar, User, Loader2, AlertCircle, Plus, Trash2, Pencil, X, Search, KeyRound } from 'lucide-react';
import { OrgRole } from '../../types';
import type { OrganizationSummary, UserRecord, DisputeSummary, Skill } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/admin';
import { organizationService } from '../../services/organizations';
import { attendanceService } from '../../services/attendance';
import { skillService } from '../../services/skills';

function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" /><p className="text-rose-700 font-medium">{msg}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}</div>);
}
function Empty({ msg }: { msg: string }) { return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>; }
function getErr(err: any, fallback: string): string { const d = err?.response?.data; if (!d) return fallback; if (typeof d === 'string') return d || fallback; return String(d.error || d.message || d.title || fallback); }
function getErrWithStatus(err: any, fallback: string): string { const status = err?.response?.status; const msg = getErr(err, fallback); return status ? `${msg} (HTTP ${status})` : msg; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminDashboard() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [pendingOrgs, setPendingOrgs] = useState<OrganizationSummary[]>([]);
    const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [u, o, d] = await Promise.all([
                adminService.getUsers(),
                adminService.getPendingOrganizations(),
                attendanceService.getPendingDisputes(),
            ]);
            setUsers(u || []);
            setPendingOrgs(o || []);
            setDisputes(d || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load dashboard data'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Platform Overview</h1><p className="text-stone-500 mt-2 text-lg">System-wide monitoring and controls.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', val: String(users.length), icon: Users, color: 'text-blue-500' },
                    { label: 'Pending Orgs', val: String(pendingOrgs.length), icon: Building, color: 'text-amber-500' },
                    { label: 'Active Disputes', val: String(disputes.length), icon: AlertTriangle, color: 'text-rose-500' },
                    { label: 'Banned Users', val: String(users.filter(u => u.isBanned).length), icon: Calendar, color: 'text-emerald-500' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-2xl bg-stone-50 ${s.color} flex items-center justify-center`}><s.icon className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-stone-800">{s.val}</h3>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h2 className="text-xl font-bold text-stone-800 mb-6">Recent Users</h2>
                <div className="space-y-4">
                    {users.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center gap-4 py-3 border-b border-stone-50 last:border-0">
                            <div className={`w-2.5 h-2.5 rounded-full ${u.isBanned ? 'bg-rose-500' : 'bg-emerald-500'} shrink-0`}></div>
                            <div className="flex-1">
                                <p className="text-stone-800 font-medium">{u.email}</p>
                                <p className="text-sm text-stone-400">{u.role} · {u.isBanned ? 'Banned' : 'Active'}</p>
                            </div>
                            <span className="text-xs text-stone-400 shrink-0">{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function OrgStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PendingApproval: 'bg-amber-100 text-amber-700',
        Approved: 'bg-emerald-100 text-emerald-700',
        Rejected: 'bg-rose-100 text-rose-700',
        Suspended: 'bg-stone-100 text-stone-600',
    };
    return <span className={`px-2 py-0.5 text-xs font-bold rounded ${styles[status] ?? 'bg-stone-100 text-stone-600'}`}>{status}</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN ORGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminOrgs() {
    const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
    const [coordinators, setCoordinators] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', coordinatorUserId: '' });
    const [creating, setCreating] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{ id: string; name: string; description: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [reassignCoordId, setReassignCoordId] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [coordAction, setCoordAction] = useState(false);
    const [orgFilter, setOrgFilter] = useState({ search: '', status: '', dateFrom: '', dateTo: '' });

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [allOrgs, users] = await Promise.all([
                adminService.getAllOrganizations(),
                adminService.getUsers(),
            ]);
            setOrgs(allOrgs || []);
            setCoordinators((users || []).filter(u => u.role === 'Coordinator' && !u.isBanned));
        } catch (err: any) {
            setError(getErr(err, 'Failed to load organizations'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);
    const handleApprove = async (orgId: string) => {
        try { await adminService.approveOrg(orgId); showToast('Organization approved'); setTimeout(() => load(), 600); }
        catch (err: any) { showToast(getErr(err, 'Failed to approve')); }
    };

    const handleReject = async (orgId: string) => {
        try { await adminService.rejectOrg(orgId, 'Rejected by administrator.'); showToast('Organization rejected'); setTimeout(() => load(), 600); }
        catch (err: any) { showToast(getErr(err, 'Failed to reject')); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const coord = coordinators.find(c => c.id === createForm.coordinatorUserId);
        if (!createForm.name || !coord) return;
        setCreating(true);
        try {
            await organizationService.create({
                name: createForm.name,
                description: createForm.description,
                creatorUserId: coord.id,
                creatorEmail: coord.email,
            });
            setShowCreate(false);
            setCreateForm({ name: '', description: '', coordinatorUserId: '' });
            showToast('Organization created');
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to create organization'));
        } finally { setCreating(false); }
    };

    const handleSaveEdit = async () => {
        if (!editingOrg) return;
        setSaving(true);
        try {
            await organizationService.updateInfo(editingOrg.id, { name: editingOrg.name, description: editingOrg.description });
            setEditingOrg(null);
            showToast('Organization updated');
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to update organization'));
        } finally { setSaving(false); }
    };

    const handleDelete = async (orgId: string) => {
        try {
            await adminService.rejectOrg(orgId, 'Removed by administrator.');
            setDeleteConfirm(null);
            showToast('Organization removed');
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to remove organization'));
        }
    };

    const handleReassignCoord = async () => {
        if (!editingOrg || !reassignCoordId) return;
        setCoordAction(true);
        try {
            await adminService.reassignCoordinator(editingOrg.id, reassignCoordId);
            showToast('Coordinator reassigned');
            setReassignCoordId('');
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to reassign coordinator'));
        } finally { setCoordAction(false); }
    };

    const handleInviteCoord = async () => {
        if (!editingOrg || !inviteEmail.trim()) return;
        setCoordAction(true);
        try {
            await organizationService.inviteMember(editingOrg.id, { email: inviteEmail.trim(), role: OrgRole.Coordinator });
            showToast('Coordinator invited');
            setInviteEmail('');
        } catch (err: any) {
            showToast(getErr(err, 'Failed to invite coordinator'));
        } finally { setCoordAction(false); }
    };

    const filteredOrgs = orgs.filter(org => {
        if (orgFilter.search) {
            const q = orgFilter.search.toLowerCase();
            const coordEmail = coordinators.find(c => c.organizationId === org.orgId)?.email?.toLowerCase() ?? '';
            if (!org.name.toLowerCase().includes(q) && !coordEmail.includes(q)) return false;
        }
        if (orgFilter.status && org.status !== orgFilter.status) return false;
        if (orgFilter.dateFrom && new Date(org.createdAt) < new Date(orgFilter.dateFrom)) return false;
        if (orgFilter.dateTo && new Date(org.createdAt) > new Date(orgFilter.dateTo + 'T23:59:59')) return false;
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-stone-800">Organizations</h1>
                <button onClick={() => setShowCreate(v => !v)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Create Organization
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                    <h3 className="text-lg font-bold text-stone-800 mb-4">New Organization</h3>
                    {coordinators.length === 0 && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                            No Coordinator accounts found. A Coordinator must register first before an organization can be created.
                        </div>
                    )}
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Coordinator *</label>
                            <select value={createForm.coordinatorUserId} onChange={e => setCreateForm(p => ({ ...p, coordinatorUserId: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required>
                                <option value="">— Select coordinator —</option>
                                {coordinators.map(c => <option key={c.id} value={c.id}>{c.email}</option>)}
                            </select>
                            <p className="text-xs text-stone-400 mt-1">The coordinator will own and manage this organization.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Organization Name *</label>
                            <input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Green Earth Foundation" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                            <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the organization" rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button type="submit" disabled={creating || coordinators.length === 0} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                                {creating && <Loader2 className="w-4 h-4 animate-spin" />}Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {editingOrg && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-stone-800">Edit Organization</h3>
                        <button onClick={() => setEditingOrg(null)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Name</label>
                            <input value={editingOrg.name} onChange={e => setEditingOrg(p => p && ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                            <textarea value={editingOrg.description} onChange={e => setEditingOrg(p => p && ({ ...p, description: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                        </div>
                        <div className="border-t border-stone-100 pt-4">
                            <p className="text-sm font-bold text-stone-600 mb-3">Coordinator Management</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">
                                        Reassign Primary Coordinator
                                        {coordinators.find(c => c.organizationId === editingOrg.id) && (
                                            <span className="ml-2 text-stone-400 font-normal">Current: {coordinators.find(c => c.organizationId === editingOrg.id)?.email}</span>
                                        )}
                                    </label>
                                    <div className="flex gap-2">
                                        <select value={reassignCoordId} onChange={e => setReassignCoordId(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm">
                                            <option value="">— Select coordinator —</option>
                                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.email}{c.organizationName && c.organizationId !== editingOrg.id ? ` (${c.organizationName})` : c.organizationId === editingOrg.id ? ' ★ current' : ''}</option>)}
                                        </select>
                                        <button onClick={handleReassignCoord} disabled={!reassignCoordId || coordAction} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 text-sm flex items-center gap-1">
                                            {coordAction && <Loader2 className="w-3 h-3 animate-spin" />}Reassign
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">Invite Additional Coordinator (by email)</label>
                                    <div className="flex gap-2">
                                        <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="coordinator@example.com" className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                                        <button onClick={handleInviteCoord} disabled={!inviteEmail.trim() || coordAction} className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 disabled:opacity-50 text-sm">Invite</button>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1">The coordinator must already have an account.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setEditingOrg(null); setReassignCoordId(''); setInviteEmail(''); }} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                        <input value={orgFilter.search} onChange={e => setOrgFilter(p => ({ ...p, search: e.target.value }))} placeholder="Org name or coordinator email..." autoComplete="off" className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Status</label>
                    <select value={orgFilter.status} onChange={e => setOrgFilter(p => ({ ...p, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="">All</option>
                        <option value="PendingApproval">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">From</label>
                    <input type="date" value={orgFilter.dateFrom} onChange={e => setOrgFilter(p => ({ ...p, dateFrom: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">To</label>
                    <input type="date" value={orgFilter.dateTo} onChange={e => setOrgFilter(p => ({ ...p, dateTo: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                {(orgFilter.search || orgFilter.status || orgFilter.dateFrom || orgFilter.dateTo) && (
                    <button onClick={() => setOrgFilter({ search: '', status: '', dateFrom: '', dateTo: '' })} className="px-3 py-2 text-sm text-stone-400 hover:text-stone-600 font-medium flex items-center gap-1">
                        <X className="w-4 h-4" /> Clear
                    </button>
                )}
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : orgs.length === 0 ? <Empty msg="No organizations yet." /> : filteredOrgs.length === 0 ? <Empty msg="No organizations match the filter." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs text-stone-400 font-medium">
                        Showing {filteredOrgs.length} of {orgs.length} organizations
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr>
                                <th className="p-5 font-bold">Name</th>
                                <th className="p-5 font-bold">Coordinator</th>
                                <th className="p-5 font-bold">Status</th>
                                <th className="p-5 font-bold">Created</th>
                                <th className="p-5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredOrgs.map(org => (
                                <tr key={org.orgId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{org.name}</td>
                                    <td className="p-5 text-stone-500 text-sm">{coordinators.find(c => c.organizationId === org.orgId)?.email ?? <span className="text-stone-300">—</span>}</td>
                                    <td className="p-5"><OrgStatusBadge status={org.status} /></td>
                                    <td className="p-5 text-stone-500 text-sm">{new Date(org.createdAt).toLocaleDateString()}</td>
                                    <td className="p-5">
                                        <div className="flex justify-end gap-2 flex-wrap">
                                            {org.status === 'PendingApproval' && <>
                                                <button onClick={() => handleReject(org.orgId)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Reject</button>
                                                <button onClick={() => handleApprove(org.orgId)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-sm hover:bg-emerald-100">Approve</button>
                                            </>}
                                            <button onClick={() => setEditingOrg({ id: org.orgId, name: org.name, description: org.description })} className="p-1.5 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {deleteConfirm === org.orgId ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-rose-600 font-medium">Remove?</span>
                                                    <button onClick={() => handleDelete(org.orgId)} className="px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600">Yes</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">No</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(org.orgId)} className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
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
// ADMIN SKILLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseCsv(text: string): { name: string; category: string; description: string }[] {
    const lines = text.trim().split(/\r?\n/);
    return lines.slice(1) // skip header
        .map(line => {
            const [category = '', name = '', ...rest] = line.split(',');
            return { category: category.trim(), name: name.trim(), description: rest.join(',').trim() };
        })
        .filter(r => r.name && r.category);
}

export function AdminSkills() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', category: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [editForm, setEditForm] = useState({ name: '', category: '', description: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ name: string; status: string; reason?: string }[] | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await skillService.getAll();
            setSkills(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load skills'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.category.trim() || !form.description.trim()) {
            showToast('All fields are required');
            return;
        }
        setSubmitting(true);
        try {
            await skillService.createSkill({ name: form.name.trim(), category: form.category.trim(), description: form.description.trim() });
            setForm({ name: '', category: '', description: '' });
            showToast('Skill created');
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to create skill'));
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (skill: Skill) => {
        try {
            await skillService.deleteSkill(skill.id);
            setDeleteConfirm(null);
            showToast(`Deleted: ${skill.name}`);
            load();
        } catch { showToast('Failed to delete skill'); }
    };

    const startEditSkill = (skill: Skill) => {
        setEditingSkill(skill);
        setEditForm({ name: skill.name, category: skill.category, description: skill.description ?? '' });
        setDeleteConfirm(null);
    };

    const handleUpdateSkill = async () => {
        if (!editingSkill || !editForm.name.trim() || !editForm.category.trim()) return;
        setEditSaving(true);
        try {
            await skillService.updateSkill(editingSkill.id, { name: editForm.name.trim(), category: editForm.category.trim(), description: editForm.description.trim() });
            showToast('Skill updated');
            setEditingSkill(null);
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to update skill'));
        } finally { setEditSaving(false); }
    };

    const downloadTemplate = () => {
        const csv = 'Category,Name,Description\nMedical,First Aid,Basic first aid and CPR skills\nIT,Web Development,HTML/CSS/JavaScript development\nEducation,Tutoring,Academic tutoring for students\n';
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = 'skills_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true); setImportResult(null);
        try {
            const text = await importFile.text();
            const rows = parseCsv(text);
            if (rows.length === 0) { showToast('No valid rows found in CSV'); setImporting(false); return; }
            const result = await skillService.bulkImport(rows);
            setImportResult(result);
            const created = result.filter(r => r.status === 'Created').length;
            showToast(`Import complete: ${created} created, ${result.length - created} skipped`);
            setImportFile(null);
            load();
        } catch (err: any) {
            showToast(getErrWithStatus(err, 'Import failed'));
        } finally { setImporting(false); }
    };

    const byCategory = skills.reduce<Record<string, Skill[]>>((acc, s) => {
        (acc[s.category || 'General'] ??= []).push(s);
        return acc;
    }, {});

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div><h1 className="text-3xl font-extrabold text-stone-800">Skills Management</h1><p className="text-stone-500 mt-2 text-lg">Manage the platform skill catalog.</p></div>

            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h2 className="text-lg font-bold text-stone-800 mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500" /> Add New Skill</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Category</label>
                            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Medical, IT" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Skill Name</label>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. First Aid" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" rows={2} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" required />
                    </div>
                    <button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitting ? 'Creating...' : 'Create Skill'}
                    </button>
                </form>
            </div>

            {/* Bulk Import */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h2 className="text-lg font-bold text-stone-800 mb-2">Bulk Import via CSV</h2>
                <p className="text-sm text-stone-400 mb-5">Upload a CSV file to import multiple skills at once. Duplicates (by name) are skipped automatically.</p>
                <div className="mb-3">
                    <p className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-stone-500 inline-block">
                        CSV format: <strong>Category,Name,Description</strong> (first row is header)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={downloadTemplate} className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 text-sm">
                        Download Template
                    </button>
                    <label className="px-4 py-2 bg-stone-50 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-100 text-sm cursor-pointer">
                        {importFile ? importFile.name : 'Choose CSV file'}
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }} />
                    </label>
                    <button onClick={handleImport} disabled={!importFile || importing} className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 text-sm flex items-center gap-2">
                        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {importing ? 'Importing...' : 'Import'}
                    </button>
                </div>
                {importResult && (
                    <div className="mt-5 border border-stone-100 rounded-xl overflow-hidden">
                        <div className="bg-stone-50 px-4 py-2 text-xs font-bold text-stone-500 uppercase tracking-wide flex gap-6">
                            <span>✓ Created: {importResult.filter(r => r.status === 'Created').length}</span>
                            <span>⊘ Skipped: {importResult.filter(r => r.status === 'Skipped').length}</span>
                        </div>
                        <div className="divide-y divide-stone-50 max-h-48 overflow-y-auto">
                            {importResult.map((r, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                                    <span className="text-stone-700 font-medium">{r.name}</span>
                                    <span className={`text-xs font-bold ${r.status === 'Created' ? 'text-emerald-600' : 'text-stone-400'}`}>
                                        {r.status}{r.reason ? ` — ${r.reason}` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {editingSkill && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-stone-800">Edit Skill</h3>
                        <button onClick={() => setEditingSkill(null)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Category</label>
                            <input value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Skill Name</label>
                            <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
                        <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setEditingSkill(null)} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
                        <button onClick={handleUpdateSkill} disabled={editSaving || !editForm.name.trim() || !editForm.category.trim()} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 disabled:bg-orange-300">
                            {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}Save
                        </button>
                    </div>
                </div>
            )}

            {error && <ErrorBox msg={error} onRetry={load} />}
            {loading ? <Spinner /> : Object.keys(byCategory).length === 0 ? <Empty msg="No skills yet." /> : (
                <div className="space-y-6">
                    {Object.entries(byCategory).map(([category, catSkills]) => (
                        <div key={category} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                            <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-4">{category}</h3>
                            <div className="space-y-3">
                                {catSkills.map(skill => (
                                    <div key={skill.id} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
                                        <div>
                                            <p className="font-bold text-stone-800">{skill.name}</p>
                                            {skill.description && <p className="text-sm text-stone-400 mt-0.5">{skill.description}</p>}
                                        </div>
                                        {deleteConfirm === skill.id ? (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm text-rose-600 font-medium">Delete?</span>
                                                <button onClick={() => handleDelete(skill)} className="px-3 py-1.5 bg-rose-500 text-white font-bold rounded-lg text-sm hover:bg-rose-600">Yes</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 bg-stone-100 text-stone-600 font-bold rounded-lg text-sm hover:bg-stone-200">No</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => startEditSkill(skill)} className="p-2 text-stone-300 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteConfirm(skill.id)} className="p-2 text-stone-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN DISPUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminDisputes() {
    const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await attendanceService.getPendingDisputes();
            setDisputes(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load disputes'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleResolve = async (attendanceId: string) => {
        try {
            await adminService.resolveDispute(attendanceId, { resolution: 'Resolved by admin', adjustedHours: 0 });
            load();
        } catch (err: any) { setError(getErr(err, 'Failed to resolve dispute')); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-stone-800">Attendance Disputes</h1>
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : disputes.length === 0 ? <Empty msg="No pending disputes." /> : (
                <div className="grid gap-4">
                    {disputes.map(d => (
                        <div key={d.attendanceId} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 border-l-4 border-l-rose-500 flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    <h3 className="font-bold text-stone-800">Dispute #{d.attendanceId.slice(0, 8)}</h3>
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded">Unresolved</span>
                                </div>
                                <p className="text-sm text-stone-500 font-medium"><strong>{d.volunteerName}</strong> at {d.opportunityTitle}</p>
                                <p className="text-stone-700 mt-2 bg-stone-50 p-3 rounded-lg text-sm border border-stone-100">{d.reason}</p>
                            </div>
                            <div className="flex md:flex-col justify-end gap-2 shrink-0">
                                {d.evidenceUrl && <a href={d.evidenceUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 text-center">View Evidence</a>}
                                <button onClick={() => handleResolve(d.attendanceId)} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/30">Resolve</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN USERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminUsers() {
    const auth = useAuth();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionPending, setActionPending] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [filter, setFilter] = useState({ search: '', role: '', status: '', dateFrom: '', dateTo: '' });
    const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await adminService.getUsers();
            setUsers(data || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load users'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleBan = async (userId: string) => {
        setActionPending(userId);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true } : u));
        try {
            await adminService.banUser(userId);
            showToast('User banned');
        } catch (err: any) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false } : u));
            showToast(getErrWithStatus(err, 'Failed to ban user'));
        } finally { setActionPending(null); }
    };

    const handleUnban = async (userId: string) => {
        setActionPending(userId);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false } : u));
        try {
            await adminService.unbanUser(userId);
            showToast('User unbanned');
        } catch (err: any) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true } : u));
            showToast(getErrWithStatus(err, 'Failed to unban user'));
        } finally { setActionPending(null); }
    };

    const handleResetPassword = async (userId: string) => {
        if (!newPassword.trim()) return;
        setResetting(true);
        try {
            await adminService.resetPassword(userId, newPassword.trim());
            showToast('Password reset successfully');
            setResetPwdUserId(null);
            setNewPassword('');
        } catch (err: any) {
            showToast(getErrWithStatus(err, 'Failed to reset password'));
        } finally { setResetting(false); }
    };

    const nonAdminUsers = users.filter(u => u.role !== 'SystemAdmin');
    const filtered = nonAdminUsers.filter(u => {
        if (filter.search) {
            const q = filter.search.toLowerCase();
            if (!u.email.toLowerCase().includes(q) && !(u.organizationName?.toLowerCase().includes(q))) return false;
        }
        if (filter.role && u.role !== filter.role) return false;
        if (filter.status === 'active' && u.isBanned) return false;
        if (filter.status === 'banned' && !u.isBanned) return false;
        if (filter.dateFrom && new Date(u.createdAt) < new Date(filter.dateFrom)) return false;
        if (filter.dateTo && new Date(u.createdAt) > new Date(filter.dateTo + 'T23:59:59')) return false;
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <h1 className="text-3xl font-extrabold text-stone-800">User Control</h1>

            {/* Filter bar — wrapped in form autoComplete=off to suppress browser autofill */}
            <form autoComplete="off" onSubmit={e => e.preventDefault()} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-wrap gap-3 items-end">
                {/* Hidden dummy fields prevent browser from associating visible inputs with saved credentials */}
                <input type="text" name="prevent_autofill" style={{ display: 'none' }} readOnly />
                <input type="password" name="prevent_pwd_autofill" style={{ display: 'none' }} readOnly />
                <div className="flex-1 min-w-48">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                        <input value={filter.search} onChange={e => setFilter(p => ({ ...p, search: e.target.value }))} placeholder="Email or organization..." autoComplete="off" name="filter_search" className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Role</label>
                    <select value={filter.role} onChange={e => setFilter(p => ({ ...p, role: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="">All Roles</option>
                        <option value="Volunteer">Volunteer</option>
                        <option value="Coordinator">Coordinator</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Status</label>
                    <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">From</label>
                    <input type="date" value={filter.dateFrom} onChange={e => setFilter(p => ({ ...p, dateFrom: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">To</label>
                    <input type="date" value={filter.dateTo} onChange={e => setFilter(p => ({ ...p, dateTo: e.target.value }))} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                {(filter.search || filter.role || filter.status || filter.dateFrom || filter.dateTo) && (
                    <button type="button" onClick={() => setFilter({ search: '', role: '', status: '', dateFrom: '', dateTo: '' })} className="px-3 py-2 text-sm text-stone-400 hover:text-stone-600 font-medium flex items-center gap-1">
                        <X className="w-4 h-4" /> Clear
                    </button>
                )}
            </form>

            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : filtered.length === 0 ? <Empty msg="No users match the filter." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs text-stone-400 font-medium">
                        Showing {filtered.length} of {nonAdminUsers.length} users
                    </div>
                    <table className="w-full text-left">
                        <thead className="border-b border-stone-100 text-stone-500 text-sm">
                            <tr>
                                <th className="p-5 font-bold">Email</th>
                                <th className="p-5 font-bold">Role</th>
                                <th className="p-5 font-bold">Organization</th>
                                <th className="p-5 font-bold">Status</th>
                                <th className="p-5 font-bold">Registered</th>
                                <th className="p-5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filtered.map(u => (
                                <tr key={u.id} className="hover:bg-orange-50/30">
                                    <td className="p-5 font-medium text-stone-800 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center shrink-0"><User className="w-4 h-4 text-stone-400" /></div>
                                        {u.email}
                                    </td>
                                    <td className="p-5"><span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-bold rounded">{u.role}</span></td>
                                    <td className="p-5 text-stone-500 text-sm">{u.organizationName ?? <span className="text-stone-300">—</span>}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.isBanned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.isBanned ? 'Banned' : 'Active'}</span>
                                    </td>
                                    <td className="p-5 text-stone-400 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="p-5">
                                        {resetPwdUserId === u.id ? (
                                            <div className="flex items-center gap-2 justify-end flex-wrap">
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    placeholder="New password (min 6)"
                                                    className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none w-44"
                                                    autoComplete="new-password"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleResetPassword(u.id)} disabled={resetting || newPassword.length < 6} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-1">
                                                    {resetting && <Loader2 className="w-3 h-3 animate-spin" />}Set
                                                </button>
                                                <button onClick={() => { setResetPwdUserId(null); setNewPassword(''); }} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">Cancel</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 justify-end">
                                                {actionPending === u.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                                                ) : u.id === auth.userId ? (
                                                    <span className="text-xs text-stone-300 font-medium">Current user</span>
                                                ) : u.isBanned ? (
                                                    <button onClick={() => handleUnban(u.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-xs hover:bg-emerald-100">Unban</button>
                                                ) : (
                                                    <button onClick={() => handleBan(u.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-xs hover:bg-rose-100">Ban</button>
                                                )}
                                                {u.id !== auth.userId && (
                                                    <button onClick={() => { setResetPwdUserId(u.id); setNewPassword(''); }} className="p-1.5 text-stone-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Reset password">
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
