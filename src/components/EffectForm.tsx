import type { SpellEffect, EffectType, TargetType, DamageType, Weather, AnimalSpirit, CurseCondition, Stats } from '../models/types';
import { STAT_KEYS, STAT_LABELS, createDefaultEffect } from '../models/types';

const EFFECT_TYPES: { value: EffectType; label: string }[] = [
  { value: 'damage', label: 'Dégâts' },
  { value: 'dot', label: 'DoT' },
  { value: 'heal', label: 'Soin' },
  { value: 'hot', label: 'HoT' },
  { value: 'buff', label: 'Buff' },
  { value: 'debuff', label: 'Débuff' },
  { value: 'setWeather', label: 'Changer météo' },
  { value: 'setArcaneElement', label: 'Élément arcanique' },
  { value: 'setAnimalSpirit', label: 'Esprit animal' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'curse', label: 'Malédiction' },
];

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'singleEnemy', label: 'Un ennemi' },
  { value: 'singleAlly', label: 'Un allié' },
  { value: 'allEnemies', label: 'Tous les ennemis' },
  { value: 'allAllies', label: 'Tous les alliés' },
  { value: 'all', label: 'Tout le monde' },
];

const DAMAGE_TYPES: DamageType[] = ['physical', 'magical', 'psychic'];
const WEATHER_VALUES: Weather[] = ['soleil', 'nuages', 'pluie'];
const SPIRITS: AnimalSpirit[] = ['tortue', 'poisson', 'ours', 'loup', 'aigle', 'chauveSouris'];
const CURSE_CONDS: { value: CurseCondition; label: string }[] = [
  { value: 'alive', label: 'Cible en vie' },
  { value: 'above50', label: 'Cible > 50% HP' },
  { value: 'below50', label: 'Cible < 50% HP' },
  { value: 'lastStanding', label: 'Dernier survivant' },
];

interface Props {
  effect: SpellEffect;
  onChange: (e: SpellEffect) => void;
  onRemove: () => void;
  depth?: number;
}

export default function EffectForm({ effect, onChange, onRemove, depth = 0 }: Props) {
  const upd = (partial: Partial<SpellEffect>) => onChange({ ...effect, ...partial });

  const needsDamageType = ['damage', 'dot', 'heal', 'hot'].includes(effect.type);
  const needsCoefficient = ['damage', 'dot', 'heal', 'hot'].includes(effect.type);
  const needsDuration = ['dot', 'hot', 'buff', 'debuff', 'shield', 'curse'].includes(effect.type);
  const needsTick = ['dot', 'hot'].includes(effect.type);
  const needsBuff = ['buff', 'debuff'].includes(effect.type);
  const needsShield = effect.type === 'shield';
  const needsCurse = effect.type === 'curse';

  return (
    <div className="effect-form" style={{ marginLeft: depth * 16 }}>
      <div className="effect-header">
        <select value={effect.type} onChange={e => upd({ type: e.target.value as EffectType })}>
          {EFFECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={effect.targetType} onChange={e => upd({ targetType: e.target.value as TargetType })}>
          {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className="btn-danger btn-sm" onClick={onRemove}>X</button>
      </div>

      <div className="effect-fields">
        {needsDamageType && (
          <label>Type: <select value={effect.damageType ?? 'physical'} onChange={e => upd({ damageType: e.target.value as DamageType })}>
            {DAMAGE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select></label>
        )}
        {needsCoefficient && (
          <label>Coefficient: <input type="number" step="0.1" value={effect.coefficient ?? 1} onChange={e => upd({ coefficient: parseFloat(e.target.value) || 0 })} /></label>
        )}
        {needsDuration && (
          <label>Durée (UT): <input type="number" value={effect.duration ?? 500} onChange={e => upd({ duration: parseInt(e.target.value) || 0 })} /></label>
        )}
        {needsTick && (
          <label>Intervalle tick (UT): <input type="number" value={effect.tickInterval ?? 100} onChange={e => upd({ tickInterval: parseInt(e.target.value) || 0 })} /></label>
        )}
        {needsBuff && (
          <>
            <label>Stat: <select value={effect.buffStat ?? 'physicalPower'} onChange={e => upd({ buffStat: e.target.value as keyof Stats })}>
              {STAT_KEYS.map(k => <option key={k} value={k}>{STAT_LABELS[k]}</option>)}
            </select></label>
            <label>Valeur: <input type="number" value={effect.buffValue ?? 0} onChange={e => upd({ buffValue: parseInt(e.target.value) || 0 })} /></label>
          </>
        )}
        {effect.type === 'setWeather' && (
          <label>Météo: <select value={effect.weather ?? 'soleil'} onChange={e => upd({ weather: e.target.value as Weather })}>
            {WEATHER_VALUES.map(w => <option key={w} value={w}>{w}</option>)}
          </select></label>
        )}
        {effect.type === 'setArcaneElement' && (
          <label>Élément: <input type="text" value={effect.arcaneElement ?? ''} onChange={e => upd({ arcaneElement: e.target.value })} /></label>
        )}
        {effect.type === 'setAnimalSpirit' && (
          <label>Esprit: <select value={effect.animalSpirit ?? 'tortue'} onChange={e => upd({ animalSpirit: e.target.value as AnimalSpirit })}>
            {SPIRITS.map(s => <option key={s} value={s}>{s}</option>)}
          </select></label>
        )}
        {needsShield && (
          <>
            <label>Montant: <input type="number" value={effect.shieldAmount ?? 0} onChange={e => upd({ shieldAmount: parseInt(e.target.value) || 0 })} /></label>
            <label>Types absorbés:
              <div className="checkbox-group">
                {DAMAGE_TYPES.map(dt => (
                  <label key={dt}>
                    <input type="checkbox" checked={(effect.shieldTypes ?? []).includes(dt)}
                      onChange={e => {
                        const cur = effect.shieldTypes ?? [];
                        upd({ shieldTypes: e.target.checked ? [...cur, dt] : cur.filter(x => x !== dt) });
                      }} /> {dt}
                  </label>
                ))}
              </div>
            </label>
          </>
        )}
        {needsCurse && (
          <>
            <label>Condition: <select value={effect.curseCondition ?? 'alive'} onChange={e => upd({ curseCondition: e.target.value as CurseCondition })}>
              {CURSE_CONDS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></label>
            <div className="curse-effects">
              <strong>Effets de la malédiction:</strong>
              {(effect.curseEffects ?? []).map((ce, i) => (
                <EffectForm
                  key={i}
                  effect={ce}
                  onChange={ne => {
                    const copy = [...(effect.curseEffects ?? [])];
                    copy[i] = ne;
                    upd({ curseEffects: copy });
                  }}
                  onRemove={() => upd({ curseEffects: (effect.curseEffects ?? []).filter((_, j) => j !== i) })}
                  depth={depth + 1}
                />
              ))}
              {depth < 1 && (
                <button className="btn-sm" onClick={() => upd({ curseEffects: [...(effect.curseEffects ?? []), createDefaultEffect()] })}>
                  + Effet malédiction
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
