import { Building, CheckCircle, Clock, XCircle, AlertCircle, ChevronRight } from 'lucide-react';

interface OrgHealthCardProps {
  orgName: string | null;
  orgStatus: string | null;
  publishedEvents: number;
  totalApplications: number;
  memberCount: number;
  onEdit?: () => void;
  onResubmit?: () => void;
  onCreateOrg?: () => void;
}

const STATUS_CONFIG: Record<string, {
  icon: typeof CheckCircle;
  lightColor: string;   // text color in light mode
  darkColor: string;    // text color in dark mode
  badgeBg: string;      // badge background
  glowLight: string;    // icon ring in light mode
  glowDark: string;     // icon ring in dark mode
  iconBgLight: string;  // icon container bg light
  iconBgDark: string;   // icon container bg dark
  label: string;
  message: string;
  bannerGradient: string; // left border accent color
}> = {
  Approved: {
    icon: CheckCircle,
    lightColor: 'text-emerald-600',
    darkColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
    glowLight: '0 0 0 4px rgba(52,211,153,0.15)',
    glowDark: '0 0 20px rgba(52,211,153,0.3)',
    iconBgLight: 'bg-emerald-50',
    iconBgDark: 'dark:bg-emerald-950/40',
    label: 'Approved',
    message: 'Your organization is active and visible to volunteers.',
    bannerGradient: 'from-emerald-400 to-teal-500',
  },
  PendingApproval: {
    icon: Clock,
    lightColor: 'text-amber-600',
    darkColor: 'text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
    glowLight: '0 0 0 4px rgba(251,191,36,0.15)',
    glowDark: '0 0 20px rgba(251,191,36,0.3)',
    iconBgLight: 'bg-amber-50',
    iconBgDark: 'dark:bg-amber-950/40',
    label: 'Under Review',
    message: 'Your registration is being reviewed by the platform admin.',
    bannerGradient: 'from-amber-400 to-orange-500',
  },
  Rejected: {
    icon: XCircle,
    lightColor: 'text-rose-600',
    darkColor: 'text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400',
    glowLight: '0 0 0 4px rgba(244,63,94,0.15)',
    glowDark: '0 0 20px rgba(244,63,94,0.3)',
    iconBgLight: 'bg-rose-50',
    iconBgDark: 'dark:bg-rose-950/40',
    label: 'Rejected',
    message: 'Your application was not approved. You may resubmit with corrections.',
    bannerGradient: 'from-rose-400 to-rose-600',
  },
  Suspended: {
    icon: AlertCircle,
    lightColor: 'text-rose-600',
    darkColor: 'text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400',
    glowLight: '0 0 0 4px rgba(244,63,94,0.15)',
    glowDark: '0 0 20px rgba(244,63,94,0.3)',
    iconBgLight: 'bg-rose-50',
    iconBgDark: 'dark:bg-rose-950/40',
    label: 'Suspended',
    message: 'Your organization has been suspended. Contact support for assistance.',
    bannerGradient: 'from-rose-500 to-orange-600',
  },
};

const PENDING_STEPS = [
  { id: 1, label: 'Submitted' },
  { id: 2, label: 'Under Review' },
  { id: 3, label: 'Decision' },
];

export default function OrgHealthCard({
  orgName, orgStatus, publishedEvents, totalApplications, memberCount, onEdit, onResubmit, onCreateOrg
}: OrgHealthCardProps) {
  if (!orgName || !orgStatus) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-level-2 border border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
          <Building className="w-6 h-6 text-stone-400 dark:text-zinc-500" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-stone-400 dark:text-zinc-500 text-sm">No organization yet</p>
          <p className="text-stone-800 dark:text-zinc-100 font-bold text-lg">Create your organization to get started</p>
        </div>
        {onCreateOrg && (
          <button
            onClick={onCreateOrg}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-brand hover:shadow-level-2 transition-all hover:-translate-y-0.5"
          >
            Create Organization
          </button>
        )}
      </div>
    );
  }

  const config = STATUS_CONFIG[orgStatus] ?? STATUS_CONFIG['PendingApproval'];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-level-2 border border-stone-100 dark:border-zinc-800 relative overflow-hidden">
      {/* Top accent stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${config.bannerGradient}`} />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* Status icon */}
          <div
            className={`w-14 h-14 rounded-2xl ${config.iconBgLight} ${config.iconBgDark} flex items-center justify-center shrink-0`}
            style={{ boxShadow: config.glowLight }}
          >
            <StatusIcon className={`w-7 h-7 ${config.lightColor} dark:${config.darkColor}`} />
          </div>

          {/* Org info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-stone-900 dark:text-zinc-100 font-black text-xl truncate">{orgName}</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.badgeBg}`}>
                {config.label}
              </span>
            </div>
            <p className="text-stone-500 dark:text-zinc-400 text-sm mt-1">{config.message}</p>

            {/* Pending steps timeline */}
            {orgStatus === 'PendingApproval' && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {PENDING_STEPS.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 1
                        ? 'bg-amber-400 text-stone-900'
                        : i < 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-stone-200 dark:bg-zinc-700 text-stone-400 dark:text-zinc-500'
                    }`}>
                      {i < 1 ? '✓' : step.id}
                    </div>
                    <span className={`text-xs ${i === 1 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-stone-400 dark:text-zinc-500'}`}>
                      {step.label}
                    </span>
                    {i < PENDING_STEPS.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-stone-300 dark:text-zinc-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPIs */}
          {orgStatus === 'Approved' && (
            <div className="flex gap-6 shrink-0">
              {[
                { label: 'Events', value: publishedEvents },
                { label: 'Applications', value: totalApplications },
                { label: 'Members', value: memberCount },
              ].map(kpi => (
                <div key={kpi.label} className="text-center">
                  <div className="text-2xl font-black text-stone-900 dark:text-zinc-100">{kpi.value}</div>
                  <div className="text-xs text-stone-400 dark:text-zinc-500 font-medium">{kpi.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {orgStatus === 'Approved' && onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
              >
                Edit Org
              </button>
            )}
            {orgStatus === 'Rejected' && onResubmit && (
              <button
                onClick={onResubmit}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-400 text-sm font-semibold transition-colors"
              >
                Resubmit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
