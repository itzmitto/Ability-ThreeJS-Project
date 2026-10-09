import { test, expect } from '@playwright/test';
import { Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { EffectManager } from '../src/effects/EffectManager';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { resolveSpectralTarget } from '../src/abilities/spectral/resolveSpectralTarget';
import { SpectralBreak } from '../src/abilities/spectral/SpectralBreak';
import { SpectralBreakEffect } from '../src/abilities/spectral/SpectralBreakEffect';
import { SpectralResourcePool } from '../src/abilities/spectral/SpectralResourcePool';
import { spectralTimeline } from '../src/abilities/spectral/SpectralTimeline';
import { spectralQuality } from '../src/abilities/spectral/SpectralQualityConfig';
function context(): AbilityCastContext { const scene = new Scene(), player = new Player(scene), target = new Vector3(0, 0, -40); return { scene, player, water: new WaterInteractionManager(), camera: new PerspectiveCamera(), quality: new GraphicsSettings(), targeting: new TargetingSystem(scene), effectManager: new EffectManager(), origin: player.visual.getRightHandWorldPosition(), direction: new Vector3(0, 0, -1), groundTarget: target, targetPoint: target, playerForward: new Vector3(0, 0, -1), cameraForward: new Vector3(0, 0, -1), time: 0 }; }
function cleanup(c: AbilityCastContext) { c.effectManager.dispose(); c.player.dispose(); c.targeting.dispose(); c.quality.dispose(); c.water?.dispose(); }
test('Spectral ground and sky targeting cap at 85 m, snapshot vectors and reject invalid direction', () => {
  const origin = new Vector3(1, 1, 2), hit = new Vector3(1, 0, -200), direction = new Vector3(0, 0, -1); const t = resolveSpectralTarget(origin, hit, direction)!;
  expect(t.distanceTo(origin)).toBeCloseTo(85); hit.set(0, 0, 0); expect(t.z).toBeLessThan(-82);
  expect(resolveSpectralTarget(origin, null, direction)!.distanceTo(origin)).toBeCloseTo(85);
  expect(resolveSpectralTarget(origin, null, new Vector3())).toBeNull(); expect(resolveSpectralTarget(new Vector3(NaN, 0, 0), hit, direction)).toBeNull();
  expect(resolveSpectralTarget(origin, new Vector3(Infinity, 0, 0), direction)!.distanceTo(origin)).toBeCloseTo(85);
});
test('N/9 preserves eight mappings and shared cooldown rejects 100 requests without extra effects', () => {
  const c = context(), a = new SpectralBreak(), m = new AbilityManager(); m.registry.register(a); m.assignSlot(8, a.id); m.select(8);
  expect(m.slots.slice(0, 9).map(s => s.code)).toEqual(['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyV', 'KeyX', 'KeyC', 'KeyB', 'KeyN']); expect(m.cast(c)).toBe(true); expect(m.getCooldown(8)).toBe(10);
  for (let i = 0; i < 100; i++)expect(m.cast(c)).toBe(false); expect(c.effectManager.activeCount).toBe(1);
  c.effectManager.update(9.1, 0); m.update(10.1); expect(m.cast(c)).toBe(true); cleanup(c); m.dispose();
});
test('Hand tracks charge, snapshots at release and preserves cast direction while player moves', () => {
  const c = context(), r = new SpectralResourcePool(), v = r.pool.acquire()!, e = new SpectralBreakEffect(c, r, v, resolveSpectralTarget(c.origin, c.groundTarget, c.direction)!);
  c.player.position.x = 4; e.update(.6, 0); expect(v.charge.root.position.distanceTo(c.player.visual.getRightHandWorldPosition())).toBeLessThan(1e-6);
  e.update(.5, 0); const origin = e.origin.clone(), target = e.target.clone(), direction = e.direction.clone(); c.player.position.x = 9; c.direction.set(1, 0, 0); e.update(1, 0);
  expect(e.origin.equals(origin)).toBe(true); expect(e.target.equals(target)).toBe(true); expect(e.direction.equals(direction)).toBe(true); expect(e.length).toBeLessThanOrEqual(85);
  e.dispose(); r.dispose(); cleanup(c);
});
test('Absolute timeline extends forward, surges, narrows and retains aftermath until nine seconds', () => {
  expect(spectralTimeline(1.05).front).toBe(0); expect(spectralTimeline(1.3).front).toBeGreaterThan(0); expect(spectralTimeline(1.65).front).toBe(1);
  expect(spectralTimeline(2.05).surge).toBeGreaterThan(.1); expect(spectralTimeline(4.2).collapse).toBeGreaterThan(0);
  expect(spectralTimeline(6.5).beam).toBe(0); expect(spectralTimeline(6.5).aftermath).toBeGreaterThan(.9); expect(spectralTimeline(8.5).aftermath).toBeGreaterThan(0); expect(spectralTimeline(9).aftermath).toBe(0);
});
test('All presets bound GPU counts and live changes preserve target, age and cached materials', () => {
  const q = Object.values(QUALITY_PRESETS).map(spectralQuality); expect(q.map(x => x.particles)).toEqual([240, 720, 1600]); expect(q.map(x => x.layers)).toEqual([3, 5, 7]);
  const c = context(), r = new SpectralResourcePool(), v = r.pool.acquire()!, e = new SpectralBreakEffect(c, r, v, resolveSpectralTarget(c.origin, c.groundTarget, c.direction)!); const material = v.beam.layers[0].material;
  for (const [age, preset] of [[.5, 'MAX'], [2.2, 'MEDIUM'], [4.2, 'LOW'], [6.5, 'MAX']] as const) {    
e.update(age - e.age, 0); const t = e.target.clone(); c.quality.setPreset(preset); e.update(0, 0); expect(e.age).toBe(age); expect(e.target.equals(t)).toBe(true); expect(v.beam.layers[0].material).toBe(material);
    v.root.traverse(o => { expect([...o.position.toArray(), ...o.quaternion.toArray()].every(Number.isFinite)).toBe(true); if (o instanceof Mesh) { expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true); const index = o.geometry.getIndex(); if (index) expect(Math.max(...Array.from(index.array))).toBeLessThan(o.geometry.getAttribute('position').count); } });
  }
  expect(!e.update(2.51, 0)).toBe(true); e.dispose(); e.dispose(); expect(v.root.parent).toBeNull(); expect(v.lights.lights.every(l => !l.parent)).toBe(true); expect(c.quality.subscriberCount).toBe(0); r.dispose(); cleanup(c);
});
test('Owned water disturbances expire independently and single bundle reuse is stable across 20 casts', () => {
  const c = context(), r = new SpectralResourcePool(), other = {}; c.water!.addRipple({ position: new Vector3(5, 0, 5), strength: .2, duration: 30, waveSpeed: 1 }, other);
  let first: unknown; for (let i = 0; i < 20; i++) {    
const v = r.pool.acquire()!; if (i === 0) first = v; expect(v).toBe(first); expect(r.pool.acquire()).toBeNull(); const e = new SpectralBreakEffect(c, r, v, resolveSpectralTarget(c.origin, c.groundTarget, c.direction)!);
    e.update(4.2, 0); expect(c.water!.activeCount).toBeGreaterThan(1); e.dispose(); expect(c.water!.activeCount).toBe(1); expect(c.quality.subscriberCount).toBe(0);
  }
  r.dispose(); cleanup(c);
});
