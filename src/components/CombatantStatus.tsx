import type { CombatantState } from '../models/types';

interface Props {
  combatant: CombatantState;
  isActive?: boolean;
  isTargetable?: boolean;
  onClick?: () => void;
}

export default function CombatantStatus({ combatant: c, isActive, isTargetable, onClick }: Props) {
  const hpPct = Math.max(0, (c.currentHp / c.baseStats.maxHp) * 100);

  return (
    <div
      className={`combatant-card ${!c.alive ? 'dead' : ''} ${isActive ? 'active-actor' : ''} ${isTargetable ? 'targetable' : ''}`}
      onClick={isTargetable ? onClick : undefined}
    >
      <div className="cb-header">
        <strong>{c.name}</strong>
        {c.className && <span className="badge">{c.className}</span>}
        {c.isMonster && <span className="badge badge-red">Monstre</span>}
      </div>

      <div className="hp-bar-container">
        <div className="hp-bar" style={{ width: `${hpPct}%` }} />
        <span className="hp-text">{c.currentHp} / {c.baseStats.maxHp}</span>
      </div>

      {c.shields.length > 0 && (
        <div className="cb-shields">
          {c.shields.map(s => (
            <span key={s.id} className="badge badge-shield">{s.amount} bouclier ({s.types.join('/')})</span>
          ))}
        </div>
      )}

      <div className="cb-statuses">
        {c.buffs.map(b => <span key={b.id} className="badge badge-blue">+{b.value} {b.stat}</span>)}
        {c.debuffs.map(b => <span key={b.id} className="badge badge-orange">-{b.value} {b.stat}</span>)}
        {c.dots.map(d => <span key={d.id} className="badge badge-red">DoT {d.damageType}</span>)}
        {c.hots.map(h => <span key={h.id} className="badge badge-green">HoT</span>)}
        {c.curses.map(cu => <span key={cu.id} className="badge badge-purple">Maudit ({cu.condition})</span>)}
        {c.animalSpirit && <span className="badge badge-teal">Esprit: {c.animalSpirit}</span>}
      </div>

      {c.className === 'belier' && (
        <div className="gauge">
          <span>Rage: {Math.round(c.rage)}/100</span>
          <div className="gauge-bar"><div className="gauge-fill rage" style={{ width: `${c.rage}%` }} /></div>
        </div>
      )}
      {c.className === 'clerc' && (
        <div className="gauge">
          <span>Sacré: {Math.round(c.sacred)}</span>
          <div className="gauge-bar"><div className="gauge-fill sacred" style={{ width: `${Math.min(100, c.sacred)}%` }} /></div>
        </div>
      )}
    </div>
  );
}
