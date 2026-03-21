import { useEffect, useRef, useState } from 'react';

/**
 * Client-side infinite scroll over an already-loaded array.
 * Returns the currently visible slice and a sentinel ref to attach
 * to a bottom sentinel element.
 */
export function useInfiniteList<T>(items: T[], pageSize = 20) {
    const [page, setPage] = useState(1);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Reset page when the source array changes (e.g. filter applied)
    useEffect(() => { setPage(1); }, [items]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setPage(p => p + 1); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const visible = items.slice(0, page * pageSize);
    const hasMore = visible.length < items.length;

    return { visible, hasMore, sentinelRef };
}
