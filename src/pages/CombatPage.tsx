import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Character, Monster } from '../models/types';
import { getCharacters, getMonsters, getSpells, getSettings } from '../store/store';
import { CombatEngine } from '../engine/CombatEngine';
import TimelineBar from '../components/TimelineBar';
import CombatLog from '../components/CombatLog';
import HandDisplay from '../components/HandDisplay';
import CombatantStatus from '../components/CombatantStatus';

export default function CombatPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const engineRef = useRef<CombatEngine | null>(null);
  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate(n => n + 1), []);

  useEffect(() => {
    const t1Ids = (params.get('t1') ?? '').split(',').filter(Boolean);
    const t2Ids = (params.get('t2') ?? '').split(',').filter(Boolean);
    const t2type = params.get('t2type') ?? 'monsters';

    const chars = getCharacters();
    const mons = getMonsters();
    const spells = getSpells();
    const settings = getSettings();

    const team1: Character[] = t1Ids.map(id => chars.find(c => c.id === id)!).filter(Boolean);
    const team2: (Character | Monster)[] = t2type === 'monsters'
      ? t2Ids.map(id => mons.find(m => m.id === id)!).filter(Boolean)
      : t2Ids.map(id => chars.find(c => c.id === id)!).filter(Boolean);

    if (team1.length !== 2 || team2.length < 1 || team2.length > 5) {
      navigate('/combat-setup');
      return;
    }

    const engine = new CombatEngine(settings, spells);
    engine.initCombat(team1, team2);
    engineRef.current = engine;
    engine.advanceUntilInput();
    rerender();
  }, [params, navigate, rerender]);

  const engine = engineRef.current;
  if (!engine) return <div className="page"><p>Chargement...</p></div>;

  const actor = engine.activeActorId ? engine.getCombatant(engine.activeActorId) : null;
  const phase = engine.phase;
  const team0 = engine.combatants.filter(c => c.teamId === 0);
  const team1 = engine.combatants.filter(c => c.teamId === 1);

  const needsEnemy = engine.pendingTargets.needsEnemy && !engine.chosenEnemyId;
  const needsAlly = engine.pendingTargets.needsAlly && !engine.chosenAllyId;

  const handleSpellSelect = (spellId: string) => {
    if (phase !== 'waiting_for_spell') return;
    const result = engine.selectSpell(spellId);
    if (result && !result.needsEnemy && !result.needsAlly) {
      engine.resolveSpellCast_public();
      engine.advanceUntilInput();
    }
    rerender();
  };

  const handleTarget = (targetId: string) => {
    if (phase !== 'waiting_for_target') return;
    const logs = engine.selectTarget(targetId);
    if (logs.length > 0 || engine.phase === 'processing') {
      engine.advanceUntilInput();
    }
    rerender();
  };

  const handlePass = () => {
    if (phase !== 'waiting_for_spell') return;
    engine.passTurn();
    engine.advanceUntilInput();
    rerender();
  };

  const handleRageToggle = () => {
    engine.setRageActivated(!engine.rageActivated);
    rerender();
  };

  const isTargetable = (cId: string) => {
    if (phase !== 'waiting_for_target' || !actor) return false;
    const c = engine.getCombatant(cId);
    if (!c?.alive) return false;
    if (needsEnemy && c.teamId !== actor.teamId) return true;
    if (needsAlly && c.teamId === actor.teamId) return true;
    return false;
  };

  const targetInstruction = () => {
    if (needsEnemy) return 'Choisissez un ennemi';
    if (needsAlly) return 'Choisissez un allié';
    return '';
  };

  return (
    <div className="page combat-page">
      <div className="combat-header">
        <h1>Combat</h1>
        <div className="combat-meta">
          <span>Météo: <strong>{engine.weather}</strong></span>
          {engine.arcaneElement && <span>Arcane: <strong>{engine.arcaneElement}</strong></span>}
        </div>
      </div>

      <TimelineBar
        events={engine.timeline.peekUpcoming(10)}
        combatants={engine.combatants}
        currentTime={engine.timeline.currentTime}
      />

      <div className="combat-arena">
        <div className="team-column">
          <h2>Équipe 1</h2>
          {team0.map(c => (
            <CombatantStatus
              key={c.id}
              combatant={c}
              isActive={c.id === engine.activeActorId}
              isTargetable={isTargetable(c.id)}
              onClick={() => handleTarget(c.id)}
            />
          ))}
        </div>

        <div className="combat-middle">
          {phase === 'combat_over' && (
            <div className="combat-over">
              <h2>Combat terminé!</h2>
              <p>{engine.getWinner() === 0 ? 'Équipe 1 gagne!' : engine.getWinner() === 1 ? 'Équipe 2 gagne!' : 'Match nul!'}</p>
              <button className="btn btn-primary" onClick={() => navigate('/combat-setup')}>Retour</button>
            </div>
          )}

          {phase === 'waiting_for_spell' && actor && (
            <div className="turn-panel">
              <h2>Tour de {actor.name}</h2>
              {actor.className === 'belier' && actor.rage > 0 && (
                <label className="rage-toggle">
                  <input type="checkbox" checked={engine.rageActivated} onChange={handleRageToggle} />
                  Activer rage ({Math.round(actor.rage)})
                </label>
              )}
              <HandDisplay
                hand={engine.currentHand}
                onSelect={handleSpellSelect}
                selectedId={engine.selectedSpellId}
              />
              <button className="btn" onClick={handlePass}>Passer le tour</button>
            </div>
          )}

          {phase === 'waiting_for_target' && (
            <div className="target-panel">
              <h2>{targetInstruction()}</h2>
              <p>Cliquez sur un combattant valide.</p>
            </div>
          )}
        </div>

        <div className="team-column">
          <h2>Équipe 2</h2>
          {team1.map(c => (
            <CombatantStatus
              key={c.id}
              combatant={c}
              isActive={c.id === engine.activeActorId}
              isTargetable={isTargetable(c.id)}
              onClick={() => handleTarget(c.id)}
            />
          ))}
        </div>
      </div>

      <CombatLog entries={engine.log} />
    </div>
  );
}
