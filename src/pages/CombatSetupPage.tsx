import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character, Monster } from '../models/types';
import { getCharacters, getMonsters, getSpells } from '../store/store';

export default function CombatSetupPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [team2Type, setTeam2Type] = useState<'characters' | 'monsters'>('monsters');
  const [error, setError] = useState('');

  useEffect(() => {
    setCharacters(getCharacters());
    setMonsters(getMonsters());
  }, []);

  const team2Max = team2Type === 'monsters' ? 5 : 2;

  const toggleTeam1 = (id: string) => {
    if (team1.includes(id)) setTeam1(team1.filter(x => x !== id));
    else if (team1.length < 2) setTeam1([...team1, id]);
  };

  const toggleTeam2 = (id: string) => {
    if (team2.includes(id)) setTeam2(team2.filter(x => x !== id));
    else if (team2.length < team2Max) setTeam2([...team2, id]);
  };

  const validate = (): string | null => {
    if (team1.length !== 2) return 'Équipe 1 doit avoir 2 personnages';
    if (team2Type === 'monsters' && (team2.length < 1 || team2.length > 5))
      return 'Équipe 2 doit avoir entre 1 et 5 monstres';
    if (team2Type === 'characters' && team2.length !== 2)
      return 'Équipe 2 doit avoir 2 personnages';
    const spells = getSpells();
    for (const charId of team1) {
      const ch = characters.find(c => c.id === charId);
      if (!ch) return 'Personnage introuvable';
      const validSpells = ch.deckSpellIds.filter(sid => spells.some(s => s.id === sid));
      if (validSpells.length < 5) return `${ch.name} a moins de 5 sorts valides dans son deck`;
    }
    if (team2Type === 'characters') {
      for (const charId of team2) {
        const ch = characters.find(c => c.id === charId);
        if (!ch) return 'Personnage introuvable';
        const validSpells = ch.deckSpellIds.filter(sid => spells.some(s => s.id === sid));
        if (validSpells.length < 5) return `${ch.name} a moins de 5 sorts valides dans son deck`;
      }
    }
    return null;
  };

  const launch = () => {
    const err = validate();
    if (err) { setError(err); return; }
    const params = new URLSearchParams();
    params.set('t1', team1.join(','));
    params.set('t2', team2.join(','));
    params.set('t2type', team2Type);
    navigate(`/combat?${params.toString()}`);
  };

  return (
    <div className="page">
      <h1>Configuration du Combat</h1>

      <div className="setup-grid">
        <section>
          <h2>Équipe 1 — Personnages ({team1.length}/2)</h2>
          {characters.map(c => (
            <label key={c.id} className={`setup-pick ${team1.includes(c.id) ? 'selected' : ''}`}>
              <input type="checkbox" checked={team1.includes(c.id)} onChange={() => toggleTeam1(c.id)} disabled={!team1.includes(c.id) && team1.length >= 2} />
              {c.name} <span className="badge">{c.className}</span>
            </label>
          ))}
          {characters.length === 0 && <p className="text-dim">Aucun personnage créé.</p>}
        </section>

        <section>
          <h2>Équipe 2 ({team2.length}/{team2Max})</h2>
          <div className="form-row">
            <label>
              <input type="radio" checked={team2Type === 'monsters'} onChange={() => { setTeam2Type('monsters'); setTeam2([]); }} /> Monstres
            </label>
            <label>
              <input type="radio" checked={team2Type === 'characters'} onChange={() => { setTeam2Type('characters'); setTeam2([]); }} /> Personnages
            </label>
          </div>
          {team2Type === 'monsters'
            ? monsters.map(m => (
              <label key={m.id} className={`setup-pick ${team2.includes(m.id) ? 'selected' : ''}`}>
                <input type="checkbox" checked={team2.includes(m.id)} onChange={() => toggleTeam2(m.id)} disabled={!team2.includes(m.id) && team2.length >= team2Max} />
                {m.name} <span className="badge badge-red">Monstre</span>
              </label>
            ))
            : characters.map(c => (
              <label key={c.id} className={`setup-pick ${team2.includes(c.id) ? 'selected' : ''}`}>
                <input type="checkbox" checked={team2.includes(c.id)} onChange={() => toggleTeam2(c.id)} disabled={!team2.includes(c.id) && team2.length >= team2Max} />
                {c.name} <span className="badge">{c.className}</span>
              </label>
            ))
          }
          {team2Type === 'monsters' && monsters.length === 0 && <p className="text-dim">Aucun monstre créé.</p>}
        </section>
      </div>

      {error && <p className="text-danger">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-primary btn-lg" onClick={launch}>Lancer le combat</button>
      </div>
    </div>
  );
}
