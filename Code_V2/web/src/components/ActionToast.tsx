import { X } from 'lucide-react';

type ToastAction = {
    label: string;
    onClick: () => void;
    tone?: 'default' | 'primary' | 'danger';
};

interface ActionToastProps {
    message: string;
    onClose: () => void;
    actions?: ToastAction[];
}

export default function ActionToast({ message, onClose, actions = [] }: ActionToastProps) {
    const actionClass = (tone: ToastAction['tone']) => {
        if (tone === 'primary') return 'bg-orange-500 text-white hover:bg-orange-600';
        if (tone === 'danger') return 'bg-rose-500 text-white hover:bg-rose-600';
        return 'bg-white/20 text-white hover:bg-white/30';
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white rounded-2xl shadow-xl z-50 min-w-[300px] max-w-[92vw]">
            <div className="px-4 py-3 flex items-start gap-3">
                <p className="text-sm font-medium flex-1 leading-6">{message}</p>
                <button onClick={onClose} className="text-stone-300 hover:text-white transition-colors mt-0.5">
                    <X className="w-4 h-4" />
                </button>
            </div>
            {actions.length > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {actions.map(a => (
                        <button
                            key={a.label}
                            onClick={a.onClick}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${actionClass(a.tone)}`}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
