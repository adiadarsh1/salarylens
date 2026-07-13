import { motion } from 'framer-motion';

interface RingProps {
  pct: number; // 0..1
  size?: number;
  stroke?: number;
  label: string;
  sublabel: string;
}

/** Animated take-home percentage ring gauge. */
export function Ring({ pct, size = 116, stroke = 11, label, sublabel }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34e0a1" />
            <stop offset="1" stopColor="#0aa874" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b2740" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - c * clamped }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-2xl font-extrabold text-white">{label}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{sublabel}</div>
        </div>
      </div>
    </div>
  );
}
