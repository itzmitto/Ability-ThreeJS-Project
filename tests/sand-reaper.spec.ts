import { test, expect } from '@playwright/test';
import { BufferGeometry, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { SandReaper, sandReaperTarget } from '../src/abilities/sandReaper/SandReaper';
import { createSandFragmentGeometry, createSandReaperGeometry } from '../src/abilities/sandReaper/SandReaperGeometry';
import { SAND_REAPER_DEFAULTS, sandQuality, validatedSandConfig } from '../src/abilities/sandReaper/SandReaperConfig';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { EffectManager } from '../src/effects/EffectManager';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import type { AbilityCastContext } from '../src/abilities/Ability';

function inspectSolid(g: BufferGeometry): void {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), edges = new Map<string, number>();
  let volume = 0; const a = new Vector3(), b = new Vector3(), c = new Vector3(), cross = new Vector3(), edge = new Vector3();
  const key = (v: Vector3) => v.toArray().map(x => x.toFixed(6)).join(',');
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    cross.subVectors(b, a).cross(edge.subVectors(c, a)); expect(cross.length()).toBeGreaterThan(1e-7);
    volume += a.dot(edge.copy(b).cross(c)) / 6;
    for (const [v, w] of [[a, b], [b, c], [c, a]]) { const k = [key(v), key(w)].sort().join('|'); edges.set(k, (edges.get(k) ?? 0) + 1); }
    for (let j = 0; j < 3; j++) { edge.fromBufferAttribute(n, i + j); expect(edge.length()).toBeCloseTo(1, 5); expect(edge.dot(cross.clone().normalize())).toBeCloseTo(1, 5); }
  }
  expect(volume).toBeGreaterThan(0); expect([...edges.values()].every(count => count === 2)).toBe(true);
  expect(g.boundingSphere?.radius).toBeGreaterThan(0);
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
}
test('Crescent is deterministic, closed, positively wound, faceted and thick at every LOD', () => {
  for (const segments of [16, 28, 40]) {
    const g = createSandReaperGeometry(SAND_REAPER_DEFAULTS, segments), copy = createSandReaperGeometry(SAND_REAPER_DEFAULTS, segments);
    inspectSolid(g); expect(g.index).toBeNull(); expect(Array.from(g.getAttribute('position').array)).toEqual(Array.from(copy.getAttribute('position').array));
    expect(g.boundingBox!.max.z - g.boundingBox!.min.z).toBeGreaterThan(.4);
    expect(g.getAttribute('position').count / 3).toBe((segments - 2) * 12 + 12);
    g.dispose(); copy.dispose();
  }
  for (let i = 0; i < 4; i++) { const g = createSandFragmentGeometry(i); inspectSolid(g); g.dispose(); }
});
function context(range = 42): AbilityCastContext {
  const scene = new Scene(), player = new Player(scene), target = new Vector3(0, 0, -range);
  return { scene, player, camera: new PerspectiveCamera(), quality: new GraphicsSettings(), targeting: new TargetingSystem(scene), effectManager: new EffectManager(), water: new WaterInteractionManager(), origin: player.visual.getRightHandWorldPosition(), direction: new Vector3(0, 0, -1), playerForward: new Vector3(0, 0, -1), cameraForward: new Vector3(0, 0, -1), targetPoint: target, groundTarget: target, time: 0 };
}
function dispose(c: AbilityCastContext, ability: SandReaper): void { c.effectManager.dispose(); ability.dispose(); c.player.dispose(); c.targeting.dispose(); c.quality.dispose(); c.water?.dispose(); }
test('42m snapshot and invalid targets remain finite without mutating targeting', () => {
  const c = context(100), original = c.targetPoint.clone(), target = sandReaperTarget(c)!;
  expect(target.distanceTo(c.origin)).toBeCloseTo(42); expect(c.targetPoint.equals(original)).toBe(true);
  c.targetPoint.x = NaN;
  expect(sandReaperTarget(c)?.toArray().every(Number.isFinite)).toBe(true);
  c.origin.x = Infinity; expect(sandReaperTarget(c)).toBeNull(); dispose(c, new SandReaper());
});
test('Tuning is bounded, scalar edits are live and geometry edits require an idle lease', () => {
  expect(validatedSandConfig({ fragmentCount: 10000 }).fragmentCount).toBe(90);
  expect(() => validatedSandConfig({ flightSpeed: NaN })).toThrow();
  expect(Object.values(QUALITY_PRESETS).map(q => sandQuality(q).fragments)).toEqual([24, 48, 88]);
  const c = context(), ability = new SandReaper(); ability.cast(c);
  ability.configure({ mineralGlow: .2 }); expect(ability.config.mineralGlow).toBe(.2);
  expect(() => ability.configure({ bladeLength: 5 })).toThrow();
  c.effectManager.dispose(); ability.configure({ bladeLength: 5 }); expect(ability.config.bladeLength).toBe(5);
  dispose(c, ability);
});
test('Distance controls impact timing; 20 casts and tier changes reuse bounded buffers and clean owners', () => {
  const c = context(), ability = new SandReaper(), baseline = c.scene.children.length, subscriptions = c.quality.subscriberCount;
  const geometrySet = new Set<BufferGeometry>();
  for (let cast = 0; cast < 20; cast++) {
    c.quality.setPreset(cast % 3 === 0 ? 'LOW' : cast % 3 === 1 ? 'MEDIUM' : 'MAX');
    expect(ability.cast(c)).toBe(true);
    let time = 0;
    while (time < 1) { c.effectManager.update(.02, time); time += .02; }
    expect(c.water!.emitted).toBeGreaterThan(0);
    c.scene.traverse(o => { if (o instanceof Mesh) { geometrySet.add(o.geometry); expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true); } if (o instanceof InstancedMesh) expect(o.count).toBeLessThanOrEqual(o.instanceMatrix.count); });
    // At 42m the blade cannot have arrived at 1.0s, independent of frame count.
    expect(c.scene.getObjectByName('Sand Reaper · bounded visual bundle')?.children[0].visible).toBe(true);
    while (time < 4.6) { c.effectManager.update(.02, time); c.water!.update(time); time += .02; }
    expect(c.effectManager.activeCount).toBe(0); expect(ability.activeCount).toBe(0);
    expect(c.scene.children.length).toBe(baseline); expect(c.quality.subscriberCount).toBe(subscriptions); expect(c.water!.activeCount).toBe(0);
  }
  expect(geometrySet.size).toBeLessThanOrEqual(13);
  expect(ability.cast(c)).toBe(true); expect(ability.cast(c)).toBe(true); expect(ability.cast(c)).toBe(false);
  dispose(c, ability);
});
