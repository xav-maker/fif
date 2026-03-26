import { v4 as uuid } from 'uuid';
import type {
  Spell, Character, Monster, MonsterAttack, ScalingSettings,
  SpellEffect, SpellCondition, CombatantState, CombatLogEntry,
  CombatPhase, Weather, DamageType, AnimalSpirit, TimelineEvent, TimelineEventType,
} from '../models/types';
import { getStatNamesForDamageType } from '../models/types';
import { calculateRawDamage, applyDefense, applyDotDefense, calculateCooldown, calculatePassDuration } from './formulas';
import { Timeline } from './timeline';
import { randomWeather, randomWeatherInterval } from './weather';

export class CombatEngine {
  combatants: CombatantState[] = [];
  timeline = new Timeline();
  weather: Weather = 'soleil';
  arcaneElement: string | null = null;
  log: CombatLogEntry[] = [];
  phase: CombatPhase = 'processing';
  activeActorId: string | null = null;
  currentHand: Spell[] = [];
  selectedSpellId: string | null = null;
  pendingTargets: { needsEnemy: boolean; needsAlly: boolean } = { needsEnemy: false, needsAlly: false };
  chosenEnemyId: string | null = null;
  chosenAllyId: string | null = null;
  rageActivated = false;
  settings: ScalingSettings;
  spellsById: Map<string, Spell>;

  constructor(settings: ScalingSettings, spells: Spell[]) {
    this.settings = settings;
    this.spellsById = new Map(spells.map(s => [s.id, s]));
  }

  initCombat(team1: Character[], team2: (Character | Monster)[]) {
    this.combatants = [];
    const all = [
      ...team1.map(c => this.createCombatant(c, 0, false)),
      ...team2.map(e => 'className' in e
        ? this.createCombatant(e as Character, 1, false)
        : this.createMonsterCombatant(e as Monster, 1)),
    ];
    this.combatants = all;

    const bestInit = Math.max(...all.map(c => c.baseStats.initiative));
    for (const c of all) {
      const startTime = Math.max(0, bestInit - c.baseStats.initiative);
      this.timeline.addEvent({ id: uuid(), time: startTime, type: 'action', actorId: c.id });
    }

    this.weather = randomWeather();
    this.addLog(0, `Météo initiale : ${this.weather}`, 'weather');
    this.scheduleWeatherChange(0);
  }

  private createCombatant(ch: Character, teamId: number, isMonster: boolean): CombatantState {
    return {
      id: ch.id + '_' + uuid().slice(0, 4),
      name: ch.name,
      teamId,
      isMonster,
      className: ch.className,
      baseStats: { ...ch.stats },
      currentHp: ch.stats.maxHp,
      buffs: [], debuffs: [], dots: [], hots: [], shields: [], curses: [],
      rage: 0, sacred: 0, alive: true,
      deckSpellIds: [...ch.deckSpellIds],
    };
  }

  private createMonsterCombatant(mon: Monster, teamId: number): CombatantState {
    return {
      id: mon.id + '_' + uuid().slice(0, 4),
      name: mon.name,
      teamId,
      isMonster: true,
      baseStats: { ...mon.stats },
      currentHp: mon.stats.maxHp,
      buffs: [], debuffs: [], dots: [], hots: [], shields: [], curses: [],
      rage: 0, sacred: 0, alive: true,
      attacks: [...mon.attacks],
    };
  }

  /* ─── stat helpers ─── */

  getEffectiveStat(c: CombatantState, stat: keyof typeof c.baseStats): number {
    let v = c.baseStats[stat];
    for (const b of c.buffs) if (b.stat === stat) v += b.value;
    for (const d of c.debuffs) if (d.stat === stat) v -= d.value;
    return Math.max(0, v);
  }

  getCombatant(id: string): CombatantState {
    return this.combatants.find(c => c.id === id)!;
  }

  getAliveCombatants(teamId?: number): CombatantState[] {
    return this.combatants.filter(c => c.alive && (teamId === undefined || c.teamId === teamId));
  }

  /* ─── main loop ─── */

  advanceUntilInput(): CombatLogEntry[] {
    const newLogs: CombatLogEntry[] = [];
    while (true) {
      if (this.checkWin()) { this.phase = 'combat_over'; break; }
      const ev = this.timeline.peekNext();
      if (!ev) { this.phase = 'combat_over'; break; }

      if (ev.type === 'action') {
        const actor = this.getCombatant(ev.actorId);
        if (!actor || !actor.alive) { this.timeline.getNextEvent(); continue; }
        if (actor.isMonster) {
          this.timeline.getNextEvent();
          newLogs.push(...this.resolveMonsterTurn(actor));
          continue;
        }
        this.timeline.getNextEvent();
        this.activeActorId = actor.id;
        this.currentHand = this.drawHand(actor);
        this.phase = 'waiting_for_spell';
        this.selectedSpellId = null;
        this.rageActivated = false;
        this.addLog(this.timeline.currentTime, `Tour de ${actor.name}`, 'info');
        break;
      }
      this.timeline.getNextEvent();
      newLogs.push(...this.processEvent(ev));
    }
    this.log.push(...newLogs);
    return newLogs;
  }

  private processEvent(ev: TimelineEvent): CombatLogEntry[] {
    const logs: CombatLogEntry[] = [];
    switch (ev.type) {
      case 'dot_tick': logs.push(...this.processDotTick(ev)); break;
      case 'hot_tick': logs.push(...this.processHotTick(ev)); break;
      case 'buff_expire': this.processBuffExpire(ev, 'buff', logs); break;
      case 'debuff_expire': this.processBuffExpire(ev, 'debuff', logs); break;
      case 'shield_expire': this.processShieldExpire(ev, logs); break;
      case 'curse_resolve': logs.push(...this.processCurseResolve(ev)); break;
      case 'weather_change': logs.push(...this.processWeatherChange()); break;
    }
    return logs;
  }

  /* ─── draw hand ─── */

  private drawHand(actor: CombatantState): Spell[] {
    const ids = actor.deckSpellIds ?? [];
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(5, shuffled.length));
    return picked.map(id => this.spellsById.get(id)).filter((s): s is Spell => !!s);
  }

  /* ─── player actions ─── */

  selectSpell(spellId: string): { needsEnemy: boolean; needsAlly: boolean } | null {
    const spell = this.currentHand.find(s => s.id === spellId);
    if (!spell) return null;
    this.selectedSpellId = spellId;
    this.chosenEnemyId = null;
    this.chosenAllyId = null;

    const allEffects = this.collectAllEffects(spell);
    const needsEnemy = allEffects.some(e => e.effect.targetType === 'singleEnemy');
    const needsAlly = allEffects.some(e => e.effect.targetType === 'singleAlly');
    this.pendingTargets = { needsEnemy, needsAlly };

    if (!needsEnemy && !needsAlly) {
      this.phase = 'processing';
    } else {
      this.phase = 'waiting_for_target';
    }
    return this.pendingTargets;
  }

  selectTarget(targetId: string): CombatLogEntry[] {
    const target = this.getCombatant(targetId);
    if (!target) return [];
    const actor = this.getCombatant(this.activeActorId!);

    if (this.pendingTargets.needsEnemy && !this.chosenEnemyId && target.teamId !== actor.teamId) {
      this.chosenEnemyId = targetId;
    } else if (this.pendingTargets.needsAlly && !this.chosenAllyId && target.teamId === actor.teamId) {
      this.chosenAllyId = targetId;
    }

    const still = (this.pendingTargets.needsEnemy && !this.chosenEnemyId)
      || (this.pendingTargets.needsAlly && !this.chosenAllyId);
    if (still) return [];

    return this.resolveSpellCast();
  }

  setRageActivated(val: boolean) { this.rageActivated = val; }

  passTurn(): CombatLogEntry[] {
    const actor = this.getCombatant(this.activeActorId!);
    const dur = calculatePassDuration(
      this.getEffectiveStat(actor, 'speed'),
      this.settings.passBaseDuration,
      this.settings.passMinDuration,
    );
    this.timeline.addEvent({ id: uuid(), time: this.timeline.currentTime + dur, type: 'action', actorId: actor.id });
    const entry: CombatLogEntry = { time: this.timeline.currentTime, message: `${actor.name} passe son tour (${dur} UT)`, type: 'info' };
    this.log.push(entry);
    this.phase = 'processing';
    return [entry];
  }

  /* ─── resolve spell ─── */

  resolveSpellCast_public(): CombatLogEntry[] {
    return this.resolveSpellCast();
  }

  private resolveSpellCast(): CombatLogEntry[] {
    const spell = this.spellsById.get(this.selectedSpellId!)!;
    const caster = this.getCombatant(this.activeActorId!);
    const logs: CombatLogEntry[] = [];

    const allEffects = this.collectAllEffects(spell);
    for (const { effect, spiritFilter } of allEffects) {
      logs.push(...this.resolveEffect(effect, caster, spiritFilter));
    }

    if (caster.className === 'clerc') {
      for (const cg of spell.conditionalEffects) {
        if (cg.condition.type === 'sacredThreshold') {
          if (caster.sacred >= cg.condition.min) {
            caster.sacred = Math.max(0, caster.sacred - cg.condition.consume);
          }
        }
      }
    }

    const cd = calculateCooldown(spell.baseCooldown, this.getEffectiveStat(caster, 'speed'), this.settings.cooldownCap);
    this.timeline.addEvent({ id: uuid(), time: this.timeline.currentTime + cd, type: 'action', actorId: caster.id });
    logs.push({ time: this.timeline.currentTime, message: `${caster.name} lance ${spell.name} (prochain tour dans ${cd} UT)`, type: 'info' });

    this.log.push(...logs);
    this.phase = 'processing';
    return logs;
  }

  private collectAllEffects(spell: Spell): { effect: SpellEffect; spiritFilter?: AnimalSpirit }[] {
    const result: { effect: SpellEffect; spiritFilter?: AnimalSpirit }[] =
      spell.effects.map(effect => ({ effect }));
    for (const cg of spell.conditionalEffects) {
      if (cg.condition.type === 'targetHasSpirit') {
        result.push(...cg.effects.map(effect => ({ effect, spiritFilter: cg.condition.type === 'targetHasSpirit' ? cg.condition.spirit : undefined })));
      } else if (this.evaluateCondition(cg.condition)) {
        result.push(...cg.effects.map(effect => ({ effect })));
      }
    }
    return result;
  }

  private evaluateCondition(cond: SpellCondition): boolean {
    switch (cond.type) {
      case 'weather': return this.weather === cond.value;
      case 'arcaneElement': return this.arcaneElement === cond.value;
      case 'weatherAndElement': return this.weather === cond.weather && this.arcaneElement === cond.element;
      case 'rageActivated': return this.rageActivated;
      case 'rageThreshold': {
        const c = this.getCombatant(this.activeActorId!);
        return c.rage >= cond.min;
      }
      case 'sacredThreshold': {
        const c = this.getCombatant(this.activeActorId!);
        return c.sacred >= cond.min;
      }
      case 'targetHasSpirit': return true;
    }
  }

  /* ─── resolve single effect ─── */

  private resolveEffect(eff: SpellEffect, caster: CombatantState, spiritFilter?: AnimalSpirit): CombatLogEntry[] {
    let targets = this.resolveTargets(eff.targetType, caster);
    if (spiritFilter) {
      targets = targets.filter(t => t.animalSpirit === spiritFilter);
    }
    const logs: CombatLogEntry[] = [];
    for (const target of targets) {
      switch (eff.type) {
        case 'damage': logs.push(...this.applyDamage(caster, target, eff)); break;
        case 'dot': logs.push(...this.applyDot(caster, target, eff)); break;
        case 'heal': logs.push(...this.applyHeal(caster, target, eff)); break;
        case 'hot': logs.push(...this.applyHot(caster, target, eff)); break;
        case 'buff': logs.push(...this.applyBuff(target, eff, 'buff')); break;
        case 'debuff': logs.push(...this.applyBuff(target, eff, 'debuff')); break;
        case 'setWeather': logs.push(...this.applySetWeather(eff)); break;
        case 'setArcaneElement': logs.push(...this.applySetArcane(eff)); break;
        case 'setAnimalSpirit': logs.push(...this.applySetSpirit(target, eff)); break;
        case 'shield': logs.push(...this.applyShield(target, eff)); break;
        case 'curse': logs.push(...this.applyCurse(caster, target, eff)); break;
      }
    }
    return logs;
  }

  private resolveTargets(tt: SpellEffect['targetType'], caster: CombatantState): CombatantState[] {
    switch (tt) {
      case 'singleEnemy':
        return this.chosenEnemyId ? [this.getCombatant(this.chosenEnemyId)].filter(c => c?.alive) : [];
      case 'singleAlly':
        return this.chosenAllyId ? [this.getCombatant(this.chosenAllyId)].filter(c => c?.alive) : [];
      case 'allEnemies':
        return this.getAliveCombatants().filter(c => c.teamId !== caster.teamId);
      case 'allAllies':
        return this.getAliveCombatants().filter(c => c.teamId === caster.teamId);
      case 'all':
        return this.getAliveCombatants();
    }
  }

  /* ─── effect implementations ─── */

  private applyDamage(caster: CombatantState, target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const dt = eff.damageType ?? 'physical';
    const sn = getStatNamesForDamageType(dt);
    const power = this.getEffectiveStat(caster, sn.power);
    const constancy = this.getEffectiveStat(caster, sn.constancy);
    const defense = this.getEffectiveStat(target, sn.defense);
    const raw = calculateRawDamage(power, constancy, eff.coefficient ?? 1);
    const afterDef = applyDefense(raw, defense, this.settings.defenseCap);
    const afterShield = this.absorbShield(target, afterDef, dt);
    target.currentHp = Math.max(0, target.currentHp - afterShield);
    this.handleDamageGauges(caster, target, afterShield);
    const logs: CombatLogEntry[] = [
      { time: this.timeline.currentTime, message: `${caster.name} inflige ${afterShield} dégâts ${dt} à ${target.name} (brut: ${raw}, après déf: ${afterDef})`, type: 'damage' },
    ];
    if (target.currentHp <= 0) logs.push(...this.handleDeath(target));
    return logs;
  }

  private applyDot(caster: CombatantState, target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const dt = eff.damageType ?? 'physical';
    const sn = getStatNamesForDamageType(dt);
    const power = this.getEffectiveStat(caster, sn.power);
    const constancy = this.getEffectiveStat(caster, sn.constancy);
    const defense = this.getEffectiveStat(target, sn.defense);
    const rawTick = calculateRawDamage(power, constancy, eff.coefficient ?? 1);
    const duration = eff.duration ?? 300;
    const interval = eff.tickInterval ?? 100;
    const numTicks = Math.max(1, Math.floor(duration / interval));
    const tickAfterDef = applyDotDefense(rawTick, numTicks, defense, this.settings.defenseCap);

    const dotId = uuid();
    const dot = {
      id: dotId, damageType: dt, tickDamage: tickAfterDef, tickInterval: interval,
      nextTickAt: this.timeline.currentTime + interval,
      expiresAt: this.timeline.currentTime + duration,
      sourceId: caster.id, totalTicks: numTicks,
    };
    target.dots.push(dot);
    this.timeline.addEvent({ id: dotId + '_tick', time: dot.nextTickAt, type: 'dot_tick', actorId: target.id, data: { dotId } });
    return [{ time: this.timeline.currentTime, message: `${caster.name} applique un DoT ${dt} sur ${target.name} (${tickAfterDef}/tick, ${numTicks} ticks)`, type: 'damage' }];
  }

  private applyHeal(caster: CombatantState, target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const dt = eff.damageType ?? 'magical';
    const sn = getStatNamesForDamageType(dt);
    const power = this.getEffectiveStat(caster, sn.power);
    const constancy = this.getEffectiveStat(caster, sn.constancy);
    const raw = calculateRawDamage(power, constancy, eff.coefficient ?? 1);
    const prev = target.currentHp;
    target.currentHp = Math.min(target.baseStats.maxHp, target.currentHp + raw);
    const healed = target.currentHp - prev;
    if (caster.className === 'clerc') caster.sacred += healed;
    return [{ time: this.timeline.currentTime, message: `${caster.name} soigne ${target.name} de ${healed} PV`, type: 'heal' }];
  }

  private applyHot(caster: CombatantState, target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const dt = eff.damageType ?? 'magical';
    const sn = getStatNamesForDamageType(dt);
    const power = this.getEffectiveStat(caster, sn.power);
    const constancy = this.getEffectiveStat(caster, sn.constancy);
    const rawTick = calculateRawDamage(power, constancy, eff.coefficient ?? 1);
    const duration = eff.duration ?? 300;
    const interval = eff.tickInterval ?? 100;

    const hotId = uuid();
    const hot = {
      id: hotId, healPerTick: rawTick, tickInterval: interval,
      nextTickAt: this.timeline.currentTime + interval,
      expiresAt: this.timeline.currentTime + duration,
      sourceId: caster.id,
    };
    target.hots.push(hot);
    this.timeline.addEvent({ id: hotId + '_tick', time: hot.nextTickAt, type: 'hot_tick', actorId: target.id, data: { hotId } });
    return [{ time: this.timeline.currentTime, message: `${caster.name} applique un HoT sur ${target.name} (${rawTick}/tick)`, type: 'heal' }];
  }

  private applyBuff(target: CombatantState, eff: SpellEffect, kind: 'buff' | 'debuff'): CombatLogEntry[] {
    const stat = eff.buffStat ?? 'physicalPower';
    const value = eff.buffValue ?? 0;
    const duration = eff.duration ?? 500;
    const buffId = uuid();
    const entry = { id: buffId, stat, value, expiresAt: this.timeline.currentTime + duration, sourceId: this.activeActorId ?? '' };
    if (kind === 'buff') target.buffs.push(entry);
    else target.debuffs.push(entry);
    const evType: TimelineEventType = kind === 'buff' ? 'buff_expire' : 'debuff_expire';
    this.timeline.addEvent({ id: buffId + '_exp', time: this.timeline.currentTime + duration, type: evType, actorId: target.id, data: { buffId } });
    const label = kind === 'buff' ? 'buff' : 'débuff';
    return [{ time: this.timeline.currentTime, message: `${target.name} reçoit un ${label}: ${stat} ${kind === 'buff' ? '+' : '-'}${value} (${duration} UT)`, type: kind }];
  }

  private applySetWeather(eff: SpellEffect): CombatLogEntry[] {
    if (eff.weather) {
      this.weather = eff.weather;
      return [{ time: this.timeline.currentTime, message: `Météo changée en ${this.weather}`, type: 'weather' }];
    }
    return [];
  }

  private applySetArcane(eff: SpellEffect): CombatLogEntry[] {
    if (eff.arcaneElement) {
      this.arcaneElement = eff.arcaneElement;
      return [{ time: this.timeline.currentTime, message: `Élément arcanique: ${this.arcaneElement}`, type: 'info' }];
    }
    return [];
  }

  private applySetSpirit(target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    if (eff.animalSpirit) {
      target.animalSpirit = eff.animalSpirit;
      return [{ time: this.timeline.currentTime, message: `${target.name} reçoit l'esprit ${eff.animalSpirit}`, type: 'info' }];
    }
    return [];
  }

  private applyShield(target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const shieldId = uuid();
    const amount = eff.shieldAmount ?? 0;
    const types = eff.shieldTypes ?? ['physical', 'magical', 'psychic'];
    const duration = eff.duration ?? 500;
    target.shields.push({ id: shieldId, amount, types, expiresAt: this.timeline.currentTime + duration });
    this.timeline.addEvent({ id: shieldId + '_exp', time: this.timeline.currentTime + duration, type: 'shield_expire', actorId: target.id, data: { shieldId } });
    return [{ time: this.timeline.currentTime, message: `${target.name} reçoit un bouclier de ${amount} (${types.join('/')}, ${duration} UT)`, type: 'shield' }];
  }

  private applyCurse(caster: CombatantState, target: CombatantState, eff: SpellEffect): CombatLogEntry[] {
    const curseId = uuid();
    const duration = eff.duration ?? 500;
    target.curses.push({
      id: curseId,
      condition: eff.curseCondition ?? 'alive',
      effects: eff.curseEffects ?? [],
      resolveAt: this.timeline.currentTime + duration,
      sourceId: target.id,
      sourceCasterId: caster.id,
    });
    this.timeline.addEvent({ id: curseId + '_res', time: this.timeline.currentTime + duration, type: 'curse_resolve', actorId: target.id, data: { curseId } });
    return [{ time: this.timeline.currentTime, message: `${caster.name} maudit ${target.name} (résolution dans ${duration} UT, cond: ${eff.curseCondition})`, type: 'curse' }];
  }

  /* ─── gauge handling ─── */

  private handleDamageGauges(caster: CombatantState, target: CombatantState, finalDmg: number) {
    if (target.className === 'belier') {
      const pctHp = (finalDmg / target.baseStats.maxHp) * 100;
      target.rage = Math.min(this.settings.rageMax, target.rage + this.settings.rageGainMultiplier * pctHp);
    }
    if (target.className === 'clerc') {
      target.sacred = Math.max(0, target.sacred - finalDmg / 2);
    }
    if (caster.className === 'clerc') {
      caster.sacred = Math.max(0, caster.sacred - finalDmg);
    }
  }

  /* ─── shield absorption ─── */

  private absorbShield(target: CombatantState, damage: number, dt: DamageType): number {
    let remaining = damage;
    for (const sh of target.shields) {
      if (remaining <= 0) break;
      if (!sh.types.includes(dt)) continue;
      const absorbed = Math.min(sh.amount, remaining);
      sh.amount -= absorbed;
      remaining -= absorbed;
    }
    target.shields = target.shields.filter(s => s.amount > 0);
    return remaining;
  }

  /* ─── event processors ─── */

  private processDotTick(ev: TimelineEvent): CombatLogEntry[] {
    const target = this.getCombatant(ev.actorId);
    if (!target?.alive) return [];
    const dotId = (ev.data as Record<string, string>)?.dotId;
    const dot = target.dots.find(d => d.id === dotId);
    if (!dot) return [];

    const afterShield = this.absorbShield(target, dot.tickDamage, dot.damageType);
    target.currentHp = Math.max(0, target.currentHp - afterShield);

    const caster = this.combatants.find(c => c.id === dot.sourceId);
    if (caster) this.handleDamageGauges(caster, target, afterShield);

    const logs: CombatLogEntry[] = [
      { time: this.timeline.currentTime, message: `DoT ${dot.damageType} sur ${target.name}: -${afterShield} PV`, type: 'damage' },
    ];

    dot.nextTickAt = this.timeline.currentTime + dot.tickInterval;
    if (dot.nextTickAt <= dot.expiresAt) {
      this.timeline.addEvent({ id: dot.id + '_tick_' + uuid().slice(0, 4), time: dot.nextTickAt, type: 'dot_tick', actorId: target.id, data: { dotId } });
    } else {
      target.dots = target.dots.filter(d => d.id !== dotId);
    }
    if (target.currentHp <= 0) logs.push(...this.handleDeath(target));
    return logs;
  }

  private processHotTick(ev: TimelineEvent): CombatLogEntry[] {
    const target = this.getCombatant(ev.actorId);
    if (!target?.alive) return [];
    const hotId = (ev.data as Record<string, string>)?.hotId;
    const hot = target.hots.find(h => h.id === hotId);
    if (!hot) return [];

    const prev = target.currentHp;
    target.currentHp = Math.min(target.baseStats.maxHp, target.currentHp + hot.healPerTick);
    const healed = target.currentHp - prev;

    const caster = this.combatants.find(c => c.id === hot.sourceId);
    if (caster?.className === 'clerc') caster.sacred += healed;

    hot.nextTickAt = this.timeline.currentTime + hot.tickInterval;
    if (hot.nextTickAt <= hot.expiresAt) {
      this.timeline.addEvent({ id: hot.id + '_tick_' + uuid().slice(0, 4), time: hot.nextTickAt, type: 'hot_tick', actorId: target.id, data: { hotId } });
    } else {
      target.hots = target.hots.filter(h => h.id !== hotId);
    }
    return [{ time: this.timeline.currentTime, message: `HoT sur ${target.name}: +${healed} PV`, type: 'heal' }];
  }

  private processBuffExpire(ev: TimelineEvent, kind: 'buff' | 'debuff', logs: CombatLogEntry[]) {
    const target = this.getCombatant(ev.actorId);
    if (!target) return;
    const bId = (ev.data as Record<string, string>)?.buffId;
    if (kind === 'buff') target.buffs = target.buffs.filter(b => b.id !== bId);
    else target.debuffs = target.debuffs.filter(b => b.id !== bId);
    logs.push({ time: this.timeline.currentTime, message: `${kind === 'buff' ? 'Buff' : 'Débuff'} expiré sur ${target.name}`, type: kind });
  }

  private processShieldExpire(ev: TimelineEvent, logs: CombatLogEntry[]) {
    const target = this.getCombatant(ev.actorId);
    if (!target) return;
    const sId = (ev.data as Record<string, string>)?.shieldId;
    target.shields = target.shields.filter(s => s.id !== sId);
    logs.push({ time: this.timeline.currentTime, message: `Bouclier expiré sur ${target.name}`, type: 'shield' });
  }

  private processCurseResolve(ev: TimelineEvent): CombatLogEntry[] {
    const target = this.getCombatant(ev.actorId);
    if (!target) return [];
    const cId = (ev.data as Record<string, string>)?.curseId;
    const curse = target.curses.find(c => c.id === cId);
    if (!curse) return [];
    target.curses = target.curses.filter(c => c.id !== cId);

    const condMet = this.checkCurseCondition(curse.condition, target);
    if (!condMet) {
      return [{ time: this.timeline.currentTime, message: `Malédiction sur ${target.name} expirée (condition non remplie)`, type: 'curse' }];
    }

    const caster = this.combatants.find(c => c.id === curse.sourceCasterId);
    const logs: CombatLogEntry[] = [
      { time: this.timeline.currentTime, message: `Malédiction résolue sur ${target.name}!`, type: 'curse' },
    ];
    for (const eff of curse.effects) {
      const effTargets = eff.targetType === 'singleEnemy' || eff.targetType === 'singleAlly'
        ? [target]
        : this.resolveTargets(eff.targetType, caster ?? target);
      for (const t of effTargets) {
        switch (eff.type) {
          case 'damage': logs.push(...this.applyDamage(caster ?? target, t, eff)); break;
          case 'debuff': logs.push(...this.applyBuff(t, eff, 'debuff')); break;
          case 'dot': logs.push(...this.applyDot(caster ?? target, t, eff)); break;
          default: break;
        }
      }
    }
    return logs;
  }

  private checkCurseCondition(cond: string, target: CombatantState): boolean {
    switch (cond) {
      case 'alive': return target.alive && target.currentHp > 0;
      case 'above50': return target.currentHp > target.baseStats.maxHp * 0.5;
      case 'below50': return target.currentHp < target.baseStats.maxHp * 0.5;
      case 'lastStanding': return this.getAliveCombatants(target.teamId).length <= 1;
      default: return false;
    }
  }

  private processWeatherChange(): CombatLogEntry[] {
    this.weather = randomWeather(this.weather);
    this.scheduleWeatherChange(this.timeline.currentTime);
    return [{ time: this.timeline.currentTime, message: `La météo change: ${this.weather}`, type: 'weather' }];
  }

  private scheduleWeatherChange(from: number) {
    const delay = randomWeatherInterval(this.settings.weatherMinInterval, this.settings.weatherMaxInterval);
    this.timeline.addEvent({ id: 'weather_' + uuid().slice(0, 6), time: from + delay, type: 'weather_change', actorId: '__weather__' });
  }

  /* ─── monster AI ─── */

  private resolveMonsterTurn(actor: CombatantState): CombatLogEntry[] {
    const attacks = actor.attacks ?? [];
    if (attacks.length === 0) return [];

    const totalWeight = attacks.reduce((s, a) => s + a.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen: MonsterAttack = attacks[0];
    for (const atk of attacks) {
      roll -= atk.weight;
      if (roll <= 0) { chosen = atk; break; }
    }

    this.activeActorId = actor.id;
    const enemies = this.getAliveCombatants().filter(c => c.teamId !== actor.teamId);
    const allies = this.getAliveCombatants().filter(c => c.teamId === actor.teamId);
    this.chosenEnemyId = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)].id : null;
    this.chosenAllyId = allies.length > 0 ? allies[Math.floor(Math.random() * allies.length)].id : null;
    this.rageActivated = actor.rage > 50;

    const allEffects: { effect: SpellEffect; spiritFilter?: AnimalSpirit }[] =
      chosen.effects.map(effect => ({ effect }));
    for (const cg of chosen.conditionalEffects ?? []) {
      if (cg.condition.type === 'targetHasSpirit') {
        allEffects.push(...cg.effects.map(effect => ({ effect, spiritFilter: cg.condition.type === 'targetHasSpirit' ? cg.condition.spirit : undefined })));
      } else if (this.evaluateCondition(cg.condition)) {
        allEffects.push(...cg.effects.map(effect => ({ effect })));
      }
    }

    const logs: CombatLogEntry[] = [];
    for (const { effect, spiritFilter } of allEffects) {
      logs.push(...this.resolveEffect(effect, actor, spiritFilter));
    }

    const cd = calculateCooldown(chosen.baseCooldown, this.getEffectiveStat(actor, 'speed'), this.settings.cooldownCap);
    this.timeline.addEvent({ id: uuid(), time: this.timeline.currentTime + cd, type: 'action', actorId: actor.id });
    logs.push({ time: this.timeline.currentTime, message: `${actor.name} utilise ${chosen.name} (prochain tour dans ${cd} UT)`, type: 'info' });
    return logs;
  }

  /* ─── death & win ─── */

  private handleDeath(target: CombatantState): CombatLogEntry[] {
    target.alive = false;
    target.currentHp = 0;
    this.timeline.removeEventsForActor(target.id);
    return [{ time: this.timeline.currentTime, message: `${target.name} est vaincu!`, type: 'death' }];
  }

  checkWin(): boolean {
    const t0 = this.getAliveCombatants(0);
    const t1 = this.getAliveCombatants(1);
    return t0.length === 0 || t1.length === 0;
  }

  getWinner(): number | null {
    const t0 = this.getAliveCombatants(0);
    const t1 = this.getAliveCombatants(1);
    if (t0.length === 0 && t1.length === 0) return -1;
    if (t0.length === 0) return 1;
    if (t1.length === 0) return 0;
    return null;
  }

  /* ─── log helper ─── */

  private addLog(time: number, message: string, type: CombatLogEntry['type']) {
    this.log.push({ time, message, type });
  }
}
