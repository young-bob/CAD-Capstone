/** Primitive shimmer block */
function Shimmer({ className = '' }: { className?: string }) {
    return (
        <div className={`skeleton rounded-lg ${className}`} />
    );
}

/** Single stat card skeleton (matches the KPI cards on dashboards) */
export function SkeletonStatCard() {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-stone-100 dark:border-zinc-800 shadow-level-1">
            <div className="flex items-center gap-3 mb-4">
                <Shimmer className="w-10 h-10 rounded-xl" />
                <Shimmer className="h-4 w-24" />
            </div>
            <Shimmer className="h-8 w-16 mb-2" />
            <Shimmer className="h-3 w-32" />
        </div>
    );
}

/** Dashboard grid of 4 stat card skeletons */
export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
    );
}

/** Full-width panel skeleton (charts, health panels) */
export function SkeletonPanel({ height = 180 }: { height?: number }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-level-1 p-5">
            <div className="flex items-center justify-between mb-4">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-4 w-20" />
            </div>
            <div className="skeleton rounded-lg w-full" style={{ height }} />
        </div>
    );
}

/** Table row skeletons */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-level-1 overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 px-5 py-3 border-b border-stone-100 dark:border-zinc-800">
                {Array.from({ length: cols }).map((_, i) => (
                    <Shimmer key={i} className="h-3 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 px-5 py-4 border-b border-stone-50 dark:border-zinc-800/50 last:border-0">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Shimmer key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[40px]' : ''}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Generic dashboard skeleton (hero + stats + two panels) */
export function SkeletonDashboard() {
    return (
        <div className="space-y-6 animate-content-reveal">
            {/* Hero panel */}
            <SkeletonPanel height={80} />
            {/* Stats */}
            <SkeletonStatGrid />
            {/* Two-col panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonPanel height={200} />
                <SkeletonPanel height={200} />
            </div>
            {/* Table */}
            <SkeletonTable />
        </div>
    );
}
