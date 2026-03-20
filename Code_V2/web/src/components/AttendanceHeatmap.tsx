interface AttendanceRecord {
  checkInTime?: string | null;
  status: string;
  approvedHours?: number;
}

interface AttendanceHeatmapProps {
  attendance: AttendanceRecord[];
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getColor(hours: number): string {
  if (hours === 0)     return '#f5f5f4'; // stone-100
  if (hours < 2)       return '#fde68a'; // amber-200
  if (hours < 4)       return '#fbbf24'; // amber-400
  if (hours < 6)       return '#f97316'; // orange-500
  return '#f43f5e';                       // rose-500 (6+ hours)
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS   = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function AttendanceHeatmap({ attendance }: AttendanceHeatmapProps) {
  // Build hours-per-day map
  const hoursByDay = new Map<string, number>();
  const completedStatuses = new Set(['CheckedOut', 'Confirmed', 'Resolved']);

  for (const r of attendance) {
    if (completedStatuses.has(r.status) && r.checkInTime) {
      const key = getDateKey(new Date(r.checkInTime));
      hoursByDay.set(key, (hoursByDay.get(key) ?? 0) + (r.approvedHours ?? 1));
    }
  }

  // Build 52-week grid (364 days), starting from Sunday of 52 weeks ago
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - today.getDay() - 51 * 7); // start on Sunday

  const weeks: { date: Date; key: string }[][] = [];
  for (let w = 0; w < 52; w++) {
    const week: { date: Date; key: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      week.push({ date, key: getDateKey(date) });
    }
    weeks.push(week);
  }

  // Month labels: place a label at the first week of each month
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const m = week[0].date.getMonth();
    if (m !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[m], col });
      lastMonth = m;
    }
  });

  const CELL = 13; // cell size + gap in px
  const width = 52 * CELL + 20; // 20px for day labels on left

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: width + 'px' }}>
        {/* Month labels row */}
        <div className="flex ml-5 mb-1" style={{ gap: 0 }}>
          {weeks.map((_, col) => {
            const mp = monthPositions.find(m => m.col === col);
            return (
              <div key={col} style={{ width: CELL + 'px', flexShrink: 0 }}>
                {mp ? <span className="text-[10px] text-stone-400 font-medium">{mp.label}</span> : null}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-px">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-px mr-1" style={{ width: '20px' }}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{ height: (CELL - 1) + 'px', fontSize: '9px' }} className="flex items-center text-stone-400 font-medium">
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-px">
              {week.map(({ date, key }) => {
                const hours = hoursByDay.get(key) ?? 0;
                const isFuture = date > today;
                return (
                  <div
                    key={key}
                    title={isFuture ? '' : `${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}: ${hours > 0 ? hours + ' hours' : 'no activity'}`}
                    style={{
                      width: (CELL - 1) + 'px',
                      height: (CELL - 1) + 'px',
                      backgroundColor: isFuture ? '#fafaf9' : getColor(hours),
                      borderRadius: '2px',
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 ml-5">
          <span className="text-[10px] text-stone-400">Less</span>
          {[0, 1, 3, 5, 7].map(h => (
            <div key={h} style={{ width: 11, height: 11, backgroundColor: getColor(h), borderRadius: '2px' }} />
          ))}
          <span className="text-[10px] text-stone-400">More</span>
        </div>
      </div>
    </div>
  );
}
