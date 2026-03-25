import type { ConditionalEffectGroup, SpellCondition, SpellEffect, Weather, AnimalSpirit } from '../models/types';
import { createDefaultEffect } from '../models/types';
import EffectForm from './EffectForm';

const CONDITION_TYPES = [
  { value: 'weather', label: 'Météo' },
  { value: 'arcaneElement', label: 'Élément arcanique' },
  { value: 'weatherAndElement', label: 'Météo + Élément' },
  { value: 'rageActivated', label: 'Rage activée (Bélier)' },
  { value: 'rageThreshold', label: 'Seuil de rage (Bélier)' },
  { value: 'sacredThreshold', label: 'Seuil de sacré (Clerc)' },
  { value: 'targetHasSpirit', label: 'Esprit animal (Animiste)' },
];

const WEATHERS: Weather[] = ['soleil', 'nuages', 'pluie'];
const SPIRITS: AnimalSpirit[] = ['tortue', 'poisson', 'ours', 'loup', 'aigle', 'chauveSouris'];

interface Props {
  group: ConditionalEffectGroup;
  onChange: (g: ConditionalEffectGroup) => void;
  onRemove: () => void;
}

export default function ConditionalBlock({ group, onChange, onRemove }: Props) {
  const cond = group.condition;

  const setCondType = (type: string) => {
    let newCond: SpellCondition;
    switch (type) {
      case 'weather': newCond = { type: 'weather', value: 'soleil' }; break;
      case 'arcaneElement': newCond = { type: 'arcaneElement', value: '' }; break;
      case 'weatherAndElement': newCond = { type: 'weatherAndElement', weather: 'soleil', element: '' }; break;
      case 'rageActivated': newCond = { type: 'rageActivated' }; break;
      case 'rageThreshold': newCond = { type: 'rageThreshold', min: 50 }; break;
      case 'sacredThreshold': newCond = { type: 'sacredThreshold', min: 50, consume: 50 }; break;
      case 'targetHasSpirit': newCond = { type: 'targetHasSpirit', spirit: 'tortue' }; break;
      default: newCond = { type: 'weather', value: 'soleil' };
    }
    onChange({ ...group, condition: newCond });
  };

  const updCond = (partial: Partial<SpellCondition>) => {
    onChange({ ...group, condition: { ...cond, ...partial } as SpellCondition });
  };

  const updEffect = (idx: number, eff: SpellEffect) => {
    const effs = [...group.effects];
    effs[idx] = eff;
    onChange({ ...group, effects: effs });
  };

  return (
    <div className="conditional-block">
      <div className="cond-header">
        <select value={cond.type} onChange={e => setCondType(e.target.value)}>
          {CONDITION_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
        </select>
        <button className="btn-danger btn-sm" onClick={onRemove}>X</button>
      </div>

      <div className="cond-params">
        {cond.type === 'weather' && (
          <select value={cond.value} onChange={e => updCond({ value: e.target.value as Weather })}>
            {WEATHERS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}
        {cond.type === 'arcaneElement' && (
          <input type="text" placeholder="Élément" value={cond.value} onChange={e => updCond({ value: e.target.value })} />
        )}
        {cond.type === 'weatherAndElement' && (
          <>
            <select value={cond.weather} onChange={e => updCond({ weather: e.target.value as Weather })}>
              {WEATHERS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <input type="text" placeholder="Élément" value={cond.element} onChange={e => updCond({ element: e.target.value })} />
          </>
        )}
        {cond.type === 'rageThreshold' && (
          <label>Rage min: <input type="number" value={cond.min} onChange={e => updCond({ min: parseInt(e.target.value) || 0 })} /></label>
        )}
        {cond.type === 'sacredThreshold' && (
          <>
            <label>Sacré min: <input type="number" value={cond.min} onChange={e => updCond({ min: parseInt(e.target.value) || 0 })} /></label>
            <label>Consomme: <input type="number" value={cond.consume} onChange={e => updCond({ consume: parseInt(e.target.value) || 0 })} /></label>
          </>
        )}
        {cond.type === 'targetHasSpirit' && (
          <select value={cond.spirit} onChange={e => updCond({ spirit: e.target.value as AnimalSpirit })}>
            {SPIRITS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="cond-effects">
        <strong>Effets conditionnels:</strong>
        {group.effects.map((eff, i) => (
          <EffectForm
            key={i}
            effect={eff}
            onChange={e => updEffect(i, e)}
            onRemove={() => onChange({ ...group, effects: group.effects.filter((_, j) => j !== i) })}
          />
        ))}
        <button className="btn-sm" onClick={() => onChange({ ...group, effects: [...group.effects, createDefaultEffect()] })}>
          + Effet
        </button>
      </div>
    </div>
  );
}
