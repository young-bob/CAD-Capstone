import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { type Toast, type ToastType, dismiss, useToastStore } from '../hooks/useToast';

const ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error:   XCircle,
    info:    Info,
    warning: AlertTriangle,
};

const STYLES: Record<ToastType, { bar: string; icon: string; }> = {
    success: { bar: 'bg-emerald-500', icon: 'text-emerald-500' },
    error:   { bar: 'bg-rose-500',    icon: 'text-rose-500'    },
    info:    { bar: 'bg-blue-500',    icon: 'text-blue-500'    },
    warning: { bar: 'bg-amber-500',   icon: 'text-amber-500'   },
};

function ToastItem({ toast }: { toast: Toast }) {
    const [visible, setVisible] = useState(false);
    const s = STYLES[toast.type];
    const Icon = ICONS[toast.type];

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(() => dismiss(toast.id), 300);
    };

    return (
        <div
            style={{
                transform: visible ? 'translateX(0)' : 'translateX(120%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
            }}
            className="relative flex items-start gap-3 w-80 rounded-2xl shadow-level-3 border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-hidden"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.icon}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 dark:text-zinc-100">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">{toast.message}</p>
                )}
            </div>
            <button
                onClick={handleDismiss}
                className="shrink-0 p-0.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
            <div
                className={`absolute bottom-0 left-0 h-0.5 ${s.bar} opacity-40`}
                style={{ animation: 'toast-progress 4s linear forwards' }}
            />
        </div>
    );
}

export default function Toaster() {
    const toasts = useToastStore();
    return (
        <div aria-live="polite" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem toast={t} />
                </div>
            ))}
        </div>
    );
}
