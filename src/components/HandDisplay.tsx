import { useState } from 'react';
import type { Spell, SpellEffect, ConditionalEffectGroup } from '../models/types';

const EFFECT_LABELS: Record<string, string> = {
  damage: 'Dégâts', dot: 'DoT', heal: 'Soin', hot: 'HoT',
  buff: 'Buff', debuff: 'Débuff', setWeather: 'Météo',
  setArcaneElement: 'Arcane', setAnimalSpirit: 'Esprit',
  shield: 'Bouclier', curse: 'Malédiction',
};

const TARGET_LABELS: Record<string, string> = {
  singleEnemy: 'un ennemi', singleAlly: 'un allié',
  allEnemies: 'tous ennemis', allAllies: 'tous alliés', all: 'tous',
};

const COND_LABELS: Record<string, (c: any) => string> = {
  weather: c => `Météo = ${c.value}`,
  arcaneElement: c => `Arcane = ${c.value}`,
  weatherAndElement: c => `Météo = ${c.weather} + Arcane = ${c.element}`,
  rageActivated: () => 'Rage activée',
  rageThreshold: c => `Rage ≥ ${c.min}`,
  sacredThreshold: c => `Sacré ≥ ${c.min} (consomme ${c.consume})`,
  targetHasSpirit: c => `Esprit = ${c.spirit}`,
};

function describeEffect(eff: SpellEffect): string {
  const parts: string[] = [];
  parts.push(EFFECT_LABELS[eff.type] ?? eff.type);
  if (eff.damageType) parts.push(eff.damageType);
  if (eff.coefficient != null) parts.push(`coef ${eff.coefficient}`);
  if (eff.duration != null) parts.push(`${eff.duration} UT`);
  if (eff.tickInterval != null) parts.push(`tick ${eff.tickInterval} UT`);
  if (eff.buffStat) parts.push(`${eff.buffStat} ${eff.buffValue != null ? (eff.type === 'buff' ? '+' : '-') + eff.buffValue : ''}`);
  if (eff.shieldAmount != null) parts.push(`${eff.shieldAmount} pts`);
  if (eff.shieldTypes) parts.push(eff.shieldTypes.join('/'));
  if (eff.weather) parts.push(eff.weather);
  if (eff.arcaneElement) parts.push(eff.arcaneElement);
  if (eff.animalSpirit) parts.push(eff.animalSpirit);
  if (eff.curseCondition) parts.push(`si ${eff.curseCondition}`);
  parts.push(`→ ${TARGET_LABELS[eff.targetType] ?? eff.targetType}`);
  return parts.join(' · ');
}

function describeCond(cg: ConditionalEffectGroup): string {
  const fn = COND_LABELS[cg.condition.type];
  return fn ? fn(cg.condition) : cg.condition.type;
}

interface Props {
  hand: Spell[];
  onSelect: (spellId: string) => void;
  selectedId: string | null;
  disabled?: boolean;
}

export default function HandDisplay({ hand, onSelect, selectedId, disabled }: Props) {
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  const toggleInspect = (e: React.MouseEvent, spellId: string) => {
    e.stopPropagation();
    setInspectedId(prev => prev === spellId ? null : spellId);
  };

  return (
    <div className="hand-display">
      <h3>Main</h3>
      <div className="hand-cards">
        {hand.map(spell => (
          <div key={spell.id} className="hand-card-wrapper">
            <button
              className={`hand-card ${selectedId === spell.id ? 'selected' : ''}`}
              onClick={() => onSelect(spell.id)}
              disabled={disabled}
            >
              <div className="card-name">{spell.name}</div>
              <div className="card-cd">CD: {spell.baseCooldown} UT</div>
              <div className="card-effects">{spell.effects.length} effet(s)</div>
              {spell.conditionalEffects.length > 0 && (
                <div className="card-cond">+{spell.conditionalEffects.length} cond.</div>
              )}
              <span className="card-info-btn" onClick={e => toggleInspect(e, spell.id)} title="Voir les effets">?</span>
            </button>

            {inspectedId === spell.id && (
              <div className="card-tooltip">
                <strong>{spell.name}</strong> — CD {spell.baseCooldown} UT
                {spell.effects.length > 0 && (
                  <div className="tooltip-section">
                    <em>Effets :</em>
                    {spell.effects.map((eff, i) => (
                      <div key={i} className="tooltip-line">{describeEffect(eff)}</div>
                    ))}
                  </div>
                )}
                {spell.conditionalEffects.length > 0 && (
                  <div className="tooltip-section">
                    <em>Conditionnels :</em>
                    {spell.conditionalEffects.map((cg, i) => (
                      <div key={i} className="tooltip-cond">
                        <div className="tooltip-cond-label">Si {describeCond(cg)} :</div>
                        {cg.effects.map((eff, j) => (
                          <div key={j} className="tooltip-line">{describeEffect(eff)}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
