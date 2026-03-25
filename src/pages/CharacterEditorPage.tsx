import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Character, ClassName } from '../models/types';
import { createDefaultStats } from '../models/types';
import { getCharacters, saveCharacter, deleteCharacter, getSpells } from '../store/store';
import StatBlock from '../components/StatBlock';

const CLASSES: ClassName[] = ['arcaniste', 'animiste', 'belier', 'clerc', 'damne'];

export default function CharacterEditorPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [current, setCurrent] = useState<Character | null>(null);
  const [allSpells, setAllSpells] = useState<{ id: string; name: string; classRestriction?: ClassName }[]>([]);

  useEffect(() => {
    setCharacters(getCharacters());
    setAllSpells(getSpells().map(s => ({ id: s.id, name: s.name, classRestriction: s.classRestriction })));
  }, []);

  const reload = () => { setCharacters(getCharacters()); setAllSpells(getSpells().map(s => ({ id: s.id, name: s.name, classRestriction: s.classRestriction }))); };

  const startNew = () => {
    setCurrent({ id: uuid(), name: '', className: 'arcaniste', stats: createDefaultStats(), deckSpellIds: [] });
  };

  const edit = (c: Character) => setCurrent({ ...c, stats: { ...c.stats }, deckSpellIds: [...c.deckSpellIds] });

  const save = () => {
    if (!current || !current.name.trim()) return;
    saveCharacter(current);
    reload();
    setCurrent(null);
  };

  const remove = (id: string) => {
    deleteCharacter(id);
    reload();
    if (current?.id === id) setCurrent(null);
  };

  const availableSpells = allSpells.filter(s => !s.classRestriction || s.classRestriction === current?.className);

  const toggleDeck = (spellId: string) => {
    if (!current) return;
    const deck = current.deckSpellIds.includes(spellId)
      ? current.deckSpellIds.filter(id => id !== spellId)
      : [...current.deckSpellIds, spellId];
    setCurrent({ ...current, deckSpellIds: deck });
  };

  return (
    <div className="page">
      <h1>Éditeur de Personnages</h1>
      <div className="editor-layout">
        <aside className="entity-list">
          <button className="btn" onClick={startNew}>+ Nouveau personnage</button>
          {characters.map(c => (
            <div key={c.id} className={`list-item ${current?.id === c.id ? 'active' : ''}`} onClick={() => edit(c)}>
              <span>{c.name || '(sans nom)'}</span>
              <span className="badge">{c.className}</span>
              <button className="btn-danger btn-sm" onClick={e => { e.stopPropagation(); remove(c.id); }}>X</button>
            </div>
          ))}
        </aside>

        {current && (
          <main className="entity-editor">
            <div className="form-row">
              <label>Nom: <input type="text" value={current.name} onChange={e => setCurrent({ ...current, name: e.target.value })} /></label>
              <label>Classe: <select value={current.className} onChange={e => setCurrent({ ...current, className: e.target.value as ClassName, deckSpellIds: [] })}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></label>
            </div>

            <h3>Statistiques</h3>
            <StatBlock stats={current.stats} onChange={stats => setCurrent({ ...current, stats })} />

            <h3>Deck ({current.deckSpellIds.length} / 20 sorts) — min 5</h3>
            <div className="deck-picker">
              {availableSpells.length === 0 && <p className="text-dim">Aucun sort disponible. Créez des sorts d'abord.</p>}
              {availableSpells.map(s => (
                <label key={s.id} className={`deck-spell ${current.deckSpellIds.includes(s.id) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={current.deckSpellIds.includes(s.id)}
                    onChange={() => toggleDeck(s.id)}
                    disabled={!current.deckSpellIds.includes(s.id) && current.deckSpellIds.length >= 20}
                  />
                  {s.name || '(sans nom)'}
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={save} disabled={current.deckSpellIds.length < 5}>
                Sauvegarder {current.deckSpellIds.length < 5 && `(min 5 sorts)`}
              </button>
              <button className="btn" onClick={() => setCurrent(null)}>Annuler</button>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
