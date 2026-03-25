import { useRef, useEffect } from 'react';
import type { CombatLogEntry } from '../models/types';

interface Props {
  entries: CombatLogEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  damage: '#ef4444',
  heal: '#22c55e',
  buff: '#3b82f6',
  debuff: '#f59e0b',
  info: '#94a3b8',
  death: '#dc2626',
  curse: '#a855f7',
  weather: '#06b6d4',
  shield: '#64748b',
};

export default function CombatLog({ entries }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries.length]);

  return (
    <div className="combat-log">
      <h3>Journal de combat</h3>
      <div className="log-entries">
        {entries.map((e, i) => (
          <div key={i} className="log-entry" style={{ borderLeftColor: TYPE_COLORS[e.type] ?? '#666' }}>
            <span className="log-time">[{e.time}]</span> {e.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
