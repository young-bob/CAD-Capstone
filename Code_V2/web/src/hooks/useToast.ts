import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
}

let idCounter = 0;
let _store: Toast[] = [];
const _listeners = new Set<() => void>();

function _notify() { _listeners.forEach(l => l()); }

function _push(type: ToastType, title: string, message?: string) {
    const id = ++idCounter;
    _store = [..._store, { id, type, title, message }];
    _notify();
    setTimeout(() => { _store = _store.filter(t => t.id !== id); _notify(); }, 4000);
}

export function dismiss(id: number) {
    _store = _store.filter(t => t.id !== id);
    _notify();
}

export const toast = {
    success: (title: string, message?: string) => _push('success', title, message),
    error:   (title: string, message?: string) => _push('error',   title, message),
    info:    (title: string, message?: string) => _push('info',    title, message),
    warning: (title: string, message?: string) => _push('warning', title, message),
};

export function useToastStore(): Toast[] {
    const [, rerender] = useState(0);
    useEffect(() => {
        const handler = () => rerender(n => n + 1);
        _listeners.add(handler);
        return () => { _listeners.delete(handler); };
    }, []);
    return _store;
}
