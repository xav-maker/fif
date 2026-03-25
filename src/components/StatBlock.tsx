import type { Stats } from '../models/types';
import { STAT_KEYS, STAT_LABELS } from '../models/types';

interface Props {
  stats: Stats;
  onChange: (stats: Stats) => void;
  disabled?: boolean;
}

export default function StatBlock({ stats, onChange, disabled }: Props) {
  const set = (key: keyof Stats, val: string) => {
    onChange({ ...stats, [key]: Math.max(0, parseInt(val) || 0) });
  };

  return (
    <div className="stat-block">
      {STAT_KEYS.map(k => (
        <label key={k} className="stat-row">
          <span className="stat-label">{STAT_LABELS[k]}</span>
          <input
            type="number"
            min={0}
            value={stats[k]}
            onChange={e => set(k, e.target.value)}
            disabled={disabled}
          />
        </label>
      ))}
    </div>
  );
}
