import {
    Menu, Search, Briefcase, MapPin, Activity, Users,
    Building, AlertTriangle, User
} from 'lucide-react';
import type { ViewName } from '../types';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface MobileNavItem {
    view: ViewName;
    label: string;
    icon: React.FC<{ className?: string }>;
}

interface Props {
    userRole: DisplayRole;
    currentView: ViewName;
    onNavigate: (view: ViewName) => void;
    badges?: Partial<Record<ViewName, number>>;
}

const MOBILE_ITEMS: Record<DisplayRole, MobileNavItem[]> = {
    volunteer: [
        { view: 'dashboard',     label: 'Home',     icon: ({ className }) => <Menu className={className} /> },
        { view: 'opportunities', label: 'Explore',  icon: ({ className }) => <Search className={className} /> },
        { view: 'applications',  label: 'Applied',  icon: ({ className }) => <Briefcase className={className} /> },
        { view: 'attendance',    label: 'Check-in', icon: ({ className }) => <MapPin className={className} /> },
        { view: 'profile',       label: 'Profile',  icon: ({ className }) => <User className={className} /> },
    ],
    coordinator: [
        { view: 'dashboard',        label: 'Overview', icon: ({ className }) => <Activity className={className} /> },
        { view: 'manage_events',    label: 'Events',   icon: ({ className }) => <Briefcase className={className} /> },
        { view: 'org_applications', label: 'Apply',    icon: ({ className }) => <Users className={className} /> },
        { view: 'org_members',      label: 'Members',  icon: ({ className }) => <User className={className} /> },
    ],
    admin: [
        { view: 'dashboard',      label: 'Overview', icon: ({ className }) => <Activity className={className} /> },
        { view: 'admin_orgs',     label: 'Orgs',     icon: ({ className }) => <Building className={className} /> },
        { view: 'admin_disputes', label: 'Disputes', icon: ({ className }) => <AlertTriangle className={className} /> },
        { view: 'admin_users',    label: 'Users',    icon: ({ className }) => <User className={className} /> },
    ],
};

export default function MobileNav({ userRole, currentView, onNavigate, badges = {} }: Props) {
    const items = MOBILE_ITEMS[userRole];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-stone-100 dark:border-zinc-800 flex safe-area-inset-bottom">
            {items.map(item => {
                const isActive = currentView === item.view;
                const IconComp = item.icon;
                const badge = badges[item.view];

                return (
                    <button
                        key={item.view}
                        onClick={() => onNavigate(item.view)}
                        className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                            isActive ? 'text-orange-500' : 'text-stone-400 dark:text-zinc-500'
                        }`}
                    >
                        {/* Active indicator bar */}
                        {isActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
                        )}
                        <span className="relative">
                            <IconComp className="w-5 h-5" />
                            {!!badge && badge > 0 && (
                                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                                    {badge > 9 ? '9+' : badge}
                                </span>
                            )}
                        </span>
                        <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
