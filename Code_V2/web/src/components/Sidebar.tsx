import { useEffect } from 'react';
import {
    Menu, Search, Briefcase, MapPin, User, Award, Activity, Users,
    Building, AlertTriangle, FileCheck, LogOut, Star, UserPlus, Server,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import type { ViewName } from '../types';
import SidebarTooltip from './SidebarTooltip';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Props {
    userRole: DisplayRole;
    currentView: ViewName;
    sidebarMode: SidebarMode;
    onNavigate: (view: ViewName) => void;
    onLogout: () => void;
    onToggleCollapse: () => void;
    badges?: Partial<Record<ViewName, number>>;
}

interface NavItem {
    view: ViewName;
    label: string;
    icon: React.FC<{ className?: string }>;
}

const VOLUNTEER_ITEMS: { section: string; items: NavItem[] }[] = [
    {
        section: 'Core Features',
        items: [
            { view: 'dashboard',     label: 'Dashboard',         icon: ({ className }) => <Menu className={className} /> },
            { view: 'opportunities', label: 'Find Opportunities', icon: ({ className }) => <Search className={className} /> },
            { view: 'applications',  label: 'My Applications',   icon: ({ className }) => <Briefcase className={className} /> },
            { view: 'attendance',    label: 'Geo Check-in',      icon: ({ className }) => <MapPin className={className} /> },
        ],
    },
    {
        section: 'Personal & Assets',
        items: [
            { view: 'certificates', label: 'Certificates', icon: ({ className }) => <Award className={className} /> },
            { view: 'profile',      label: 'Profile',      icon: ({ className }) => <User className={className} /> },
            { view: 'skills',       label: 'My Skills',    icon: ({ className }) => <Star className={className} /> },
        ],
    },
];

const COORDINATOR_ITEMS: { section: string; items: NavItem[] }[] = [
    {
        section: 'Organization',
        items: [
            { view: 'dashboard',         label: 'Overview',        icon: ({ className }) => <Activity className={className} /> },
            { view: 'manage_events',     label: 'Manage Events',   icon: ({ className }) => <Briefcase className={className} /> },
            { view: 'org_applications',  label: 'Applications',    icon: ({ className }) => <Users className={className} /> },
            { view: 'org_members',       label: 'Members',         icon: ({ className }) => <UserPlus className={className} /> },
            { view: 'manage_templates',  label: 'Cert Templates',  icon: ({ className }) => <FileCheck className={className} /> },
        ],
    },
];

const ADMIN_ITEMS: { section: string; items: NavItem[] }[] = [
    {
        section: 'System Admin',
        items: [
            { view: 'dashboard',          label: 'Platform Overview', icon: ({ className }) => <Activity className={className} /> },
            { view: 'admin_orgs',         label: 'Organizations',     icon: ({ className }) => <Building className={className} /> },
            { view: 'admin_disputes',     label: 'Disputes',          icon: ({ className }) => <AlertTriangle className={className} /> },
            { view: 'admin_users',        label: 'User Control',      icon: ({ className }) => <User className={className} /> },
            { view: 'admin_skills',       label: 'Skills',            icon: ({ className }) => <Star className={className} /> },
            { view: 'admin_system_info',  label: 'System Info',       icon: ({ className }) => <Server className={className} /> },
        ],
    },
];

export default function Sidebar({ userRole, currentView, sidebarMode, onNavigate, onLogout, onToggleCollapse, badges = {} }: Props) {
    const isExpanded  = sidebarMode === 'expanded';
    const isCollapsed = sidebarMode === 'collapsed';
    const isHidden    = sidebarMode === 'hidden';

    const groups =
        userRole === 'volunteer'   ? VOLUNTEER_ITEMS :
        userRole === 'coordinator' ? COORDINATOR_ITEMS :
                                     ADMIN_ITEMS;

    // Flat ordered list — used to assign shortcut keys 1–9
    const allItems = groups.flatMap(g => g.items);
    const shortcutMap: Partial<Record<ViewName, string>> = {};
    allItems.forEach((item, idx) => {
        if (idx < 9) shortcutMap[item.view] = String(idx + 1);
    });
    // Reverse map: key digit → view
    const keyToView: Record<string, ViewName> = {};
    allItems.forEach((item, idx) => {
        if (idx < 9) keyToView[String(idx + 1)] = item.view;
    });

    // Global keyboard shortcuts: press 1–9 to navigate (blocked in inputs)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const view = keyToView[e.key];
            if (view) onNavigate(view);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [keyToView, onNavigate]); // eslint-disable-line react-hooks/exhaustive-deps

    function NavButton({ item }: { item: NavItem }) {
        const isActive = currentView === item.view;
        const IconComp = item.icon;
        const badgeCount = badges[item.view];
        const shortcut = shortcutMap[item.view];

        const btn = (
            <button
                onClick={() => onNavigate(item.view)}
                className={`relative group w-full flex items-center rounded-2xl transition-all duration-150
                    ${isExpanded ? 'gap-3 px-4 py-3 text-left' : 'justify-center p-3'}
                    ${isActive
                        ? 'bg-gradient-to-r from-orange-50 to-amber-50/60 dark:from-orange-950/40 dark:to-amber-950/20 text-orange-600 font-bold shadow-sm'
                        : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-zinc-100 font-medium'
                    }`}
            >
                {/* Active accent bar */}
                {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-400 to-orange-500 rounded-r-full" />
                )}
                {/* Icon with collapsed badge dot */}
                <span className="relative shrink-0">
                    <IconComp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {!isExpanded && !!badgeCount && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </span>
                {isExpanded && <span className="truncate flex-1">{item.label}</span>}
                {/* Right-side slot: badge takes priority over shortcut hint */}
                {isExpanded && (
                    !!badgeCount && badgeCount > 0 ? (
                        <span className="ml-auto shrink-0 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    ) : shortcut ? (
                        <kbd className="ml-auto shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-stone-200 dark:border-zinc-700 text-stone-300 dark:text-zinc-600 bg-stone-50 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            {shortcut}
                        </kbd>
                    ) : null
                )}
            </button>
        );

        return isCollapsed ? (
            <SidebarTooltip label={shortcut ? `${item.label} (${shortcut})` : item.label}>{btn}</SidebarTooltip>
        ) : btn;
    }

    return (
        <aside
            style={{
                width: isExpanded ? '256px' : isCollapsed ? '64px' : '0px',
                transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: isHidden ? 'hidden' : undefined,
            }}
            className="bg-white dark:bg-zinc-900 border-r border-stone-100 dark:border-zinc-800 h-screen fixed left-0 top-0 pt-16 z-40 flex flex-col"
        >
            {/* Scrollable nav area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
                {groups.map(group => (
                    <div key={group.section}>
                        {/* Section heading — hidden in collapsed mode */}
                        {isExpanded && (
                            <p className="px-4 text-xs font-bold text-stone-400 dark:text-zinc-600 uppercase tracking-wider mb-2 mt-5 first:mt-2 whitespace-nowrap">
                                {group.section}
                            </p>
                        )}
                        {isCollapsed && <div className="mt-4 first:mt-2" />}
                        {group.items.map(item => (
                            <NavButton key={item.view} item={item} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Bottom zone: collapse toggle + logout */}
            <div className="border-t border-stone-100 dark:border-zinc-800 p-3 space-y-1 shrink-0">
                {/* Logout */}
                {isCollapsed ? (
                    <SidebarTooltip label="Log Out">
                        <button
                            onClick={onLogout}
                            className="w-full flex justify-center p-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group"
                        >
                            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </SidebarTooltip>
                ) : (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-rose-500 hover:bg-rose-50 transition-all font-bold group"
                    >
                        <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                        {isExpanded && <span>Log Out</span>}
                    </button>
                )}

                {/* Collapse toggle chevron */}
                {isCollapsed ? (
                    <SidebarTooltip label="Expand Sidebar ( [ )">
                        <button
                            onClick={onToggleCollapse}
                            className="w-full flex justify-center p-3 rounded-2xl text-stone-400 dark:text-zinc-600 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-700 dark:hover:text-zinc-300 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </SidebarTooltip>
                ) : (
                    <button
                        onClick={onToggleCollapse}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-2xl text-stone-400 dark:text-zinc-600 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-700 dark:hover:text-zinc-300 transition-all text-xs font-medium group"
                    >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        {isExpanded && (
                            <>
                                <span className="flex-1">Collapse</span>
                                <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-stone-200 dark:border-zinc-700 text-stone-300 dark:text-zinc-600 bg-stone-50 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                    [
                                </kbd>
                            </>
                        )}
                    </button>
                )}
            </div>
        </aside>
    );
}
