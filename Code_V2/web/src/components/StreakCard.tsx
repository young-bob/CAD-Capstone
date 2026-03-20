import { Flame } from 'lucide-react';

interface AttendanceRecord {
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: string;
}

interface StreakCardProps {
  attendance: AttendanceRecord[];
}

function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return start.toISOString().slice(0, 10);
}

export function computeStreak(attendance: AttendanceRecord[]): { current: number; best: number } {
  const completedStatuses = new Set(['CheckedOut', 'Confirmed', 'Resolved']);
  const activeWeeks = new Set<string>();

  for (const record of attendance) {
    if (completedStatuses.has(record.status) && record.checkInTime) {
      activeWeeks.add(getWeekKey(new Date(record.checkInTime)));
    }
  }

  if (activeWeeks.size === 0) return { current: 0, best: 0 };

  // Generate last 52 week keys from today
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 0; i < 52; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getWeekKey(d));
  }

  // Current streak from most recent week backwards
  let current = 0;
  for (const w of weeks) {
    if (activeWeeks.has(w)) current++;
    else break;
  }

  // Best streak (all time)
  const sorted = [...activeWeeks].sort();
  let best = 0;
  let run = 0;
  let prevMs = 0;
  for (const w of sorted) {
    const ms = new Date(w).getTime();
    if (prevMs && ms - prevMs <= 7 * 24 * 60 * 60 * 1000 + 60000) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prevMs = ms;
  }

  return { current, best };
}

export default function StreakCard({ attendance }: StreakCardProps) {
  const { current, best } = computeStreak(attendance);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex flex-col items-center gap-2 shadow-level-1 card-interactive">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-brand">
        <Flame className="w-5 h-5 text-white" />
      </div>
      <div className="text-center">
        <div className="text-3xl font-black text-orange-600">{current}</div>
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Week Streak</div>
      </div>
      {best > 0 && (
        <div className="text-xs text-stone-400">Best: <span className="font-bold text-stone-600">{best} weeks</span></div>
      )}
    </div>
  );
}
