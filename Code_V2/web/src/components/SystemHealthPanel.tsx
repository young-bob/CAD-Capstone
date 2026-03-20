import { Server, Activity, ExternalLink } from 'lucide-react';

interface SiloInfo {
  siloAddress: string;
  siloName: string;
  isAlive: boolean;
  activationCount: number;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
}

interface SystemHealthPanelProps {
  silos?: SiloInfo[];
  totalActivations?: number;
  onViewDetails?: () => void;
}

function GaugeArc({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const percent = Math.min(value / max, 1);
  const size = 64;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const halfCirc = Math.PI * radius;
  const dashOffset = halfCirc * (1 - percent);
  const cx = size / 2;
  const cy = size / 2 + 8;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size / 2 + 12 }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={halfCirc}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0.5">
          <span className="text-sm font-black text-stone-800 dark:text-zinc-200">
            {Math.round(value)}<span className="text-xs font-medium text-stone-400 dark:text-zinc-500">%</span>
          </span>
        </div>
      </div>
      <span className="text-xs text-stone-400 dark:text-zinc-500 font-medium">{label}</span>
    </div>
  );
}

export default function SystemHealthPanel({ silos = [], totalActivations = 0, onViewDetails }: SystemHealthPanelProps) {
  const aliveSilos  = silos.filter(s => s.isAlive);
  const downSilos   = silos.filter(s => !s.isAlive);
  const avgCpu      = aliveSilos.length > 0 ? aliveSilos.reduce((sum, s) => sum + (s.cpuUsagePercent ?? 0), 0) / aliveSilos.length : 0;
  const avgMem      = aliveSilos.length > 0 ? aliveSilos.reduce((sum, s) => sum + (s.memoryUsageMb ?? 0), 0) / aliveSilos.length : 0;
  const healthColor = downSilos.length > 0 ? '#f43f5e' : avgCpu > 80 ? '#f59e0b' : '#10b981';
  const healthLabel = downSilos.length > 0 ? 'Degraded' : avgCpu > 80 ? 'High Load' : 'Healthy';
  const healthBadgeBg = downSilos.length > 0
    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
    : avgCpu > 80
    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';
  const stripeColor = downSilos.length > 0 ? 'from-rose-400 to-rose-600' : avgCpu > 80 ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-level-2 border border-stone-100 dark:border-zinc-800 relative overflow-hidden">
      {/* Top accent stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${stripeColor}`} />

      <div className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

          {/* Status block */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
              <Server className="w-5 h-5 text-stone-500 dark:text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: healthColor }} />
                <span className="text-stone-800 dark:text-zinc-200 font-bold text-sm">Orleans Cluster</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${healthBadgeBg}`}>
                  {healthLabel}
                </span>
              </div>
              <p className="text-stone-400 dark:text-zinc-500 text-xs mt-0.5">
                {aliveSilos.length}/{silos.length} silos active · {totalActivations.toLocaleString()} grain activations
              </p>
            </div>
          </div>

          {/* Silo dots */}
          <div className="flex flex-wrap gap-2">
            {silos.map(s => (
              <div
                key={s.siloAddress}
                title={`${s.siloName}: ${s.isAlive ? 'alive' : 'down'} · ${s.activationCount} activations`}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.isAlive ? '#10b981' : '#f43f5e' }}
              />
            ))}
            {silos.length === 0 && (
              <span className="text-stone-400 dark:text-zinc-600 text-xs">No silo data</span>
            )}
          </div>

          {/* CPU / Memory gauges */}
          {aliveSilos.length > 0 && (
            <div className="flex gap-5">
              <GaugeArc value={avgCpu} max={100} color="#f59e0b" label="Avg CPU" />
              <GaugeArc value={(avgMem / 2048) * 100} max={100} color="#8b5cf6" label="Memory" />
            </div>
          )}

          {/* Activations count */}
          <div className="flex items-center gap-2 ml-auto">
            <Activity className="w-4 h-4 text-stone-400 dark:text-zinc-500" />
            <div className="text-center">
              <div className="text-lg font-black text-stone-900 dark:text-zinc-100">{totalActivations.toLocaleString()}</div>
              <div className="text-xs text-stone-400 dark:text-zinc-500">Activations</div>
            </div>
          </div>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors shrink-0"
            >
              Full Details <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
