import { useState, useEffect } from 'react';

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
