import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 650): number {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        let start: number | null = null;

        const tick = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return value;
}
