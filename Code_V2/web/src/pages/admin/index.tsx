import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Building, AlertTriangle, Calendar, User, Loader2, AlertCircle, Plus, Trash2, Pencil, X, Search, KeyRound, RefreshCw, ExternalLink, Server, Gauge, ShieldCheck, Download, Copy } from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';
import { useCountUp } from '../../hooks/useCountUp';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import SystemHealthPanel from '../../components/SystemHealthPanel';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonDashboard } from '../../components/Skeleton';
import type { ViewName, OrganizationSummary, UserRecord, DisputeSummary, Skill, OrgState, SystemInfoSummary } from '../../types';
import { OrgRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/admin';
import { organizationService } from '../../services/organizations';
import { attendanceService } from '../../services/attendance';
import { skillService } from '../../services/skills';

function Spinner() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>; }
function StatNum({ value }: { value: number }) {
    const animated = useCountUp(value);
    return <>{String(animated)}</>;
}
function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
    return (<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" /><p className="text-rose-700 font-medium">{msg}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm text-orange-600 font-bold hover:underline">Retry</button>}</div>);
}
function Empty({ msg }: { msg: string }) { return <div className="text-center py-16 text-stone-400 font-medium">{msg}</div>; }
function getErr(err: any, fallback: string): string { const d = err?.response?.data; if (!d) return fallback; if (typeof d === 'string') return d || fallback; return String(d.error || d.message || d.title || fallback); }
function getErrWithStatus(err: any, fallback: string): string { const status = err?.response?.status; const msg = getErr(err, fallback); return status ? `${msg} (HTTP ${status})` : msg; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface AdminDashboardProps { onNavigate: (view: ViewName) => void; }
export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [pendingOrgs, setPendingOrgs] = useState<OrganizationSummary[]>([]);
    const [allOrgs, setAllOrgs] = useState<OrganizationSummary[]>([]);
    const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [u, o, d, all] = await Promise.all([
                adminService.getUsers(),
                adminService.getPendingOrganizations(),
                attendanceService.getPendingDisputes(),
                adminService.getAllOrganizations(),
            ]);
            setUsers(u || []);
            setPendingOrgs(o || []);
            setDisputes(d || []);
            setAllOrgs(all || []);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load dashboard data'));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;
    const bannedUsers = users.filter(u => u.isBanned).length;
    const roleCounts = [
        { key: 'Volunteer', label: 'Volunteers', count: users.filter(u => u.role === 'Volunteer').length, color: 'bg-blue-500' },
        { key: 'Coordinator', label: 'Coordinators', count: users.filter(u => u.role === 'Coordinator').length, color: 'bg-emerald-500' },
        { key: 'SystemAdmin', label: 'Admins', count: users.filter(u => u.role === 'SystemAdmin').length, color: 'bg-violet-500' },
    ];
    const approvedOrgs = allOrgs.filter(o => o.status === 'Approved').length;
    const activeOrgsTotal = allOrgs.filter(o => o.status === 'PendingApproval' || o.status === 'Approved').length;
    const pendingRatio = activeOrgsTotal === 0 ? 0 : Math.round((pendingOrgs.length / activeOrgsTotal) * 100);
    const approvalRatio = activeOrgsTotal === 0 ? 0 : Math.round((approvedOrgs / activeOrgsTotal) * 100);
    const queueItems = pendingOrgs.length + disputes.length;
    const oldestDisputeHours = disputes.length === 0
        ? 0
        : Math.max(...disputes.map(d => Math.floor((Date.now() - new Date(d.raisedAt).getTime()) / (1000 * 60 * 60))));
    const recentDisputes = [...disputes]
        .sort((a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime())
        .slice(0, 5);
    const formatDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (loading) return <SkeletonDashboard />;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-stone-800">Platform Overview</h1>
                <p className="text-stone-400 mt-1 text-sm">System-wide monitoring and controls.</p>
            </div>

            {/* Zone A: System Health Panel */}
            <SystemHealthPanel
                silos={[]}
                totalActivations={0}
                onViewDetails={() => onNavigate('admin_system_info')}
            />

            {/* Zone B: KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', numVal: users.length, icon: Users, gradient: 'from-blue-500 to-cyan-400', target: 'admin_users' as ViewName },
                    { label: 'Pending Orgs', numVal: pendingOrgs.length, icon: Building, gradient: 'from-amber-400 to-orange-500', target: 'admin_orgs' as ViewName },
                    { label: 'Active Disputes', numVal: disputes.length, icon: AlertTriangle, gradient: 'from-rose-500 to-pink-500', target: 'admin_disputes' as ViewName },
                    { label: 'Banned Users', numVal: bannedUsers, icon: User, gradient: 'from-stone-500 to-slate-600', target: 'admin_users' as ViewName },
                ].map((s, i) => (
                    <button key={i} onClick={() => onNavigate(s.target)}
                        className="bg-white rounded-2xl p-5 shadow-level-1 border border-stone-100 flex flex-col items-start card-interactive group animate-content-reveal"
                        style={{ animationDelay: `${i * 0.07}s` }}>
                        <div className={`bg-gradient-to-br ${s.gradient} p-3 rounded-xl text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5" /></div>
                        <div className="text-2xl font-black text-stone-800"><StatNum value={s.numVal} /></div>
                        <div className="text-xs font-medium text-stone-400 mt-0.5">{s.label}</div>
                    </button>
                ))}
            </div>

            {/* Zone C: Approval queue + User role mix */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Approval priority queue */}
                <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-stone-800">Org Approval Queue</h2>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{pendingOrgs.length} pending</span>
                    </div>
                    {pendingOrgs.length === 0 ? (
                        <p className="text-sm text-stone-400 py-6 text-center">No pending organizations.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingOrgs.slice(0, 5).map(org => {
                                const daysWaiting = Math.floor((Date.now() - new Date(org.createdAt ?? 0).getTime()) / (1000 * 60 * 60 * 24));
                                const urgency = daysWaiting > 14 ? 'border-rose-300' : daysWaiting > 7 ? 'border-amber-300' : 'border-stone-200';
                                return (
                                    <div key={org.orgId} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${urgency} bg-stone-50`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-stone-800 text-sm truncate">{org.name}</p>
                                            <p className="text-xs text-stone-400">{daysWaiting} days waiting</p>
                                        </div>
                                        <button onClick={() => onNavigate('admin_orgs')}
                                            className="shrink-0 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors">
                                            Review
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* User role mix */}
                <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                    <h2 className="text-base font-bold text-stone-800 mb-4">User Role Mix</h2>
                    <div className="space-y-3">
                        {roleCounts.map(role => {
                            const pct = users.length === 0 ? 0 : Math.round((role.count / users.length) * 100);
                            return (
                                <div key={role.key}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="font-semibold text-stone-700">{role.label}</span>
                                        <span className="text-stone-500 text-xs">{role.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                                        <div className={`h-full ${role.color} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-3 text-xs text-stone-500">
                        <div>Approved orgs: <span className="font-bold text-stone-700">{approvedOrgs}</span></div>
                        <div>Approval rate: <span className="font-bold text-emerald-600">{approvalRatio}%</span></div>
                        <div>Queue items: <span className="font-bold text-amber-600">{queueItems}</span></div>
                        <div>Oldest dispute: <span className="font-bold text-rose-600">{oldestDisputeHours}h</span></div>
                    </div>
                </div>
            </div>

            {/* Zone D: Recent disputes */}
            <div className="bg-white rounded-2xl p-6 shadow-level-1 border border-stone-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-stone-800">Recent Disputes</h2>
                    {disputes.length > 0 && (
                        <button onClick={() => onNavigate('admin_disputes')} className="text-xs font-bold text-orange-500 hover:text-orange-600">View all →</button>
                    )}
                </div>
                {recentDisputes.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">No pending disputes. 🎉</p>
                ) : (
                    <div className="space-y-3">
                        {recentDisputes.map(d => (
                            <div key={d.attendanceId} className="rounded-xl border border-stone-100 p-4 hover:bg-stone-50 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-stone-800 text-sm">{d.opportunityTitle}</p>
                                        <p className="text-xs text-stone-400 mt-0.5">{d.volunteerName} · {formatDateTime(d.raisedAt)}</p>
                                    </div>
                                    <StatusBadge status="Disputed" />
                                </div>
                                <p className="text-sm text-stone-500 mt-2 line-clamp-2">{d.reason}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AdminSystemInfo() {
    const [data, setData] = useState<SystemInfoSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminService.getSystemInfo();
            setData(res);
        } catch (err: any) {
            setError(getErr(err, 'Failed to load system info'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <Spinner />;
    if (error) return <ErrorBox msg={error} onRetry={load} />;
    if (!data) return <Empty msg="No system runtime data available." />;

    const aliveCount = data.silos.filter(s => s.isAlive).length;
    const staleHeartbeatCount = data.silos.filter(s => {
        if (!s.lastHeartbeatUtc) return true;
        return (Date.now() - new Date(s.lastHeartbeatUtc).getTime()) > 120_000;
    }).length;

    const statusClass = (status: string) => {
        if (status.toLowerCase() === 'active') return 'bg-emerald-100 text-emerald-700';
        if (status.toLowerCase().includes('dead')) return 'bg-rose-100 text-rose-700';
        return 'bg-amber-100 text-amber-700';
    };

    const formatTimestamp = (value?: string | null) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const formatUptime = (minutes?: number | null) => {
        if (minutes === null || minutes === undefined) return 'N/A';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const formatPercent = (value?: number | null) => {
        if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
        const normalized = value <= 1.5 ? value * 100 : value;
        return `${normalized.toFixed(1)}%`;
    };

    const formatBytes = (value?: number | null) => {
        if (value === null || value === undefined || value < 0) return 'N/A';
        if (value < 1024) return `${value} B`;
        const units = ['KB', 'MB', 'GB', 'TB'];
        let size = value;
        let unitIdx = -1;
        while (size >= 1024 && unitIdx < units.length - 1) {
            size /= 1024;
            unitIdx += 1;
        }
        return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[Math.max(unitIdx, 0)]}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-stone-800">System Info</h1>
                    <p className="text-stone-500 mt-2 text-lg">Silo health, load skew, and grain runtime distribution.</p>
                </div>
                <button onClick={load} className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Silos</p>
                    <p className="text-3xl font-extrabold text-stone-800">{data.totalSilos}</p>
                    <p className="text-xs text-stone-500 mt-1">Alive: {aliveCount}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Total Activations</p>
                    <p className="text-3xl font-extrabold text-stone-800">{data.totalActivations}</p>
                    <p className="text-xs text-stone-500 mt-1">Updated: {formatTimestamp(data.generatedAtUtc)}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Skew Ratio</p>
                    <p className="text-3xl font-extrabold text-stone-800">{data.skew.skewRatio?.toFixed(2) ?? 'N/A'}</p>
                    <p className="text-xs text-stone-500 mt-1">StdDev: {data.skew.stdDevActivations.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Heartbeat Alerts</p>
                    <p className="text-3xl font-extrabold text-stone-800">{staleHeartbeatCount}</p>
                    <p className="text-xs text-stone-500 mt-1">Stale or unavailable</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                <div className="flex items-center gap-2 mb-5">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-xl font-bold text-stone-800">Silo Health</h2>
                </div>
                <div className="space-y-3">
                    {data.silos.map(s => (
                        <div key={s.silo} className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-center rounded-2xl border border-stone-100 p-4">
                            <div className="lg:col-span-2">
                                <p className="font-semibold text-stone-800 truncate" title={s.silo}>{s.silo}</p>
                                <p className="text-xs text-stone-400 truncate" title={s.hostName || ''}>{s.hostName || 'Host N/A'}</p>
                            </div>
                            <div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusClass(s.status)}`}>{s.status}</span>
                            </div>
                            <div>
                                <p className="text-xs text-stone-400">Last Heartbeat</p>
                                <p className="text-sm font-medium text-stone-700">{formatTimestamp(s.lastHeartbeatUtc)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-400">Uptime</p>
                                <p className="text-sm font-medium text-stone-700">{formatUptime(s.uptimeMinutes)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-400">Version</p>
                                <p className="text-sm font-medium text-stone-700">{s.version || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                <div className="flex items-center gap-2 mb-5">
                    <Server className="w-5 h-5 text-blue-500" />
                    <h2 className="text-xl font-bold text-stone-800">Silo Runtime Resources</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                    <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                        <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Sampled Silos</p>
                        <p className="text-2xl font-bold text-stone-800">{data.runtimeOverview.sampledSilos}</p>
                    </div>
                    <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                        <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Avg CPU</p>
                        <p className="text-2xl font-bold text-stone-800">{formatPercent(data.runtimeOverview.avgCpuUsage)}</p>
                    </div>
                    <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                        <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Avg Memory</p>
                        <p className="text-2xl font-bold text-stone-800">{formatPercent(data.runtimeOverview.avgMemoryUsageRatio)}</p>
                    </div>
                    <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                        <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Overloaded</p>
                        <p className="text-2xl font-bold text-stone-800">{data.runtimeOverview.overloadedSilos}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {data.silos.map(s => (
                        <div key={`${s.silo}-runtime`} className="rounded-2xl border border-stone-100 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="font-semibold text-stone-800 truncate" title={s.silo}>{s.silo}</p>
                                {s.runtime?.isOverloaded && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Overloaded</span>
                                )}
                            </div>
                            {!s.runtime ? (
                                <p className="text-sm text-stone-400">Runtime statistics unavailable for this silo.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">CPU</p>
                                        <p className="font-semibold text-stone-800">{formatPercent(s.runtime.cpuUsage)}</p>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">Memory Usage</p>
                                        <p className="font-semibold text-stone-800">{formatPercent(s.runtime.memoryUsageRatio)}</p>
                                        <p className="text-xs text-stone-500 mt-1">{formatBytes(s.runtime.memoryUsageBytes)} / {formatBytes(s.runtime.totalPhysicalMemoryBytes)}</p>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">Available Memory</p>
                                        <p className="font-semibold text-stone-800">{formatBytes(s.runtime.availableMemoryBytes)}</p>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">Clients</p>
                                        <p className="font-semibold text-stone-800">{s.runtime.clientCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">Messages</p>
                                        <p className="font-semibold text-stone-800">In {s.runtime.receivedMessages} · Out {s.runtime.sentMessages}</p>
                                    </div>
                                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                                        <p className="text-xs text-stone-500 mb-1">Runtime Sample</p>
                                        <p className="font-semibold text-stone-800">{formatTimestamp(s.runtime.runtimeCollectedAtUtc)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-2 mb-5">
                        <Gauge className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-bold text-stone-800">Load Skew</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-stone-500">Most Busy</span><span className="font-semibold text-stone-800">{data.skew.mostBusySilo || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">Least Busy</span><span className="font-semibold text-stone-800">{data.skew.leastBusySilo || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">Max Activations</span><span className="font-semibold text-stone-800">{data.skew.maxActivations}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">Min Activations</span><span className="font-semibold text-stone-800">{data.skew.minActivations}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">Average</span><span className="font-semibold text-stone-800">{data.skew.avgActivations.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">StdDev</span><span className="font-semibold text-stone-800">{data.skew.stdDevActivations.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-stone-500">Skew Ratio</span><span className="font-semibold text-stone-800">{data.skew.skewRatio?.toFixed(2) ?? 'N/A'}</span></div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-2 mb-5">
                        <Server className="w-5 h-5 text-blue-500" />
                        <h2 className="text-xl font-bold text-stone-800">System vs Business Grains</h2>
                    </div>
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-stone-500">Overall System</span>
                            <span className="font-semibold text-stone-700">{Math.round(data.overallSystemRatio * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.round(data.overallSystemRatio * 100)}%` }} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {data.silos.map(s => (
                            <div key={`${s.silo}-ratio`}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-stone-500 truncate max-w-[70%]" title={s.silo}>{s.silo}</span>
                                    <span className="font-semibold text-stone-700">{Math.round(s.systemRatio * 100)}% / {Math.round(s.businessRatio * 100)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden flex">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.round(s.systemRatio * 100)}%` }} />
                                    <div className="h-full bg-orange-400" style={{ width: `${Math.round(s.businessRatio * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
                <h2 className="text-xl font-bold text-stone-800 mb-5">Orleans Grain Distribution</h2>
                <div className="space-y-5">
                    {data.silos.map(silo => {
                        const visible = silo.grainTypes.slice(0, 8);
                        const top = Math.max(1, visible[0]?.activations || 1);
                        return (
                            <div key={silo.silo} className="rounded-2xl border border-stone-100 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-semibold text-stone-700 truncate" title={silo.silo}>{silo.silo}</p>
                                    <span className="text-xs text-stone-500">{silo.totalActivations} activations</span>
                                </div>
                                {visible.length === 0 ? (
                                    <p className="text-sm text-stone-400">No active grains in this silo.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {visible.map((g, idx) => (
                                            <div key={`${silo.silo}-${g.grainType}-${idx}`} className="grid grid-cols-12 items-center gap-3 text-sm">
                                                <div className="col-span-8 font-medium truncate text-stone-700" title={g.grainType}>
                                                    {g.grainType}
                                                </div>
                                                <div className="col-span-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-stone-500">Activations</span>
                                                        <span className="text-xs font-bold text-stone-700">{g.activations}</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                                                        <div
                                                            className={`h-full ${g.grainType.toLowerCase().startsWith('orleans.') ? 'bg-blue-500' : 'bg-orange-400'}`}
                                                            style={{ width: `${Math.max(8, Math.min(100, Math.round((g.activations / top) * 100)))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {silo.grainTypes.length > visible.length && (
                                    <p className="text-xs text-stone-400 mt-2">+ {silo.grainTypes.length - visible.length} more grain types</p>
                                )}
                            </div>
                        );
                    })}
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

// ─── Searchable coordinator picker (returns coordinator ID) ───
function CoordCombobox({ coordinators, selectedId, onSelectId, placeholder }: {
    coordinators: UserRecord[]; selectedId: string; onSelectId: (id: string) => void; placeholder: string;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const selected = coordinators.find(c => c.id === selectedId);
    const displayValue = selected && !open
        ? `${selected.email}${selected.organizationName ? ` (${selected.organizationName})` : ''}`
        : query;
    const filtered = coordinators.filter(c =>
        c.email.toLowerCase().includes(query.toLowerCase()) ||
        (c.organizationName ?? '').toLowerCase().includes(query.toLowerCase())
    );
    return (
        <div ref={ref} className="relative flex-1">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300 pointer-events-none" />
                <input
                    value={displayValue}
                    onChange={e => { setQuery(e.target.value); onSelectId(''); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                />
            </div>
            {open && filtered.length > 0 && (
                <ul className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-lg">
                    {filtered.map(c => (
                        <li key={c.id} onMouseDown={() => { onSelectId(c.id); setQuery(''); setOpen(false); }}
                            className="px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer flex justify-between items-center gap-2">
                            <span className="font-medium text-stone-700">{c.email}</span>
                            {c.organizationName && <span className="text-xs text-stone-400 shrink-0">{c.organizationName}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN ORGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminOrgs() {
    const ORG_FILTER_KEY = 'vsms_admin_orgs_filter';
    const ORG_SORT_KEY = 'vsms_admin_orgs_sort';
    const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
    const [coordinators, setCoordinators] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', coordinatorUserId: '' });
    const [creating, setCreating] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{ id: string; name: string; description: string; proofUrl?: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [toast, setToast] = useState('');
    const [reassignCoordId, setReassignCoordId] = useState('');
    const [addCoordId, setAddCoordId] = useState('');
    const [coordAction, setCoordAction] = useState(false);
    const [orgFilter, setOrgFilter] = useState({ search: '', status: '', dateFrom: '', dateTo: '' });
    const [orgSort, setOrgSort] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest');
    const [orgMembers, setOrgMembers] = useState<OrgState['members']>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [removingCoordId, setRemovingCoordId] = useState<string | null>(null);
    const [orgMembersMap, setOrgMembersMap] = useState<Record<string, OrgState['members']>>({});
    const [orgProofUrlMap, setOrgProofUrlMap] = useState<Record<string, string | undefined>>({});

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

    useEffect(() => {
        try {
            const savedFilter = localStorage.getItem(ORG_FILTER_KEY);
            const savedSort = localStorage.getItem(ORG_SORT_KEY);
            if (savedFilter) setOrgFilter(JSON.parse(savedFilter));
            if (savedSort === 'newest' || savedSort === 'oldest' || savedSort === 'name_asc' || savedSort === 'name_desc') {
                setOrgSort(savedSort);
            }
        } catch {
            // ignore malformed persisted state
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(ORG_FILTER_KEY, JSON.stringify(orgFilter));
        localStorage.setItem(ORG_SORT_KEY, orgSort);
    }, [orgFilter, orgSort]);

    useEffect(() => {
        if (orgs.length === 0) { setOrgMembersMap({}); setOrgProofUrlMap({}); return; }
        Promise.allSettled(orgs.map(o => organizationService.getById(o.orgId))).then(results => {
            const membersMap: Record<string, OrgState['members']> = {};
            const proofMap: Record<string, string | undefined> = {};
            const statusMap: Record<string, string> = {};
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') {
                    membersMap[orgs[i].orgId] = r.value.members || [];
                    proofMap[orgs[i].orgId] = r.value.proofUrl;
                    statusMap[orgs[i].orgId] = r.value.status;
                }
            });
            setOrgMembersMap(membersMap);
            setOrgProofUrlMap(proofMap);
            setOrgs(prev => {
                let changed = false;
                const next = prev.map(org => {
                    const actualStatus = statusMap[org.orgId];
                    if (!actualStatus || actualStatus === org.status) return org;
                    changed = true;
                    return { ...org, status: actualStatus };
                });
                return changed ? next : prev;
            });
        });
    }, [orgs]);

    const handleApprove = async (orgId: string) => {
        const prev = orgs.find(o => o.orgId === orgId);
        setOrgs(prev => prev.map(o => o.orgId === orgId ? { ...o, status: 'Approved' } : o));
        try { await adminService.approveOrg(orgId); showToast('Organization approved ✅'); setTimeout(() => load(), 600); }
        catch (err: any) {
            if (prev) setOrgs(list => list.map(o => o.orgId === orgId ? prev : o));
            showToast(getErr(err, 'Failed to approve'));
        }
    };

    const handleReject = async (orgId: string) => {
        const prev = orgs.find(o => o.orgId === orgId);
        setOrgs(prev => prev.map(o => o.orgId === orgId ? { ...o, status: 'Rejected' } : o));
        try { await adminService.rejectOrg(orgId, 'Rejected by administrator.'); showToast('Organization rejected'); setTimeout(() => load(), 600); }
        catch (err: any) {
            if (prev) setOrgs(list => list.map(o => o.orgId === orgId ? prev : o));
            showToast(getErr(err, 'Failed to reject'));
        }
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
            setDeleteConfirmName('');
            showToast('Organization removed');
            setOrgs(prev => prev.filter(o => o.orgId !== orgId));
            setOrgMembersMap(prev => { const next = { ...prev }; delete next[orgId]; return next; });
            setCoordinators(prev => prev.map(c =>
                c.organizationId === orgId ? { ...c, organizationId: undefined, organizationName: undefined } : c
            ));
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

    const handleAddCoord = async () => {
        if (!editingOrg || !addCoordId) return;
        setCoordAction(true);
        try {
            await adminService.addCoordinatorToOrg(editingOrg.id, addCoordId);
            showToast('Coordinator added');
            // Optimistically update coordinators table source
            setCoordinators(prev => prev.map(c =>
                c.id === addCoordId ? { ...c, organizationId: editingOrg.id } : c
            ));
            setAddCoordId('');
            const updated = await organizationService.getById(editingOrg.id);
            setOrgMembers(updated.members || []);
            setOrgMembersMap(prev => ({ ...prev, [editingOrg.id]: updated.members || [] }));
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to add coordinator'));
        } finally { setCoordAction(false); }
    };

    const startEditOrg = async (org: OrganizationSummary) => {
        setEditingOrg({ id: org.orgId, name: org.name, description: org.description });
        setReassignCoordId(''); setAddCoordId(''); setOrgMembers([]);
        setLoadingMembers(true);
        try {
            const state = await organizationService.getById(org.orgId);
            const grainMembers = state.members || [];
            // Merge: DB coordinators for this org that are missing from grain state
            const dbCoords = coordinators.filter(c => c.organizationId === org.orgId);
            const merged = [...grainMembers];
            for (const c of dbCoords) {
                if (!grainMembers.find(m => m.userId === c.id))
                    merged.push({ userId: c.id, email: c.email ?? '', role: OrgRole.Coordinator, joinedAt: '' });
            }
            setOrgMembers(merged);
            setEditingOrg(prev => prev ? { ...prev, proofUrl: state.proofUrl } : null);
        } catch { /* silent */ }
        finally { setLoadingMembers(false); }
    };

    const handleRemoveCoord = async (userId: string) => {
        if (!editingOrg) return;
        setRemovingCoordId(userId);
        try {
            await adminService.removeCoordinatorFromOrg(editingOrg.id, userId);
            showToast('Coordinator removed');
            setOrgMembers(prev => prev.filter(m => m.userId !== userId));
            setOrgMembersMap(prev => ({ ...prev, [editingOrg.id]: (prev[editingOrg.id] || []).filter(m => m.userId !== userId) }));
            // Optimistically clear org from coordinators table source
            setCoordinators(prev => prev.map(c =>
                c.id === userId ? { ...c, organizationId: undefined, organizationName: undefined } : c
            ));
            load();
        } catch (err: any) {
            showToast(getErr(err, 'Failed to remove coordinator'));
        } finally { setRemovingCoordId(null); }
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
    const sortedOrgs = [...filteredOrgs].sort((a, b) => {
        if (orgSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (orgSort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (orgSort === 'name_asc') return a.name.localeCompare(b.name);
        return b.name.localeCompare(a.name);
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-stone-800">Organizations</h1>
                <div className="flex items-center gap-2">
                    {orgs.length > 0 && (
                        <button
                            onClick={() => downloadCsv('organizations', orgs.map(o => ({ Name: o.name, Status: o.status, Created: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '' })))}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    )}
                    <button onClick={() => setShowCreate(v => !v)} className="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Create Organization
                    </button>
                </div>
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
                        <button onClick={() => { setEditingOrg(null); setOrgMembers([]); }} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
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
                        {editingOrg.proofUrl && (
                            <div>
                                <label className="block text-sm font-medium text-stone-600 mb-1">Proof Document</label>
                                <a href={editingOrg.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                                    <ExternalLink className="w-3.5 h-3.5" /> View Proof Document
                                </a>
                            </div>
                        )}
                        <div className="border-t border-stone-100 pt-4">
                            <p className="text-sm font-bold text-stone-600 mb-3">Coordinator Management</p>
                            <div className="space-y-3">
                                {/* Current coordinators list */}
                                <div>
                                    <p className="text-xs font-medium text-stone-500 mb-2">Current Coordinators</p>
                                    {loadingMembers ? (
                                        <div className="flex items-center gap-2 text-xs text-stone-400 py-1"><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>
                                    ) : orgMembers.filter(m => m.role === OrgRole.Admin || m.role === OrgRole.Coordinator).length === 0 ? (
                                        <p className="text-xs text-stone-300 italic">No coordinators found</p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {orgMembers.filter(m => m.role === OrgRole.Admin || m.role === OrgRole.Coordinator).map(m => (
                                                <li key={m.userId} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-medium text-stone-700 truncate block">{m.email}</span>
                                                        <span className={`text-xs font-bold ${m.role === OrgRole.Admin ? 'text-amber-600' : 'text-stone-400'}`}>
                                                            {m.role === OrgRole.Admin ? 'Primary' : 'Additional'}
                                                        </span>
                                                    </div>
                                                    {m.role === OrgRole.Coordinator && (
                                                        <button
                                                            onClick={() => handleRemoveCoord(m.userId)}
                                                            disabled={removingCoordId === m.userId}
                                                            className="ml-3 p-1 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                                                            title="Remove coordinator"
                                                        >
                                                            {removingCoordId === m.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">
                                        Reassign Primary Coordinator
                                    </label>
                                    <div className="flex gap-2">
                                        <CoordCombobox
                                            coordinators={coordinators}
                                            selectedId={reassignCoordId}
                                            onSelectId={setReassignCoordId}
                                            placeholder="Search by email or org…"
                                        />
                                        <button onClick={handleReassignCoord} disabled={!reassignCoordId || coordAction} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:bg-orange-300 text-sm flex items-center gap-1">
                                            {coordAction && <Loader2 className="w-3 h-3 animate-spin" />}Reassign
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">Add Additional Coordinator</label>
                                    <div className="flex gap-2">
                                        <CoordCombobox
                                            coordinators={coordinators}
                                            selectedId={addCoordId}
                                            onSelectId={setAddCoordId}
                                            placeholder="Search by email or org…"
                                        />
                                        <button onClick={handleAddCoord} disabled={!addCoordId || coordAction} className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 disabled:opacity-50 text-sm flex items-center gap-1">
                                            {coordAction && <Loader2 className="w-3 h-3 animate-spin" />}Add
                                        </button>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1">The coordinator must already have an account.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setEditingOrg(null); setReassignCoordId(''); setAddCoordId(''); setOrgMembers([]); }} className="px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200">Cancel</button>
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
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Sort</label>
                    <select value={orgSort} onChange={e => setOrgSort(e.target.value as 'newest' | 'oldest' | 'name_asc' | 'name_desc')} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name_asc">Name A-Z</option>
                        <option value="name_desc">Name Z-A</option>
                    </select>
                </div>
                {(orgFilter.search || orgFilter.status || orgFilter.dateFrom || orgFilter.dateTo) && (
                    <button onClick={() => setOrgFilter({ search: '', status: '', dateFrom: '', dateTo: '' })} className="px-3 py-2 text-sm text-stone-400 hover:text-stone-600 font-medium flex items-center gap-1">
                        <X className="w-4 h-4" /> Clear
                    </button>
                )}
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : orgs.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-stone-100 shadow-sm text-center">
                    <p className="text-stone-400 font-medium mb-5">No organizations yet.</p>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600">
                        Create Organization
                    </button>
                </div>
            ) : sortedOrgs.length === 0 ? <Empty msg="No organizations match the filter." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs text-stone-400 font-medium">
                        Showing {sortedOrgs.length} of {orgs.length} organizations
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
                            {sortedOrgs.map(org => (
                                <tr key={org.orgId} className="hover:bg-orange-50/30">
                                    <td className="p-5 text-stone-800 font-bold">{org.name}</td>
                                    <td className="p-5 text-stone-500 text-sm">
                                        {(() => {
                                            // Use DB coordinators as source of truth — includes additional coords not yet in grain
                                            const dbCoords = coordinators.filter(c => c.organizationId === org.orgId);
                                            if (!dbCoords.length) return <span className="text-stone-300">—</span>;
                                            const grainMembers = orgMembersMap[org.orgId];
                                            return <div className="space-y-0.5">{dbCoords.map(c => {
                                                const isPrimary = grainMembers?.find(m => m.userId === c.id)?.role === OrgRole.Admin;
                                                return (
                                                    <div key={c.id} className="flex items-baseline gap-1 flex-wrap">
                                                        <span className="text-sm">{c.email}</span>
                                                        <span className={`text-xs font-bold ${isPrimary ? 'text-amber-500' : 'text-stone-400'}`}>
                                                            {isPrimary ? '(Primary)' : '(Coordinator)'}
                                                        </span>
                                                    </div>
                                                );
                                            })}</div>;
                                        })()}
                                    </td>
                                    <td className="p-5"><OrgStatusBadge status={org.status} /></td>
                                    <td className="p-5 text-stone-500 text-sm">{new Date(org.createdAt).toLocaleDateString()}</td>
                                    <td className="p-5">
                                        <div className="flex justify-end gap-2 flex-wrap">
                                            {(org.proofUrl || orgProofUrlMap[org.orgId]) && (
                                                <a href={org.proofUrl || orgProofUrlMap[org.orgId]} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-sm hover:bg-blue-100 flex items-center gap-1">
                                                    <ExternalLink className="w-3.5 h-3.5" /> Proof
                                                </a>
                                            )}
                                            {org.status === 'PendingApproval' && <>
                                                <button onClick={() => handleReject(org.orgId)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100">Reject</button>
                                                <button onClick={() => handleApprove(org.orgId)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-sm hover:bg-emerald-100">Approve</button>
                                            </>}
                                            <button onClick={() => startEditOrg(org)} className="p-1.5 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {deleteConfirm === org.orgId ? (
                                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                    <input
                                                        value={deleteConfirmName}
                                                        onChange={e => setDeleteConfirmName(e.target.value)}
                                                        placeholder={`Type "${org.name}"`}
                                                        className="px-2 py-1 text-xs rounded-lg border border-rose-200 bg-rose-50 focus:ring-2 focus:ring-rose-400 outline-none w-36"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleDelete(org.orgId)} disabled={deleteConfirmName !== org.name} className="px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:bg-rose-300">Remove</button>
                                                    <button onClick={() => { setDeleteConfirm(null); setDeleteConfirmName(''); }} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setDeleteConfirm(org.orgId); setDeleteConfirmName(''); }} className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
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
    const [showAddForm, setShowAddForm] = useState(false);
    const [skillSearch, setSkillSearch] = useState('');
    const [skillCategoryFilter, setSkillCategoryFilter] = useState('');
    const [showCreateCatDrop, setShowCreateCatDrop] = useState(false);
    const [showEditCatDrop, setShowEditCatDrop] = useState(false);
    const [createCatSearch, setCreateCatSearch] = useState('');
    const [editCatSearch, setEditCatSearch] = useState('');

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

    const allCategories = Object.keys(byCategory).sort();
    const filteredByCategory = skills
        .filter(s => {
            const matchSearch = !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase()) || (s.description ?? '').toLowerCase().includes(skillSearch.toLowerCase());
            const matchCat = !skillCategoryFilter || (s.category || 'General') === skillCategoryFilter;
            return matchSearch && matchCat;
        })
        .reduce<Record<string, Skill[]>>((acc, s) => {
            (acc[s.category || 'General'] ??= []).push(s);
            return acc;
        }, {});

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div><h1 className="text-3xl font-extrabold text-stone-800">Skills Management</h1><p className="text-stone-500 mt-2 text-lg">Manage the platform skill catalog.</p></div>
                <button onClick={() => setShowAddForm(v => !v)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-all ${showAddForm ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'}`}>
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'Cancel' : 'Add New Skill'}
                </button>
            </div>

            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}

            {showAddForm && (<>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
                <h2 className="text-lg font-bold text-stone-800 mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500" /> Add New Skill</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Category</label>
                            <div className="relative">
                                <input value={form.category} onChange={e => { setForm(p => ({ ...p, category: e.target.value })); setCreateCatSearch(e.target.value); setShowCreateCatDrop(true); }} onFocus={() => { setCreateCatSearch(''); setShowCreateCatDrop(true); }} onBlur={() => setTimeout(() => setShowCreateCatDrop(false), 150)} placeholder="e.g. Medical, IT" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                                {showCreateCatDrop && allCategories.filter(c => !createCatSearch || c.toLowerCase().includes(createCatSearch.toLowerCase())).length > 0 && (
                                    <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {allCategories.filter(c => !createCatSearch || c.toLowerCase().includes(createCatSearch.toLowerCase())).map(cat => (
                                            <li key={cat} onMouseDown={() => { setForm(p => ({ ...p, category: cat })); setCreateCatSearch(''); setShowCreateCatDrop(false); }} className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-sm text-stone-700">{cat}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
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
            </>)}

            {editingSkill && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-stone-800">Edit Skill</h3>
                        <button onClick={() => setEditingSkill(null)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 mb-1">Category</label>
                            <div className="relative">
                                <input value={editForm.category} onChange={e => { setEditForm(p => ({ ...p, category: e.target.value })); setEditCatSearch(e.target.value); setShowEditCatDrop(true); }} onFocus={() => { setEditCatSearch(''); setShowEditCatDrop(true); }} onBlur={() => setTimeout(() => setShowEditCatDrop(false), 150)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none" required />
                                {showEditCatDrop && allCategories.filter(c => !editCatSearch || c.toLowerCase().includes(editCatSearch.toLowerCase())).length > 0 && (
                                    <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {allCategories.filter(c => !editCatSearch || c.toLowerCase().includes(editCatSearch.toLowerCase())).map(cat => (
                                            <li key={cat} onMouseDown={() => { setEditForm(p => ({ ...p, category: cat })); setEditCatSearch(''); setShowEditCatDrop(false); }} className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-sm text-stone-700">{cat}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
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

            {/* Search & Filter */}
            <div className="flex flex-wrap gap-3">
                <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Search skills..." className="flex-1 min-w-48 px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                <select value={skillCategoryFilter} onChange={e => setSkillCategoryFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm text-stone-600">
                    <option value="">All Categories</option>
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            {error && <ErrorBox msg={error} onRetry={load} />}
            {loading ? <Spinner /> : Object.keys(filteredByCategory).length === 0 ? <Empty msg={skills.length === 0 ? 'No skills yet.' : 'No skills match your search.'} /> : (
                <div className="space-y-6">
                    {Object.entries(filteredByCategory).map(([category, catSkills]) => (
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
    const USER_FILTER_KEY = 'vsms_admin_users_filter';
    const USER_SORT_KEY = 'vsms_admin_users_sort';
    const auth = useAuth();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionPending, setActionPending] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [filter, setFilter] = useState({ search: '', role: '', status: '', dateFrom: '', dateTo: '' });
    const [sort, setSort] = useState<'newest' | 'oldest' | 'email_asc' | 'email_desc'>('newest');
    const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null);
    const [pendingRole, setPendingRole] = useState('');
    const [changingRole, setChangingRole] = useState(false);

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

    useEffect(() => {
        try {
            const savedFilter = localStorage.getItem(USER_FILTER_KEY);
            const savedSort = localStorage.getItem(USER_SORT_KEY);
            if (savedFilter) setFilter(JSON.parse(savedFilter));
            if (savedSort === 'newest' || savedSort === 'oldest' || savedSort === 'email_asc' || savedSort === 'email_desc') {
                setSort(savedSort);
            }
        } catch {
            // ignore malformed persisted state
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(USER_FILTER_KEY, JSON.stringify(filter));
        localStorage.setItem(USER_SORT_KEY, sort);
    }, [filter, sort]);

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

    const handleDelete = async (userId: string, email: string) => {
        setDeleting(true);
        try {
            await adminService.deleteUser(userId, deleteConfirmEmail);
            showToast(`Deleted ${email}`);
            setDeleteUserId(null);
            setDeleteConfirmEmail('');
            load();
        } catch (err: any) {
            showToast(getErrWithStatus(err, 'Failed to delete user'));
        } finally { setDeleting(false); }
    };

    const handleChangeRole = async (userId: string) => {
        setChangingRole(true);
        try {
            await adminService.changeRole(userId, pendingRole);
            showToast('Role updated');
            setChangeRoleUserId(null);
            setPendingRole('');
            load();
        } catch (err: any) {
            showToast(getErrWithStatus(err, 'Failed to change role'));
        } finally { setChangingRole(false); }
    };

    const closeInlineAction = () => {
        setResetPwdUserId(null); setNewPassword('');
        setDeleteUserId(null); setDeleteConfirmEmail('');
        setChangeRoleUserId(null); setPendingRole('');
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
    const sortedUsers = [...filtered].sort((a, b) => {
        if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === 'email_asc') return a.email.localeCompare(b.email);
        return b.email.localeCompare(a.email);
    });
    const { visible: pagedUsers, hasMore: usersHasMore, sentinelRef: usersSentinel } = useInfiniteList(sortedUsers);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-stone-800">User Control</h1>
                {sortedUsers.length > 0 && (
                    <button
                        onClick={() => downloadCsv('users', sortedUsers.map(u => ({ Email: u.email, Role: u.role, Organization: u.organizationName ?? '', Banned: u.isBanned ? 'Yes' : 'No', Created: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '' })))}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

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
                <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">Sort</label>
                    <select value={sort} onChange={e => setSort(e.target.value as 'newest' | 'oldest' | 'email_asc' | 'email_desc')} className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="email_asc">Email A-Z</option>
                        <option value="email_desc">Email Z-A</option>
                    </select>
                </div>
                {(filter.search || filter.role || filter.status || filter.dateFrom || filter.dateTo) && (
                    <button type="button" onClick={() => setFilter({ search: '', role: '', status: '', dateFrom: '', dateTo: '' })} className="px-3 py-2 text-sm text-stone-400 hover:text-stone-600 font-medium flex items-center gap-1">
                        <X className="w-4 h-4" /> Clear
                    </button>
                )}
            </form>

            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl border border-rose-100">{error}</div>}
            {loading ? <Spinner /> : sortedUsers.length === 0 ? <Empty msg="No users match the filter." /> : (
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs text-stone-400 font-medium">
                        Showing {pagedUsers.length} of {sortedUsers.length} ({nonAdminUsers.length} total)
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
                            {pagedUsers.map(u => (
                                <tr key={u.id} className={`hover:bg-orange-50/30 ${actionPending === u.id ? 'opacity-70 bg-orange-50/40' : ''}`}>
                                    <td className="p-5 font-medium text-stone-800 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center shrink-0"><User className="w-4 h-4 text-stone-400" /></div>
                                        <span>{u.email}</span>
                                        <button
                                            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(u.email); showToast('Email copied!'); }}
                                            className="p-1 rounded text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors"
                                            title="Copy email"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                    <td className="p-5"><span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-bold rounded">{u.role}</span></td>
                                    <td className="p-5 text-stone-500 text-sm">{u.organizationName ?? <span className="text-stone-300">—</span>}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.isBanned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.isBanned ? 'Banned' : 'Active'}</span>
                                        {actionPending === u.id && <p className="text-xs text-orange-600 font-semibold mt-2">Updating user status...</p>}
                                    </td>
                                    <td className="p-5 text-stone-400 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="p-5">
                                        {deleteUserId === u.id ? (
                                            <div className="flex items-center gap-2 justify-end flex-wrap">
                                                <input
                                                    value={deleteConfirmEmail}
                                                    onChange={e => setDeleteConfirmEmail(e.target.value)}
                                                    placeholder={`Type ${u.email} to confirm`}
                                                    className="px-3 py-1.5 text-sm rounded-lg border border-rose-200 bg-rose-50 focus:ring-2 focus:ring-rose-400 outline-none w-52"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleDelete(u.id, u.email)} disabled={deleting || deleteConfirmEmail !== u.email} className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:bg-rose-300 flex items-center gap-1">
                                                    {deleting && <Loader2 className="w-3 h-3 animate-spin" />}Delete
                                                </button>
                                                <button onClick={closeInlineAction} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">Cancel</button>
                                            </div>
                                        ) : changeRoleUserId === u.id ? (
                                            <div className="flex items-center gap-2 justify-end">
                                                <select value={pendingRole} onChange={e => setPendingRole(e.target.value)} className="px-2 py-1.5 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-orange-500 outline-none">
                                                    <option value="">— select role —</option>
                                                    {u.role !== 'Volunteer' && <option value="Volunteer">Volunteer</option>}
                                                    {u.role !== 'Coordinator' && <option value="Coordinator">Coordinator</option>}
                                                </select>
                                                <button onClick={() => handleChangeRole(u.id)} disabled={changingRole || !pendingRole} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 disabled:bg-orange-300 flex items-center gap-1">
                                                    {changingRole && <Loader2 className="w-3 h-3 animate-spin" />}Save
                                                </button>
                                                <button onClick={closeInlineAction} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">Cancel</button>
                                            </div>
                                        ) : resetPwdUserId === u.id ? (
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
                                                <button onClick={closeInlineAction} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200">Cancel</button>
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
                                                {u.id !== auth.userId && (<>
                                                    <button onClick={() => { closeInlineAction(); setChangeRoleUserId(u.id); }} className="p-1.5 text-stone-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Change role">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => { closeInlineAction(); setResetPwdUserId(u.id); }} className="p-1.5 text-stone-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Reset password">
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => { closeInlineAction(); setDeleteUserId(u.id); setDeleteConfirmEmail(''); }} className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete user">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>)}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {usersHasMore && <div ref={usersSentinel} className="py-3 text-center text-xs text-stone-400">Loading more…</div>}
                </div>
            )}
        </div>
    );
}
