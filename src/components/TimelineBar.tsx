import type { TimelineEvent, CombatantState } from '../models/types';

interface Props {
  events: TimelineEvent[];
  combatants: CombatantState[];
  currentTime: number;
}

export default function TimelineBar({ events, combatants, currentTime }: Props) {
  const getName = (id: string) => combatants.find(c => c.id === id)?.name ?? id;
  const actionEvents = events.filter(e => e.type === 'action').slice(0, 8);

  return (
    <div className="timeline-bar">
      <div className="timeline-label">Timeline (UT: {currentTime})</div>
      <div className="timeline-events">
        {actionEvents.map((ev, i) => (
          <div key={ev.id} className={`timeline-event ${i === 0 ? 'next' : ''}`}>
            <span className="tl-name">{getName(ev.actorId)}</span>
            <span className="tl-time">{ev.time} UT</span>
          </div>
        ))}
      </div>
    </div>
  );
}
