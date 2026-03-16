import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Menu, Bell, CheckCheck, Check } from 'lucide-react';
import { adminService } from '../services/admin';
import { attendanceService } from '../services/attendance';
import { applicationService } from '../services/applications';
import { organizationService } from '../services/organizations';
import { useAuth } from '../hooks/useAuth';
import type { ViewName } from '../types';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Notification {
    id: string;
    title: string;
    subtitle: string;
    view: ViewName;
}

interface Props {
    userRole: DisplayRole;
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    onNavigate: (view: ViewName) => void;
}

export default function AppHeader({ userRole, onToggleSidebar, onNavigate }: Props) {
    const auth = useAuth();
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
            // Prune stale read IDs that no longer exist
            setReadIds(prev => {
                const existing = new Set(notifs.map(n => n.id));
                return new Set([...prev].filter(id => existing.has(id)));
            });
        } catch { /* silent */ }
    }, [userRole, auth.linkedGrainId]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    const handleClickNotif = (notif: Notification) => {
        setReadIds(prev => new Set([...prev, notif.id]));
        setShowNotif(false);
        onNavigate(notif.view);
    };

    const handleMarkOneRead = (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        setReadIds(prev => new Set([...prev, notifId]));
    };

    const handleMarkAllRead = () => {
        setReadIds(new Set(notifications.map(n => n.id)));
    };

    return (
        <header className="bg-white border-b border-stone-100 h-16 fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 focus:outline-none transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
                    <span className="text-lg font-extrabold text-stone-800">VSMS</span>
                    <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-500 capitalize">
                        {userRole} Portal
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => setShowNotif(v => !v)}
                        className="p-2 text-stone-400 hover:text-orange-500 transition-colors relative"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                    </button>
                    {showNotif && (
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50">
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
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                    {userRole === 'volunteer' ? 'V' : userRole === 'coordinator' ? 'C' : 'A'}
                </div>
            </div>
        </header>
    );
}
