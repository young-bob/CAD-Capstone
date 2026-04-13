import { useEffect, useRef } from 'react';

/**
 * Automatically re-invokes `fetchFn` on a fixed interval.
 * Pauses when the tab is not visible; resumes + immediate fetch on return.
 *
 * The `fetchFn` receives a boolean `silent` argument:
 *  - `false` on the initial call (handled by the component's own useEffect)
 *  - `true`  on background refreshes — the function should skip setLoading(true)
 *
 * @param fetchFn  — the data-loading function: (silent: boolean) => void
 * @param intervalMs — polling interval in ms (default 15 000 = 15 s)
 */
export function useAutoRefresh(fetchFn: (silent: boolean) => void, intervalMs = 15_000) {
    const savedFn = useRef(fetchFn);
    useEffect(() => { savedFn.current = fetchFn; }, [fetchFn]);

    useEffect(() => {
        const tick = () => savedFn.current(true);
        const id = setInterval(tick, intervalMs);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [intervalMs]);
}

