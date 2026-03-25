import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Monster, MonsterAttack } from '../models/types';
import { createDefaultStats, createDefaultEffect } from '../models/types';
import { getMonsters, saveMonster, deleteMonster } from '../store/store';
import StatBlock from '../components/StatBlock';
import EffectForm from '../components/EffectForm';
import ConditionalBlock from '../components/ConditionalBlock';
import type { ConditionalEffectGroup } from '../models/types';

function createDefaultAttack(): MonsterAttack {
  return { id: uuid(), name: '', baseCooldown: 200, effects: [], conditionalEffects: [], weight: 1 };
}

export default function MonsterEditorPage() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [current, setCurrent] = useState<Monster | null>(null);

  useEffect(() => { setMonsters(getMonsters()); }, []);
  const reload = () => setMonsters(getMonsters());

  const startNew = () => {
    setCurrent({ id: uuid(), name: '', stats: createDefaultStats(), attacks: [] });
  };

  const edit = (m: Monster) => setCurrent({ ...m, stats: { ...m.stats }, attacks: m.attacks.map(a => ({ ...a, effects: [...a.effects] })) });

  const save = () => {
    if (!current || !current.name.trim()) return;
    saveMonster(current);
    reload();
    setCurrent(null);
  };

  const remove = (id: string) => {
    deleteMonster(id);
    reload();
    if (current?.id === id) setCurrent(null);
  };

  const updAttack = (idx: number, partial: Partial<MonsterAttack>) => {
    if (!current) return;
    const atks = [...current.attacks];
    atks[idx] = { ...atks[idx], ...partial };
    setCurrent({ ...current, attacks: atks });
  };

  return (
    <div className="page">
      <h1>Éditeur de Monstres</h1>
      <div className="editor-layout">
        <aside className="entity-list">
          <button className="btn" onClick={startNew}>+ Nouveau monstre</button>
          {monsters.map(m => (
            <div key={m.id} className={`list-item ${current?.id === m.id ? 'active' : ''}`} onClick={() => edit(m)}>
              <span>{m.name || '(sans nom)'}</span>
              <button className="btn-danger btn-sm" onClick={e => { e.stopPropagation(); remove(m.id); }}>X</button>
            </div>
          ))}
        </aside>

        {current && (
          <main className="entity-editor">
            <label>Nom: <input type="text" value={current.name} onChange={e => setCurrent({ ...current, name: e.target.value })} /></label>

            <h3>Statistiques</h3>
            <StatBlock stats={current.stats} onChange={stats => setCurrent({ ...current, stats })} />

            <h3>Attaques</h3>
            {current.attacks.map((atk, ai) => (
              <div key={atk.id} className="attack-block">
                <div className="form-row">
                  <label>Nom: <input type="text" value={atk.name} onChange={e => updAttack(ai, { name: e.target.value })} /></label>
                  <label>Cooldown: <input type="number" value={atk.baseCooldown} onChange={e => updAttack(ai, { baseCooldown: parseInt(e.target.value) || 0 })} /></label>
                  <label>Poids: <input type="number" min={1} value={atk.weight} onChange={e => updAttack(ai, { weight: Math.max(1, parseInt(e.target.value) || 1) })} /></label>
                  <button className="btn-danger btn-sm" onClick={() => setCurrent({ ...current, attacks: current.attacks.filter((_, j) => j !== ai) })}>
                    Supprimer attaque
                  </button>
                </div>
                <h4>Effets</h4>
                {atk.effects.map((eff, ei) => (
                  <EffectForm
                    key={ei}
                    effect={eff}
                    onChange={ne => { const effs = [...atk.effects]; effs[ei] = ne; updAttack(ai, { effects: effs }); }}
                    onRemove={() => updAttack(ai, { effects: atk.effects.filter((_, j) => j !== ei) })}
                  />
                ))}
                <button className="btn-sm" onClick={() => updAttack(ai, { effects: [...atk.effects, createDefaultEffect()] })}>+ Effet</button>

                <h4>Effets conditionnels</h4>
                {(atk.conditionalEffects ?? []).map((cg, ci) => (
                  <ConditionalBlock
                    key={ci}
                    group={cg}
                    onChange={ng => {
                      const cgs = [...(atk.conditionalEffects ?? [])];
                      cgs[ci] = ng;
                      updAttack(ai, { conditionalEffects: cgs });
                    }}
                    onRemove={() => updAttack(ai, { conditionalEffects: (atk.conditionalEffects ?? []).filter((_, j) => j !== ci) })}
                  />
                ))}
                <button className="btn-sm" onClick={() => {
                  const newCg: ConditionalEffectGroup = { condition: { type: 'weather', value: 'soleil' }, effects: [] };
                  updAttack(ai, { conditionalEffects: [...(atk.conditionalEffects ?? []), newCg] });
                }}>+ Bloc conditionnel</button>
              </div>
            ))}
            <button className="btn" onClick={() => setCurrent({ ...current, attacks: [...current.attacks, createDefaultAttack()] })}>
              + Attaque
            </button>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={save}>Sauvegarder</button>
              <button className="btn" onClick={() => setCurrent(null)}>Annuler</button>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
