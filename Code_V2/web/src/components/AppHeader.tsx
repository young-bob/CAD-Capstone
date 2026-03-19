/**
 * AppHeader Component
 * 
 * Top navigation bar for the VSMS application.
 * Features:
 *  - Hamburger menu button to toggle the sidebar
 *  - VSMS brand logo and role badge
 *  - Notification bell with dropdown (role-aware: admin / volunteer / coordinator)
 *  - User avatar button that navigates to the Profile page
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Menu, Bell, CheckCheck, Check } from 'lucide-react';
import { adminService } from '../services/admin';
import { attendanceService } from '../services/attendance';
import { applicationService } from '../services/applications';
import { organizationService } from '../services/organizations';
import { useAuth } from '../hooks/useAuth';
import type { ViewName } from '../types';

/** The three possible user display roles */
type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

/** Shape of an in-app notification item */
interface Notification {
    id: string;       // Unique key used for read/unread tracking
    title: string;    // Primary text, e.g. "Application Approved"
    subtitle: string; // Secondary text, e.g. opportunity + shift name
    view: ViewName;   // Target view to navigate to when clicked
}

/** Props accepted by AppHeader */
interface Props {
    userRole: DisplayRole;              // Current user's role
    sidebarOpen: boolean;               // Whether the sidebar is currently expanded
    onToggleSidebar: () => void;        // Callback to toggle sidebar visibility
    onNavigate: (view: ViewName) => void; // Callback to navigate to a specific view
}

export default function AppHeader({ userRole, onToggleSidebar, onNavigate }: Props) {
    const auth = useAuth();

    // ── Notification state ──────────────────────────────────────
    const [showNotif, setShowNotif] = useState(false);           // Controls dropdown visibility
    const [notifications, setNotifications] = useState<Notification[]>([]); // Current notification list
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem('vsms_read_notif_ids');
            return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
        } catch { return new Set<string>(); }
    });
    const notifRef = useRef<HTMLDivElement>(null);                // Ref for click-outside detection

    /**
     * Click-outside handler:
     * Closes the notification dropdown when the user clicks anywhere
     * outside the notification panel.
     */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Persist readIds to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('vsms_read_notif_ids', JSON.stringify([...readIds]));
    }, [readIds]);

    /**
     * Fetches notifications from the backend based on the current user role:
     *  - Admin:       pending org applications + attendance disputes
     *  - Volunteer:   actionable application status updates (Approved, Rejected, etc.)
     *  - Coordinator: pending volunteer applications for their organization
     * 
     * Also prunes stale read IDs that no longer correspond to existing notifications.
     */
    const fetchNotifications = useCallback(async () => {
        try {
            let notifs: Notification[] = [];

            if (userRole === 'admin') {
                // Admin sees pending org registrations and attendance disputes
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
                // Volunteer sees status updates on their own applications
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
                // Coordinator sees new pending volunteer applications
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

            // Prune stale read IDs that no longer match any existing notification
            setReadIds(prev => {
                const existing = new Set(notifs.map(n => n.id));
                return new Set([...prev].filter(id => existing.has(id)));
            });
        } catch { /* Fail silently — notifications are non-critical */ }
    }, [userRole, auth.linkedGrainId]);

    /**
     * Poll notifications on mount and every 30 seconds.
     * Cleanup clears the interval on unmount or dependency change.
     */
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    /** Count of unread notifications (those whose IDs are NOT in readIds) */
    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    /** Mark a single notification as read and navigate to its target view */
    const handleClickNotif = (notif: Notification) => {
        setReadIds(prev => new Set([...prev, notif.id]));
        setShowNotif(false);
        onNavigate(notif.view);
    };

    /** Mark a single notification as read without navigating (via the ✓ button) */
    const handleMarkOneRead = (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation(); // Prevent triggering the parent li's onClick
        setReadIds(prev => new Set([...prev, notifId]));
    };

    /** Mark all notifications as read at once */
    const handleMarkAllRead = () => {
        setReadIds(new Set(notifications.map(n => n.id)));
    };

    // ── Render ──────────────────────────────────────────────────
    return (
        <header className="bg-white border-b border-stone-100 h-16 fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6">

            {/* ── Left section: hamburger + branding ── */}
            <div className="flex items-center gap-4">
                {/* Sidebar toggle button (hamburger icon) */}
                <button onClick={onToggleSidebar} className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 focus:outline-none transition-colors">
                    <Menu className="w-6 h-6" />
                </button>

                {/* VSMS logo and role badge */}
                <div className="flex items-center gap-2">
                    <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
                    <span className="text-lg font-extrabold text-stone-800">VSMS</span>
                    {/* Role badge — hidden on small screens */}
                    <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-500 capitalize">
                        {userRole} Portal
                    </span>
                </div>
            </div>

            {/* ── Right section: notifications + profile avatar ── */}
            <div className="flex items-center gap-4">

                {/* ── Notification bell + dropdown ── */}
                <div ref={notifRef} className="relative">
                    {/* Bell icon button — red dot appears when there are unread notifications */}
                    <button
                        onClick={() => setShowNotif(v => !v)}
                        className="p-2 text-stone-400 hover:text-orange-500 transition-colors relative"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                    </button>

                    {/* Notification dropdown panel */}
                    {showNotif && (
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50">
                            {/* Dropdown header: title + "Mark all read" button */}
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

                            {/* Notification list or empty state */}
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
                                                {/* Unread indicator dot */}
                                                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? 'bg-rose-500' : 'bg-transparent'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm ${isUnread ? 'font-bold text-stone-800' : 'font-medium text-stone-500'}`}>{n.title}</p>
                                                    <p className="text-xs text-stone-400 truncate mt-0.5">{n.subtitle}</p>
                                                </div>
                                                {/* Individual "mark as read" button (only shown for unread items) */}
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

                {/* ── Profile avatar button ── 
                     Displays the first letter of the user's role (V / C / A).
                     Clicking navigates to the Profile page. */}
                <button
                    onClick={() => onNavigate('profile')}
                    className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white hover:ring-orange-300 cursor-pointer transition-all"
                    title="Go to Profile"
                >
                    {userRole === 'volunteer' ? 'V' : userRole === 'coordinator' ? 'C' : 'A'}
                </button>
            </div>
        </header>
    );
}
