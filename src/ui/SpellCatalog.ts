import type { Ability } from '../abilities/Ability';
export const SPELL_CATEGORIES = ['ALL', 'FIRE', 'ICE / SNOW', 'LIGHTNING', 'WATER', 'EARTH / SAND', 'WIND / STORM', 'LIGHT / HOLY', 'SHADOW / DARK', 'BLOOD', 'TIME / GRAVITY', 'OTHER'] as const;
export type SpellCategory = typeof SPELL_CATEGORIES[number];
export function spellCategory(a: Ability): SpellCategory {
  const e = a.element.toUpperCase();
  if (/FIRE/.test(e)) return 'FIRE';
  if (/ICE|FROST|CRYO|SNOW/.test(e)) return 'ICE / SNOW';
  if (/LIGHTNING|ELECTRIC/.test(e)) return 'LIGHTNING';
  if (/WATER|SEA|OCEAN/.test(e)) return 'WATER';
  if (/SAND|EARTH|STONE|OBSIDIAN/.test(e)) return 'EARTH / SAND';
  if (/AIR|WIND|STORM/.test(e)) return 'WIND / STORM';
  if (/LIGHT|HOLY|PRISM|CRYSTAL/.test(e)) return 'LIGHT / HOLY';
  if (/SHADOW|DARK|VOID|ABYSS|SPATIAL/.test(e)) return 'SHADOW / DARK';
  if (/BLOOD/.test(e)) return 'BLOOD';
  if (/TIME|GRAVITY|COSMIC/.test(e)) return 'TIME / GRAVITY';
  return 'OTHER';
}
export function matchesSpell(a: Ability, search: string, category: SpellCategory): boolean {
  return (category === 'ALL' || spellCategory(a) === category) &&
    `${a.name} ${a.subtitle ?? ''} ${a.element} ${a.tags?.join(' ') ?? ''} ${spellCategory(a)}`.toLowerCase().includes(search.trim().toLowerCase());
}
