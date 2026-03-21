import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    compact?: boolean;
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
            <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center mb-4`}>
                <Icon className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-stone-400 dark:text-zinc-500`} />
            </div>
            <h3 className={`font-bold text-stone-700 dark:text-zinc-300 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
            {description && (
                <p className={`text-stone-400 dark:text-zinc-500 mt-1 max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-brand hover:shadow-level-2 transition-all hover:-translate-y-0.5"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
