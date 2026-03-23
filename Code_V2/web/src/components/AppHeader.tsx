import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Bell, CheckCheck, Check, Search, Sun, Moon, ChevronDown, User, LogOut } from 'lucide-react';
import { timeAgo } from '../utils/timeAgo';
import { adminService } from '../services/admin';
import { attendanceService } from '../services/attendance';
import { applicationService } from '../services/applications';
import { organizationService } from '../services/organizations';
import { notificationService } from '../services/notifications';
import { useAuth } from '../hooks/useAuth';
import type { ViewName } from '../types';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Notification {
    id: string;
    title: string;
    subtitle: string;
    view: ViewName;
    createdAt?: string;
}

interface Props {
    userRole: DisplayRole;
    onOpenSearch: () => void;
    onNavigate: (view: ViewName) => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onLogout: () => void;
    onBadgesUpdate?: (badges: Partial<Record<ViewName, number>>) => void;
}

function getInitials(email: string): string {
    if (!email) return '?';
    const parts = email.split('@')[0].replace(/[._-]/g, ' ').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
}

export default function AppHeader({ userRole, onOpenSearch, onNavigate, theme, onToggleTheme, onLogout, onBadgesUpdate }: Props) {
    const auth = useAuth();

    // ── Notification state ──────────────────────────────────────
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [prevUnread, setPrevUnread] = useState(0);
    const [bellRing, setBellRing] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem('vsms_read_notif_ids');
            return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
        } catch { return new Set<string>(); }
    });
    const notifRef = useRef<HTMLDivElement>(null);

    // ── Avatar dropdown state ───────────────────────────────────
    const [showAvatar, setShowAvatar] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);

    // Click-outside handlers
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
            if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        localStorage.setItem('vsms_read_notif_ids', JSON.stringify([...readIds]));
    }, [readIds]);

    const fetchNotifications = useCallback(async () => {
        try {
            let notifs: Notification[] = [];

            if (userRole === 'admin') {
                const [orgs, disputes] = await Promise.all([
                    adminService.getPendingOrganizations(),
                    attendanceService.getPendingDisputes(),
                ]);
                notifs = [
                    ...(Array.isArray(orgs) ? orgs : []).map(o => ({
                        id: `org-${o.orgId}`,
                        title: 'New Organization Application',
                        subtitle: o.name,
                        view: 'admin_orgs' as const,
                    })),
                    ...(Array.isArray(disputes) ? disputes : []).map(d => ({
                        id: `dispute-${d.attendanceId}`,
                        title: 'Attendance Dispute',
                        subtitle: `${d.volunteerName} — ${d.opportunityTitle}`,
                        view: 'admin_disputes' as const,
                    })),
                ];
            } else if (userRole === 'volunteer' && auth.linkedGrainId) {
                const apps = await applicationService.getForVolunteer(auth.linkedGrainId);
                const actionable = ['Approved', 'Rejected', 'Waitlisted', 'Promoted'];
                notifs = (Array.isArray(apps) ? apps : [])
                    .filter(a => actionable.includes(a.status))
                    .map(a => ({
                        id: `app-${a.applicationId}`,
                        title: `Application ${a.status}`,
                        subtitle: `${a.opportunityTitle} — ${a.shiftName}`,
                        view: 'applications' as const,
                    }));
            } else if (userRole === 'coordinator' && auth.linkedGrainId) {
                const apps = await organizationService.getApplications(auth.linkedGrainId);
                notifs = (Array.isArray(apps) ? apps : [])
                    .filter(a => a.status === 'Pending')
                    .map(a => ({
                        id: `pending-${a.applicationId}`,
                        title: 'New Volunteer Application',
                        subtitle: `${a.volunteerName} — ${a.opportunityTitle}`,
                        view: 'org_applications' as const,
                    }));
            }

            setNotifications(notifs);
            setReadIds(prev => {
                const existing = new Set(notifs.map(n => n.id));
                return new Set([...prev].filter(id => existing.has(id)));
            });
            if (onBadgesUpdate) {
                const byView = notifs.reduce((acc, n) => {
                    acc[n.view] = (acc[n.view] ?? 0) + 1;
                    return acc;
                }, {} as Partial<Record<ViewName, number>>);
                // For volunteers, also badge the Messages sidebar item with unread notification count
                if (userRole === 'volunteer') {
                    try {
                        const count = await notificationService.getUnreadCount();
                        if (count > 0) byView['messages'] = count;
                    } catch { /* non-critical */ }
                }
                onBadgesUpdate(byView);
            }
        } catch { /* non-critical */ }
    }, [userRole, auth.linkedGrainId, onBadgesUpdate]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        // Re-poll immediately when user returns to the tab
        const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    // Bell ring animation when new notifications arrive
    useEffect(() => {
        if (unreadCount > prevUnread && prevUnread !== 0) {
            setBellRing(true);
            setTimeout(() => setBellRing(false), 800);
        }
        setPrevUnread(unreadCount);
    }, [unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClickNotif = (notif: Notification) => {
        setReadIds(prev => new Set([...prev, notif.id]));
        setShowNotif(false);
        onNavigate(notif.view);
    };

    const handleMarkOneRead = (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        setReadIds(prev => new Set([...prev, notifId]));
    };

    const handleMarkAllRead = () => setReadIds(new Set(notifications.map(n => n.id)));

    const initials = getInitials(auth.email ?? '');

    return (
        <header className="bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl border-b border-stone-100/80 dark:border-zinc-800 h-16 fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 shadow-sm shadow-stone-100/50">

            {/* ── Left: logo + role badge ── */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <Heart className="h-4 w-4 text-white fill-white" />
                    </div>
                    <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">VSMS</span>
                    <span className="hidden sm:inline-block ml-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-gradient-to-r from-amber-50 to-orange-50 text-orange-600 border border-orange-100 capitalize">
                        {userRole} Portal
                    </span>
                </div>
            </div>

            {/* ── Center: search pill ── */}
            <button
                onClick={onOpenSearch}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300 text-sm transition-all w-64 text-left"
            >
                <Search className="w-4 h-4 shrink-0" />
                <span className="flex-1">Search or press</span>
                <kbd className="text-xs bg-white border border-stone-200 rounded px-1.5 py-0.5 text-stone-400 font-mono">⌘K</kbd>
            </button>

            {/* ── Right: theme toggle + notifications + avatar ── */}
            <div className="flex items-center gap-2">

                {/* Theme toggle */}
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-xl text-stone-400 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors"
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>

                {/* Notification bell */}
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => setShowNotif(v => !v)}
                        className={`p-2 text-stone-400 hover:text-orange-500 transition-colors relative ${bellRing ? 'animate-bell-ring' : ''}`}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-level-3 border border-stone-100 dark:border-zinc-800 overflow-hidden z-50">
                            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                                <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="bg-rose-100 text-rose-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                                    )}
                                </h3>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-xs text-orange-500 font-bold hover:text-orange-600 flex items-center gap-1">
                                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                                    </button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div className="px-5 py-8 text-center text-stone-400 text-sm font-medium">No notifications</div>
                            ) : (
                                <ul className="max-h-72 overflow-y-auto divide-y divide-stone-50">
                                    {notifications.map(n => {
                                        const isUnread = !readIds.has(n.id);
                                        return (
                                            <li
                                                key={n.id}
                                                onClick={() => handleClickNotif(n)}
                                                className={`px-5 py-3.5 cursor-pointer hover:bg-orange-50 flex gap-3 items-start transition-colors ${isUnread ? 'bg-orange-50/40' : ''}`}
                                            >
                                                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? 'bg-rose-500' : 'bg-transparent'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm ${isUnread ? 'font-bold text-stone-800' : 'font-medium text-stone-500'}`}>{n.title}</p>
                                                    <p className="text-xs text-stone-400 truncate mt-0.5">{n.subtitle}</p>
                                                    {n.createdAt && (
                                                        <p className="text-[10px] text-stone-300 mt-0.5">{timeAgo(n.createdAt)}</p>
                                                    )}
                                                </div>
                                                {isUnread && (
                                                    <button
                                                        onClick={e => handleMarkOneRead(e, n.id)}
                                                        className="shrink-0 p-1 mt-0.5 text-stone-300 hover:text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Avatar dropdown */}
                <div ref={avatarRef} className="relative">
                    <button
                        onClick={() => setShowAvatar(v => !v)}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-stone-100 transition-all group"
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white group-hover:ring-orange-200 transition-all">
                            {initials}
                        </div>
                        <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-28 truncate">
                            {auth.email?.split('@')[0]}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
                    </button>

                    {showAvatar && (
                        <div className="absolute right-0 top-12 w-52 bg-white dark:bg-zinc-900 rounded-2xl shadow-level-3 border border-stone-100 dark:border-zinc-800 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-stone-100">
                                <p className="text-sm font-semibold text-stone-800 truncate">{auth.email}</p>
                                <p className="text-xs text-stone-400 capitalize">{userRole} account</p>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => { setShowAvatar(false); onNavigate(userRole === 'coordinator' ? 'org_profile' : 'profile'); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-600 hover:bg-stone-50 text-sm transition-colors"
                                >
                                    <User className="w-4 h-4" /> {userRole === 'coordinator' ? 'Org Profile' : 'Profile'}
                                </button>
                                <button
                                    onClick={() => { setShowAvatar(false); onLogout(); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 text-sm transition-colors font-medium"
                                >
                                    <LogOut className="w-4 h-4" /> Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
