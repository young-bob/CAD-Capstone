import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  variant?: 'default' | 'search' | 'error';
}

export default function EmptyState({ icon: Icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  const iconBg =
    variant === 'error'  ? 'bg-rose-50 text-rose-400' :
    variant === 'search' ? 'bg-stone-100 text-stone-400' :
                           'bg-amber-50 text-amber-400';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>
        <Icon size={28} />
      </div>
      <h3 className="text-stone-800 font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-stone-400 text-sm max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-brand hover:shadow-level-2 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
