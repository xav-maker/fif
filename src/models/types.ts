export type DamageType = 'physical' | 'magical' | 'psychic';
export type Weather = 'soleil' | 'nuages' | 'pluie';
export type AnimalSpirit = 'tortue' | 'poisson' | 'ours' | 'loup' | 'aigle' | 'chauveSouris';
export type ClassName = 'arcaniste' | 'animiste' | 'belier' | 'clerc' | 'damne';
export type CurseCondition = 'alive' | 'above50' | 'below50' | 'lastStanding';
export type TargetType = 'singleAlly' | 'singleEnemy' | 'allEnemies' | 'allAllies' | 'all';
export type EffectType =
  | 'damage' | 'dot' | 'heal' | 'hot'
  | 'buff' | 'debuff'
  | 'setWeather' | 'setArcaneElement' | 'setAnimalSpirit'
  | 'shield' | 'curse';

export interface Stats {
  physicalPower: number;
  physicalConstancy: number;
  physicalDefense: number;
  magicalPower: number;
  magicalConstancy: number;
  magicalDefense: number;
  psychicPower: number;
  psychicConstancy: number;
  psychicDefense: number;
  speed: number;
  maxHp: number;
  initiative: number;
}

export const STAT_KEYS: (keyof Stats)[] = [
  'physicalPower', 'physicalConstancy', 'physicalDefense',
  'magicalPower', 'magicalConstancy', 'magicalDefense',
  'psychicPower', 'psychicConstancy', 'psychicDefense',
  'speed', 'maxHp', 'initiative',
];

export const STAT_LABELS: Record<keyof Stats, string> = {
  physicalPower: 'Puissance physique',
  physicalConstancy: 'Constance physique',
  physicalDefense: 'Défense physique',
  magicalPower: 'Puissance magique',
  magicalConstancy: 'Constance magique',
  magicalDefense: 'Défense magique',
  psychicPower: 'Puissance psychique',
  psychicConstancy: 'Constance psychique',
  psychicDefense: 'Défense psychique',
  speed: 'Vitesse',
  maxHp: 'Vie max',
  initiative: 'Initiative',
};

export interface SpellEffect {
  type: EffectType;
  targetType: TargetType;
  damageType?: DamageType;
  coefficient?: number;
  duration?: number;
  tickInterval?: number;
  buffStat?: keyof Stats;
  buffValue?: number;
  shieldAmount?: number;
  shieldTypes?: DamageType[];
  weather?: Weather;
  arcaneElement?: string;
  animalSpirit?: AnimalSpirit;
  curseCondition?: CurseCondition;
  curseEffects?: SpellEffect[];
}

export type SpellCondition =
  | { type: 'weather'; value: Weather }
  | { type: 'arcaneElement'; value: string }
  | { type: 'weatherAndElement'; weather: Weather; element: string }
  | { type: 'rageActivated' }
  | { type: 'rageThreshold'; min: number }
  | { type: 'sacredThreshold'; min: number; consume: number }
  | { type: 'targetHasSpirit'; spirit: AnimalSpirit };

export interface ConditionalEffectGroup {
  condition: SpellCondition;
  effects: SpellEffect[];
}

export interface Spell {
  id: string;
  name: string;
  baseCooldown: number;
  effects: SpellEffect[];
  conditionalEffects: ConditionalEffectGroup[];
  classRestriction?: ClassName;
}

export interface Character {
  id: string;
  name: string;
  className: ClassName;
  stats: Stats;
  deckSpellIds: string[];
}

export interface MonsterAttack {
  id: string;
  name: string;
  baseCooldown: number;
  effects: SpellEffect[];
  conditionalEffects: ConditionalEffectGroup[];
  weight: number;
}

export interface Monster {
  id: string;
  name: string;
  stats: Stats;
  attacks: MonsterAttack[];
}

export interface ScalingSettings {
  defenseCap: number;
  cooldownCap: number;
  passBaseDuration: number;
  passMinDuration: number;
  rageGainMultiplier: number;
  rageMax: number;
  weatherMinInterval: number;
  weatherMaxInterval: number;
}

export const DEFAULT_SETTINGS: ScalingSettings = {
  defenseCap: 0.5,
  cooldownCap: 0.5,
  passBaseDuration: 500,
  passMinDuration: 300,
  rageGainMultiplier: 4,
  rageMax: 100,
  weatherMinInterval: 1000,
  weatherMaxInterval: 2000,
};

export interface ActiveBuff {
  id: string;
  stat: keyof Stats;
  value: number;
  expiresAt: number;
  sourceId: string;
}

export interface ActiveDot {
  id: string;
  damageType: DamageType;
  tickDamage: number;
  tickInterval: number;
  nextTickAt: number;
  expiresAt: number;
  sourceId: string;
  totalTicks: number;
}

export interface ActiveHot {
  id: string;
  healPerTick: number;
  tickInterval: number;
  nextTickAt: number;
  expiresAt: number;
  sourceId: string;
}

export interface ActiveShield {
  id: string;
  amount: number;
  types: DamageType[];
  expiresAt: number;
}

export interface ActiveCurse {
  id: string;
  condition: CurseCondition;
  effects: SpellEffect[];
  resolveAt: number;
  sourceId: string;
  sourceCasterId: string;
}

export interface CombatantState {
  id: string;
  name: string;
  teamId: number;
  isMonster: boolean;
  className?: ClassName;
  baseStats: Stats;
  currentHp: number;
  buffs: ActiveBuff[];
  debuffs: ActiveBuff[];
  dots: ActiveDot[];
  hots: ActiveHot[];
  shields: ActiveShield[];
  curses: ActiveCurse[];
  animalSpirit?: AnimalSpirit;
  rage: number;
  sacred: number;
  alive: boolean;
  deckSpellIds?: string[];
  attacks?: MonsterAttack[];
}

export type TimelineEventType =
  | 'action'
  | 'dot_tick'
  | 'hot_tick'
  | 'buff_expire'
  | 'debuff_expire'
  | 'shield_expire'
  | 'curse_resolve'
  | 'weather_change';

export interface TimelineEvent {
  id: string;
  time: number;
  type: TimelineEventType;
  actorId: string;
  data?: Record<string, unknown>;
}

export interface CombatLogEntry {
  time: number;
  message: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'info' | 'death' | 'curse' | 'weather' | 'shield';
}

export type CombatPhase =
  | 'waiting_for_spell'
  | 'waiting_for_target'
  | 'waiting_for_rage'
  | 'processing'
  | 'monster_turn'
  | 'combat_over';

export function createDefaultStats(): Stats {
  return {
    physicalPower: 10, physicalConstancy: 5, physicalDefense: 5,
    magicalPower: 10, magicalConstancy: 5, magicalDefense: 5,
    psychicPower: 10, psychicConstancy: 5, psychicDefense: 5,
    speed: 100, maxHp: 100, initiative: 50,
  };
}

export function createDefaultEffect(): SpellEffect {
  return { type: 'damage', targetType: 'singleEnemy', damageType: 'physical', coefficient: 1 };
}

export function createDefaultSpell(id: string): Spell {
  return { id, name: '', baseCooldown: 200, effects: [], conditionalEffects: [] };
}

export function getStatNamesForDamageType(dt: DamageType): { power: keyof Stats; constancy: keyof Stats; defense: keyof Stats } {
  switch (dt) {
    case 'physical': return { power: 'physicalPower', constancy: 'physicalConstancy', defense: 'physicalDefense' };
    case 'magical': return { power: 'magicalPower', constancy: 'magicalConstancy', defense: 'magicalDefense' };
    case 'psychic': return { power: 'psychicPower', constancy: 'psychicConstancy', defense: 'psychicDefense' };
  }
}
