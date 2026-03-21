import { useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, UserCheck, FileCheck, AlertTriangle } from 'lucide-react';

export interface ActivityItem {
    id: string;
    type: 'applied' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'new_member' | 'dispute' | 'completed';
    label: string;
    sub?: string;
    timestamp: string; // ISO
}

const TYPE_META: Record<ActivityItem['type'], { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
    applied:     { icon: p => <Clock       {...p} />, color: 'text-blue-600',   bg: 'bg-blue-50' },
    approved:    { icon: p => <CheckCircle2 {...p} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    rejected:    { icon: p => <XCircle     {...p} />, color: 'text-rose-600',   bg: 'bg-rose-50' },
    checked_in:  { icon: p => <UserCheck   {...p} />, color: 'text-amber-600',  bg: 'bg-amber-50' },
    checked_out: { icon: p => <FileCheck   {...p} />, color: 'text-teal-600',   bg: 'bg-teal-50' },
    completed:   { icon: p => <CheckCircle2 {...p} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    new_member:  { icon: p => <UserCheck   {...p} />, color: 'text-orange-600', bg: 'bg-orange-50' },
    dispute:     { icon: p => <AlertTriangle {...p} />, color: 'text-rose-600', bg: 'bg-rose-50' },
};

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

interface Props {
    items: ActivityItem[];
    maxItems?: number;
    title?: string;
}

export default function ActivityFeed({ items, maxItems = 8, title = 'Recent Activity' }: Props) {
    const sorted = useMemo(() =>
        [...items]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxItems),
        [items, maxItems]
    );

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-level-1 border border-stone-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-stone-800 dark:text-zinc-100 mb-4">{title}</h2>
            {sorted.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">No recent activity.</p>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-100 dark:bg-zinc-800" />
                    <div className="space-y-4">
                        {sorted.map(item => {
                            const meta = TYPE_META[item.type];
                            const Icon = meta.icon;
                            return (
                                <div key={item.id} className="flex items-start gap-3 pl-1">
                                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                                        <Icon className={`w-3 h-3 ${meta.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-sm font-semibold text-stone-800 dark:text-zinc-100 truncate">{item.label}</p>
                                        {item.sub && <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5 truncate">{item.sub}</p>}
                                    </div>
                                    <span className="text-xs text-stone-400 dark:text-zinc-600 shrink-0 pt-0.5">{relativeTime(item.timestamp)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
