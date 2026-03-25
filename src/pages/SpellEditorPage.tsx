import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Spell, ClassName, ConditionalEffectGroup } from '../models/types';
import { createDefaultEffect, createDefaultSpell } from '../models/types';
import { getSpells, saveSpell, deleteSpell } from '../store/store';
import EffectForm from '../components/EffectForm';
import ConditionalBlock from '../components/ConditionalBlock';

const CLASSES: (ClassName | '')[] = ['', 'arcaniste', 'animiste', 'belier', 'clerc', 'damne'];

export default function SpellEditorPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [current, setCurrent] = useState<Spell | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => { setSpells(getSpells()); }, []);

  const reload = () => setSpells(getSpells());

  const startNew = () => {
    const s = createDefaultSpell(uuid());
    setCurrent(s);
  };

  const edit = (s: Spell) => setCurrent({ ...s, effects: [...s.effects], conditionalEffects: [...s.conditionalEffects] });

  const save = () => {
    if (!current || !current.name.trim()) return;
    saveSpell(current);
    reload();
    setCurrent(null);
  };

  const remove = (id: string) => {
    deleteSpell(id);
    reload();
    if (current?.id === id) setCurrent(null);
  };

  const upd = (partial: Partial<Spell>) => {
    if (current) setCurrent({ ...current, ...partial });
  };

  const filtered = filter ? spells.filter(s => s.classRestriction === filter) : spells;

  return (
    <div className="page">
      <h1>Éditeur de Sorts</h1>
      <div className="editor-layout">
        <aside className="entity-list">
          <div className="list-header">
            <button className="btn" onClick={startNew}>+ Nouveau sort</button>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">Toutes classes</option>
              {CLASSES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {filtered.map(s => (
            <div key={s.id} className={`list-item ${current?.id === s.id ? 'active' : ''}`} onClick={() => edit(s)}>
              <span>{s.name || '(sans nom)'}</span>
              {s.classRestriction && <span className="badge">{s.classRestriction}</span>}
              <button className="btn-danger btn-sm" onClick={e => { e.stopPropagation(); remove(s.id); }}>X</button>
            </div>
          ))}
        </aside>

        {current && (
          <main className="entity-editor">
            <div className="form-row">
              <label>Nom: <input type="text" value={current.name} onChange={e => upd({ name: e.target.value })} /></label>
              <label>Cooldown (UT): <input type="number" value={current.baseCooldown} onChange={e => upd({ baseCooldown: parseInt(e.target.value) || 0 })} /></label>
              <label>Classe: <select value={current.classRestriction ?? ''} onChange={e => upd({ classRestriction: (e.target.value || undefined) as ClassName | undefined })}>
                {CLASSES.map(c => <option key={c} value={c}>{c || 'Aucune'}</option>)}
              </select></label>
            </div>

            <section>
              <h3>Effets de base</h3>
              {current.effects.map((eff, i) => (
                <EffectForm
                  key={i}
                  effect={eff}
                  onChange={ne => { const e = [...current.effects]; e[i] = ne; upd({ effects: e }); }}
                  onRemove={() => upd({ effects: current.effects.filter((_, j) => j !== i) })}
                />
              ))}
              <button className="btn" onClick={() => upd({ effects: [...current.effects, createDefaultEffect()] })}>
                + Effet
              </button>
            </section>

            <section>
              <h3>Effets conditionnels</h3>
              {current.conditionalEffects.map((cg, i) => (
                <ConditionalBlock
                  key={i}
                  group={cg}
                  onChange={ng => { const c = [...current.conditionalEffects]; c[i] = ng; upd({ conditionalEffects: c }); }}
                  onRemove={() => upd({ conditionalEffects: current.conditionalEffects.filter((_, j) => j !== i) })}
                />
              ))}
              <button className="btn" onClick={() => {
                const newCg: ConditionalEffectGroup = { condition: { type: 'weather', value: 'soleil' }, effects: [] };
                upd({ conditionalEffects: [...current.conditionalEffects, newCg] });
              }}>
                + Bloc conditionnel
              </button>
            </section>

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
