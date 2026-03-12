import { useState, useEffect, useCallback } from 'react';
import { Users, Building, AlertTriangle, Calendar, User, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { OrganizationSummary, UserRecord, DisputeSummary, Skill } from '../../types';
import { adminService } from '../../services/admin';
import { attendanceService } from '../../services/attendance';
import { skillService } from '../../services/skills';

function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" /><p className="text-rose-700 font-medium">{msg}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}</div>);
}
function Empty({ msg }: { msg: string }) { return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>; }

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
            setUsers(u); setPendingOrgs(o); setDisputes(d);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load dashboard data');
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN ORGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminOrgs() {
    const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await adminService.getPendingOrganizations();
            setOrgs(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load organizations');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (orgId: string) => {
        try { await adminService.approveOrg(orgId); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to approve'); }
    };

    const handleReject = async (orgId: string) => {
        try { await adminService.rejectOrg(orgId, 'Application rejected by administrator.'); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to reject'); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-stone-800">Pending Organizations</h1>
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : orgs.length === 0 ? <Empty msg="No pending organizations." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">Org Name</th><th className="p-5 font-bold">Description</th><th className="p-5 font-bold">Created</th><th className="p-5 font-bold text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {orgs.map(org => (
                                <tr key={org.orgId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{org.name}</td>
                                    <td className="p-5 text-stone-500 max-w-xs truncate">{org.description}</td>
                                    <td className="p-5 text-stone-500 text-sm">{new Date(org.createdAt).toLocaleDateString()}</td>
                                    <td className="p-5 flex justify-end gap-2">
                                        <button onClick={() => handleReject(org.orgId)} className="px-4 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Reject</button>
                                        <button onClick={() => handleApprove(org.orgId)} className="px-4 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-sm hover:bg-emerald-100">Approve</button>
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
export function AdminSkills() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', category: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await skillService.getAll();
            setSkills(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load skills');
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
            showToast(err.response?.data?.Error || 'Failed to create skill');
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
                                            <button onClick={() => setDeleteConfirm(skill.id)} className="p-2 text-stone-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
            setDisputes(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load disputes');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleResolve = async (attendanceId: string) => {
        try {
            await adminService.resolveDispute(attendanceId, { resolution: 'Resolved by admin', adjustedHours: 0 });
            load();
        } catch (err: any) { setError(err.response?.data || 'Failed to resolve dispute'); }
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
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to load users');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleBan = async (userId: string) => {
        try { await adminService.banUser(userId); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to ban user'); }
    };

    const handleUnban = async (userId: string) => {
        try { await adminService.unbanUser(userId); load(); }
        catch (err: any) { setError(err.response?.data || 'Failed to unban user'); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold text-stone-800">User Control</h1>
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : users.length === 0 ? <Empty msg="No users found." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 text-sm">
                            <tr><th className="p-5 font-bold">User</th><th className="p-5 font-bold">Email</th><th className="p-5 font-bold">Role</th><th className="p-5 font-bold">Status</th><th className="p-5 font-bold text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-orange-50/30">
                                    <td className="p-5 font-bold text-stone-800 flex items-center gap-3">
                                        <div className="w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center text-sm font-bold text-stone-500"><User className="w-4 h-4" /></div>
                                        {u.email.split('@')[0]}
                                    </td>
                                    <td className="p-5 text-stone-500">{u.email}</td>
                                    <td className="p-5"><span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-bold rounded">{u.role}</span></td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.isBanned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.isBanned ? 'Banned' : 'Active'}</span>
                                    </td>
                                    <td className="p-5 text-right">
                                        {u.isBanned
                                            ? <button onClick={() => handleUnban(u.id)} className="px-4 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-sm hover:bg-emerald-100">Unban</button>
                                            : <button onClick={() => handleBan(u.id)} className="px-4 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Ban</button>
                                        }
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
