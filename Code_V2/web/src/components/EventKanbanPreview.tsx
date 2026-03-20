interface OpportunitySummary {
  opportunityId: string;
  title: string;
  status: string;
}

interface EventKanbanPreviewProps {
  opportunities: OpportunitySummary[];
  onViewDetail: (id: string) => void;
}

const COLUMNS = [
  { status: 'Draft',      label: 'Draft',       color: 'text-stone-500', dot: 'bg-stone-300', bg: 'bg-stone-50' },
  { status: 'Published',  label: 'Published',   color: 'text-emerald-600', dot: 'bg-emerald-400', bg: 'bg-emerald-50' },
  { status: 'InProgress', label: 'In Progress', color: 'text-blue-600',  dot: 'bg-blue-400',  bg: 'bg-blue-50'  },
  { status: 'Completed',  label: 'Completed',   color: 'text-violet-600', dot: 'bg-violet-400', bg: 'bg-violet-50' },
];

export default function EventKanbanPreview({ opportunities, onViewDetail }: EventKanbanPreviewProps) {
  return (
    <div className="bg-white rounded-2xl shadow-level-1 border border-stone-100 p-5">
      <h3 className="text-sm font-bold text-stone-700 mb-4">Event Pipeline</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const items = opportunities.filter(o => o.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-1.5">
              {/* Column header */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                <span className="ml-auto text-xs font-bold text-stone-400">{items.length}</span>
              </div>
              {/* Items */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-xs text-stone-300 text-center py-2 bg-stone-50 rounded-lg">—</div>
                ) : (
                  items.map(item => (
                    <button
                      key={item.opportunityId}
                      onClick={() => onViewDetail(item.opportunityId)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium ${col.color} ${col.bg} hover:brightness-95 transition-all truncate`}
                    >
                      {item.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
