import { test, expect } from '@playwright/test';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { Ability } from '../src/abilities/Ability';
import { matchesSpell, spellCategory } from '../src/ui/SpellCatalog';
import { OCEAN_DEFAULTS, validateOcean } from '../src/world/water/OceanSettings';
import { SpellFavorites } from '../src/ui/SpellFavorites';
import { WaterContactSpray } from '../src/world/water/WaterContactSpray';
import { Vector3 } from 'three';

const ability = (element: string): Ability => ({ id: element, name: 'Test invocation', subtitle: 'Ocean crown', element, key: '', color: '#fff', cooldown: 3, tags: ['projectile'], cast: () => {} });
test('Catalog searches subtitle and tags and classifies compound elements', () => {
  expect(spellCategory(ability('DEEP SEA'))).toBe('WATER');
  expect(spellCategory(ability('SAND / GLASS'))).toBe('EARTH / SAND');
  expect(spellCategory(ability('PRISM'))).toBe('LIGHT / HOLY');
  expect(matchesSpell(ability('AIR'), ' ocean ', 'WIND / STORM')).toBe(true);
  expect(matchesSpell(ability('AIR'), 'PROJECTILE', 'ALL')).toBe(true);
  expect(matchesSpell(ability('AIR'), 'ocean', 'WATER')).toBe(false);
});
test('A future registered ability is selectable without hardcoded slot UI', () => {
  const m = new AbilityManager(), a = ability('WATER');
  m.registry.register(a); m.selectAbility(a.id);
  expect(m.selectedAbility).toBe(a);
  const length = m.slots.length; m.selectAbility(a.id); m.selectAbility('missing');
  expect(m.slots).toHaveLength(length); expect(m.selectedAbility).toBe(a);
  m.dispose();
});
test('Favorites sanitize persisted IDs, deduplicate, preserve order and survive reload', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map([['elemental-favorites', JSON.stringify(['b', 'missing', 'a', 'b', 12])]]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => storage.get(k), setItem: (k: string, v: string) => storage.set(k, v) } });
  try {
    const f = new SpellFavorites(['a', 'b']); expect(f.all).toEqual(['b', 'a']);
    f.toggle('unknown'); f.toggle('b'); expect(new SpellFavorites(['a', 'b']).all).toEqual(['a']);
    f.sync(['b']); expect(f.all).toEqual([]);
  } finally { if (old) Object.defineProperty(globalThis, 'localStorage', old); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
test('Ocean editing rejects invalid numbers/colors and clamps costly budgets', () => {
  expect(() => validateOcean({ amplitude: NaN }, OCEAN_DEFAULTS)).toThrow();
  expect(() => validateOcean({ surfaceColor: 'red' }, OCEAN_DEFAULTS)).toThrow();
  const c = validateOcean({ maxRipples: 900, amplitude: 100, waveQuality: 3.6, roughness: -1 }, OCEAN_DEFAULTS);
  expect(c.maxRipples).toBe(32); expect(c.amplitude).toBe(1.8); expect(c.waveQuality).toBe(4); expect(c.roughness).toBe(.12);
  expect(OCEAN_DEFAULTS.amplitude).toBe(1);
});
test('Impact spray is bounded across simultaneous impacts and expires without rebuilding buffers', () => {
  const spray = new WaterContactSpray(), point = new Vector3(2, 0, -8);
  const geometry = spray.geometry, origins = geometry.getAttribute('aOrigin');
  for (let i = 0; i < 100; i++) spray.emitImpact(point, 0, .8, 2);
  spray.update(.1); expect(spray.count).toBeLessThanOrEqual(128); expect(spray.count).toBeGreaterThan(0);
  expect(origins.getX(0)).toBe(2);expect(origins.getZ(0)).toBe(-8);expect(geometry.getAttribute('aMotion').getY(0)).toBeGreaterThan(0);
  expect(geometry.getAttribute('position').count).toBe(256);
  for (let frame = 1; frame < 20; frame++) spray.emitImpact(point, frame * .1, .6, 1);
  spray.update(2); expect(spray.count).toBeLessThanOrEqual(256);
  spray.update(5); expect(spray.count).toBe(0); expect(spray.points.visible).toBe(false);
  expect(spray.geometry).toBe(geometry); expect(geometry.getAttribute('aOrigin')).toBe(origins);
  spray.dispose();
});
