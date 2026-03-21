import { useState, useEffect } from 'react';

/** Read-only hook — watches the `dark` class on <html> without modifying it. */
export function useDarkMode(): boolean {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver(() =>
            setDark(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return dark;
}

export type Theme = 'light' | 'dark';

export function useTheme(active = true) {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('vsms_theme') as Theme | null;
        if (stored === 'light' || stored === 'dark') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        if (active) {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            localStorage.setItem('vsms_theme', theme);
        } else {
            // Public pages always light — strip dark class without touching stored preference
            document.documentElement.classList.remove('dark');
        }
    }, [theme, active]);

    return {
        theme,
        toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    };
}
