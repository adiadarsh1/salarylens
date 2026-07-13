import { motion } from 'framer-motion';
import { formatCompactINR } from '../lib/format';

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  hint: string;
}

/** Animated horizontal stacked bar with a legend, showing how CTC splits up. */
export function StackedBar({ segments, total }: { segments: Segment[]; total: number }) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-ink-700">
        {visible.map((s, i) => (
          <motion.div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: s.color }}
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }}
            transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.2, 0.7, 0.2, 1] }}
            title={`${s.label}: ${formatCompactINR(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {visible.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] text-slate-300">{s.label}</span>
                <span className="num text-[11px] font-semibold text-white">
                  {formatCompactINR(s.value)}
                </span>
              </div>
              <div className="text-[9px] text-slate-500">{s.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
