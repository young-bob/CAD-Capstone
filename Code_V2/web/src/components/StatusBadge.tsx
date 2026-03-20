interface StatusBadgeProps {
  status: string;
  variant?: 'pill' | 'dot' | 'outlined';
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  // Application statuses
  pending:         { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  approved:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected:        { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  waitlisted:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  promoted:        { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  withdrawn:       { bg: 'bg-stone-100',  text: 'text-stone-600',   dot: 'bg-stone-400' },
  noshow:          { bg: 'bg-stone-100',  text: 'text-stone-500',   dot: 'bg-stone-300' },
  completed:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  // Org statuses
  pendingapproval: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  suspended:       { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  // Opportunity statuses
  draft:           { bg: 'bg-stone-100',  text: 'text-stone-600',   dot: 'bg-stone-400' },
  published:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  inprogress:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  cancelled:       { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  // Attendance statuses
  checkedin:       { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  checkedout:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  disputed:        { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  resolved:        { bg: 'bg-stone-100',  text: 'text-stone-600',   dot: 'bg-stone-400' },
  confirmed:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
};

const DEFAULT_COLORS = { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' };

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/[_\s]/g, '');
}

function formatLabel(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function StatusBadge({ status, variant = 'pill', size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_MAP[normalizeStatus(status)] ?? DEFAULT_COLORS;
  const label = formatLabel(status);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding  = size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1';

  if (variant === 'dot') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${textSize} font-medium ${colors.text}`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        {label}
      </span>
    );
  }

  if (variant === 'outlined') {
    return (
      <span className={`inline-flex items-center ${padding} rounded-full border ${colors.text} border-current ${textSize} font-medium`}>
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${padding} rounded-full ${colors.bg} ${colors.text} ${textSize} font-semibold`}>
      {label}
    </span>
  );
}
