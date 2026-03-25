import type { Spell, Character, Monster, ScalingSettings } from '../models/types';
import { DEFAULT_SETTINGS } from '../models/types';

function getAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getSpells(): Spell[] { return getAll<Spell>('metaserv_spells'); }
export function saveSpells(s: Spell[]) { saveAll('metaserv_spells', s); }
export function getSpell(id: string) { return getSpells().find(s => s.id === id); }
export function saveSpell(spell: Spell) {
  const all = getSpells();
  const idx = all.findIndex(s => s.id === spell.id);
  if (idx >= 0) all[idx] = spell; else all.push(spell);
  saveSpells(all);
}
export function deleteSpell(id: string) { saveSpells(getSpells().filter(s => s.id !== id)); }

export function getCharacters(): Character[] { return getAll<Character>('metaserv_chars'); }
export function saveCharacters(c: Character[]) { saveAll('metaserv_chars', c); }
export function getCharacter(id: string) { return getCharacters().find(c => c.id === id); }
export function saveCharacter(ch: Character) {
  const all = getCharacters();
  const idx = all.findIndex(c => c.id === ch.id);
  if (idx >= 0) all[idx] = ch; else all.push(ch);
  saveCharacters(all);
}
export function deleteCharacter(id: string) { saveCharacters(getCharacters().filter(c => c.id !== id)); }

export function getMonsters(): Monster[] { return getAll<Monster>('metaserv_monsters'); }
export function saveMonsters(m: Monster[]) { saveAll('metaserv_monsters', m); }
export function getMonster(id: string) { return getMonsters().find(m => m.id === id); }
export function saveMonster(mon: Monster) {
  const all = getMonsters();
  const idx = all.findIndex(m => m.id === mon.id);
  if (idx >= 0) all[idx] = mon; else all.push(mon);
  saveMonsters(all);
}
export function deleteMonster(id: string) { saveMonsters(getMonsters().filter(m => m.id !== id)); }

export function getSettings(): ScalingSettings {
  const raw = localStorage.getItem('metaserv_settings');
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
}
export function saveSettings(s: ScalingSettings) {
  localStorage.setItem('metaserv_settings', JSON.stringify(s));
}
