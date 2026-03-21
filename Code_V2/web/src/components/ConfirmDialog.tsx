import { useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

type Variant = 'danger' | 'warning';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: Variant;
    onConfirm: () => void;
    onCancel: () => void;
}

const VARIANT_STYLES: Record<Variant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; btn: string }> = {
    danger:  { icon: Trash2,        iconBg: 'bg-rose-50 dark:bg-rose-950/40',   iconColor: 'text-rose-500',  btn: 'bg-rose-500 hover:bg-rose-600 text-white' },
    warning: { icon: AlertTriangle, iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
};

export default function ConfirmDialog({
    open, title, message,
    confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    variant = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const s = VARIANT_STYLES[variant];
    const Icon = s.icon;

    useEffect(() => {
        if (open) setTimeout(() => cancelRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} style={{ animation: 'fade-in 0.15s ease' }} />
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-level-3 border border-stone-100 dark:border-zinc-800 w-full max-w-sm p-6" style={{ animation: 'slide-up 0.2s cubic-bezier(0.22,1,0.36,1)' }}>
                <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 dark:text-zinc-100">{title}</h3>
                        <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6 justify-end">
                    <button ref={cancelRef} onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
                        {cancelLabel}
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${s.btn}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Imperative hook: const { confirm, dialog } = useConfirm() ─────────────────
interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: Variant;
}

export function useConfirm() {
    const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
        new Promise(resolve => setState({ ...opts, resolve }))
    , []);

    const dialog = state ? (
        <ConfirmDialog
            open
            title={state.title}
            message={state.message}
            confirmLabel={state.confirmLabel}
            variant={state.variant}
            onConfirm={() => { state.resolve(true);  setState(null); }}
            onCancel={()  => { state.resolve(false); setState(null); }}
        />
    ) : null;

    return { confirm, dialog };
}
