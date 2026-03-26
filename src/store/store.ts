import type { Spell, Character, Monster, ScalingSettings } from '../models/types';
import { DEFAULT_SETTINGS } from '../models/types';

function getAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getSpells(): Spell[] { return getAll<Spell>('fif_spells'); }
export function saveSpells(s: Spell[]) { saveAll('fif_spells', s); }
export function getSpell(id: string) { return getSpells().find(s => s.id === id); }
export function saveSpell(spell: Spell) {
  const all = getSpells();
  const idx = all.findIndex(s => s.id === spell.id);
  if (idx >= 0) all[idx] = spell; else all.push(spell);
  saveSpells(all);
}
export function deleteSpell(id: string) { saveSpells(getSpells().filter(s => s.id !== id)); }

export function getCharacters(): Character[] { return getAll<Character>('fif_chars'); }
export function saveCharacters(c: Character[]) { saveAll('fif_chars', c); }
export function getCharacter(id: string) { return getCharacters().find(c => c.id === id); }
export function saveCharacter(ch: Character) {
  const all = getCharacters();
  const idx = all.findIndex(c => c.id === ch.id);
  if (idx >= 0) all[idx] = ch; else all.push(ch);
  saveCharacters(all);
}
export function deleteCharacter(id: string) { saveCharacters(getCharacters().filter(c => c.id !== id)); }

export function getMonsters(): Monster[] { return getAll<Monster>('fif_monsters'); }
export function saveMonsters(m: Monster[]) { saveAll('fif_monsters', m); }
export function getMonster(id: string) { return getMonsters().find(m => m.id === id); }
export function saveMonster(mon: Monster) {
  const all = getMonsters();
  const idx = all.findIndex(m => m.id === mon.id);
  if (idx >= 0) all[idx] = mon; else all.push(mon);
  saveMonsters(all);
}
export function deleteMonster(id: string) { saveMonsters(getMonsters().filter(m => m.id !== id)); }

export function getSettings(): ScalingSettings {
  const raw = localStorage.getItem('fif_settings');
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
}
export function saveSettings(s: ScalingSettings) {
  localStorage.setItem('fif_settings', JSON.stringify(s));
}

export interface ExportData {
  version: number;
  exportedAt: string;
  spells: Spell[];
  characters: Character[];
  monsters: Monster[];
  settings: ScalingSettings;
}

export function exportAllData(): string {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    spells: getSpells(),
    characters: getCharacters(),
    monsters: getMonsters(),
    settings: getSettings(),
  };
  return JSON.stringify(data, null, 2);
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

export function importAllData(json: string, mode: 'replace' | 'merge'): { spells: number; characters: number; monsters: number } {
  let data: ExportData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Fichier JSON invalide');
  }
  if (!data || typeof data !== 'object') throw new Error('Format invalide');

  const spells = Array.isArray(data.spells) ? data.spells : [];
  const characters = Array.isArray(data.characters) ? data.characters : [];
  const monsters = Array.isArray(data.monsters) ? data.monsters : [];

  if (mode === 'replace') {
    saveSpells(spells);
    saveCharacters(characters);
    saveMonsters(monsters);
  } else {
    saveSpells(mergeById(getSpells(), spells));
    saveCharacters(mergeById(getCharacters(), characters));
    saveMonsters(mergeById(getMonsters(), monsters));
  }

  if (data.settings && typeof data.settings === 'object') {
    saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }

  return { spells: spells.length, characters: characters.length, monsters: monsters.length };
}
