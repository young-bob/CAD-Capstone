import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string;       // ISO date string, e.g. "2026-03-15" or full ISO
    color?: string;     // Tailwind bg class, e.g. "bg-emerald-500"
    label?: string;     // Small status/category label
}

interface Props {
    events: CalendarEvent[];
    onEventClick?: (id: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function isoToDate(iso: string): Date {
    // Parse safely — take just the date portion to avoid timezone shifts
    const d = iso.split('T')[0];
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
}

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DEFAULT_COLORS = [
    'bg-amber-400', 'bg-orange-400', 'bg-emerald-500',
    'bg-blue-400',  'bg-violet-400', 'bg-rose-400',
];

export default function EventCalendar({ events, onEventClick }: Props) {
    const today = new Date();
    const [year, setYear]   = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());

    const goToPrev = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const goToNext = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };
    const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

    // Build map: "YYYY-MM-DD" → CalendarEvent[]
    const eventsByDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach((ev, i) => {
            if (!ev.date) return;
            try {
                const key = dateKey(isoToDate(ev.date));
                const arr = map.get(key) ?? [];
                // Assign a default color if none provided
                arr.push({ ...ev, color: ev.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] });
                map.set(key, arr);
            } catch { /* skip malformed dates */ }
        });
        return map;
    }, [events]);

    // Build grid cells: 42 cells (6 weeks × 7 days)
    const cells = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const result: { date: Date; isCurrentMonth: boolean }[] = [];
        // Leading cells (prev month)
        for (let i = firstDay - 1; i >= 0; i--) {
            result.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
        }
        // Current month cells
        for (let d = 1; d <= daysInMonth; d++) {
            result.push({ date: new Date(year, month, d), isCurrentMonth: true });
        }
        // Trailing cells (next month)
        let next = 1;
        while (result.length < 42) {
            result.push({ date: new Date(year, month + 1, next++), isCurrentMonth: false });
        }
        return result;
    }, [year, month]);

    const todayKey = dateKey(today);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-zinc-100">
                        {MONTH_NAMES[month]} {year}
                    </h2>
                    <button
                        onClick={goToToday}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 transition-colors"
                    >
                        Today
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={goToPrev}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-stone-100 dark:border-zinc-800">
                {DAY_NAMES.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-bold text-stone-400 dark:text-zinc-600 uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 dark:divide-zinc-800">
                {cells.map((cell, idx) => {
                    const key = dateKey(cell.date);
                    const dayEvents = eventsByDay.get(key) ?? [];
                    const isToday = key === todayKey;
                    const MAX_VISIBLE = 2;

                    return (
                        <div
                            key={idx}
                            className={`min-h-[80px] p-1.5 ${
                                cell.isCurrentMonth
                                    ? 'bg-white dark:bg-zinc-900'
                                    : 'bg-stone-50/60 dark:bg-zinc-950/60'
                            }`}
                        >
                            {/* Day number */}
                            <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${
                                    isToday
                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold'
                                        : cell.isCurrentMonth
                                            ? 'text-stone-700 dark:text-zinc-300'
                                            : 'text-stone-300 dark:text-zinc-700'
                                }`}
                            >
                                {cell.date.getDate()}
                            </span>

                            {/* Event pills */}
                            <div className="space-y-0.5">
                                {dayEvents.slice(0, MAX_VISIBLE).map(ev => (
                                    <button
                                        key={ev.id}
                                        onClick={() => onEventClick?.(ev.id)}
                                        title={ev.title}
                                        className={`w-full text-left text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-md truncate ${ev.color} hover:opacity-80 transition-opacity`}
                                    >
                                        {ev.title}
                                    </button>
                                ))}
                                {dayEvents.length > MAX_VISIBLE && (
                                    <p className="text-[10px] text-stone-400 dark:text-zinc-600 font-medium px-1">
                                        +{dayEvents.length - MAX_VISIBLE} more
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend — if events have labels */}
            {events.some(e => e.label) && (
                <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-stone-100 dark:border-zinc-800">
                    {[...new Set(events.filter(e => e.label).map(e => JSON.stringify({ label: e.label, color: e.color })))].map(raw => {
                        const { label, color } = JSON.parse(raw);
                        return (
                            <div key={label} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
                                <span className={`w-2.5 h-2.5 rounded-sm ${color ?? 'bg-amber-400'}`} />
                                {label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
