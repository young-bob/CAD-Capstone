import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, Menu, Briefcase, MapPin, User, Award, Activity, Users,
    Building, AlertTriangle, FileCheck, Star, UserPlus, Server, ArrowRight
} from 'lucide-react';
import type { ViewName } from '../types';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface CommandItem {
    id: string;
    label: string;
    description: string;
    view: ViewName;
    icon: React.FC<{ className?: string }>;
    role: DisplayRole[];
}

const COMMAND_ITEMS: CommandItem[] = [
    { id: 'dashboard',        label: 'Dashboard',          description: 'Your main overview',             view: 'dashboard',        icon: p => <Menu        {...p} />, role: ['volunteer', 'coordinator', 'admin'] },
    { id: 'opportunities',    label: 'Find Opportunities',  description: 'Browse volunteer events',        view: 'opportunities',    icon: p => <Search      {...p} />, role: ['volunteer'] },
    { id: 'applications',     label: 'My Applications',    description: 'Track your applications',        view: 'applications',     icon: p => <Briefcase   {...p} />, role: ['volunteer'] },
    { id: 'attendance',       label: 'Geo Check-in',       description: 'Check in to your shifts',        view: 'attendance',       icon: p => <MapPin      {...p} />, role: ['volunteer'] },
    { id: 'certificates',     label: 'Certificates',       description: 'Download your certificates',     view: 'certificates',     icon: p => <Award       {...p} />, role: ['volunteer'] },
    { id: 'profile',          label: 'Profile',            description: 'View and edit your profile',     view: 'profile',          icon: p => <User        {...p} />, role: ['volunteer', 'coordinator'] },
    { id: 'skills',           label: 'My Skills',          description: 'Manage your skill set',          view: 'skills',           icon: p => <Star        {...p} />, role: ['volunteer'] },
    { id: 'manage_events',    label: 'Manage Events',      description: 'Create and edit opportunities',  view: 'manage_events',    icon: p => <Briefcase   {...p} />, role: ['coordinator'] },
    { id: 'org_applications', label: 'Applications',       description: 'Review volunteer applications',  view: 'org_applications', icon: p => <Users       {...p} />, role: ['coordinator'] },
    { id: 'org_members',      label: 'Members',            description: 'Manage your team',               view: 'org_members',      icon: p => <UserPlus    {...p} />, role: ['coordinator'] },
    { id: 'manage_templates', label: 'Cert Templates',     description: 'Design certificate templates',   view: 'manage_templates', icon: p => <FileCheck   {...p} />, role: ['coordinator'] },
    { id: 'admin_orgs',       label: 'Organizations',      description: 'Approve or suspend orgs',        view: 'admin_orgs',       icon: p => <Building    {...p} />, role: ['admin'] },
    { id: 'admin_disputes',   label: 'Disputes',           description: 'Resolve attendance disputes',    view: 'admin_disputes',   icon: p => <AlertTriangle {...p} />, role: ['admin'] },
    { id: 'admin_users',      label: 'User Control',       description: 'Manage platform users',          view: 'admin_users',      icon: p => <User        {...p} />, role: ['admin'] },
    { id: 'admin_skills',     label: 'Skills',             description: 'Manage the skills taxonomy',     view: 'admin_skills',     icon: p => <Star        {...p} />, role: ['admin'] },
    { id: 'admin_system_info',label: 'System Info',        description: 'Orleans cluster health',         view: 'admin_system_info',icon: p => <Server      {...p} />, role: ['admin'] },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: ViewName) => void;
    userRole: DisplayRole;
}

export default function CommandPalette({ isOpen, onClose, onNavigate, userRole }: Props) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const items = COMMAND_ITEMS.filter(item =>
        item.role.includes(userRole) &&
        (query === '' || item.label.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()))
    );

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => { setSelected(0); }, [query]);

    const handleSelect = useCallback((item: CommandItem) => {
        onNavigate(item.view);
        onClose();
    }, [onNavigate, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected(s => Math.min(s + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected(s => Math.max(s - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (items[selected]) handleSelect(items[selected]);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, items, selected, handleSelect]);

    // Scroll selected item into view
    useEffect(() => {
        const el = listRef.current?.children[selected] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9998] flex items-start justify-center pt-24 px-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative w-full max-w-xl bg-white rounded-2xl shadow-level-4 border border-stone-100 overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
                    <Search className="w-5 h-5 text-stone-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search views, actions..."
                        className="flex-1 text-sm text-stone-800 placeholder-stone-400 outline-none bg-transparent"
                    />
                    <kbd className="text-xs bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5 text-stone-400 font-mono">Esc</kbd>
                </div>

                {/* Results */}
                {items.length === 0 ? (
                    <div className="py-10 text-center text-stone-400 text-sm">No results for "{query}"</div>
                ) : (
                    <ul ref={listRef} className="max-h-72 overflow-y-auto p-2">
                        {items.map((item, i) => {
                            const IconComp = item.icon;
                            const isSelected = i === selected;
                            return (
                                <li key={item.id}>
                                    <button
                                        onMouseEnter={() => setSelected(i)}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isSelected ? 'bg-amber-50 text-orange-700' : 'text-stone-700 hover:bg-stone-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-orange-100' : 'bg-stone-100'}`}>
                                            <IconComp className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{item.label}</p>
                                            <p className="text-xs text-stone-400 truncate">{item.description}</p>
                                        </div>
                                        {isSelected && <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Footer hint */}
                <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 flex items-center gap-4 text-xs text-stone-400">
                    <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono">↵</kbd> select</span>
                    <span><kbd className="font-mono">Esc</kbd> close</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
