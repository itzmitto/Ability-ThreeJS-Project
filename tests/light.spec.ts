import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { Player } from "../src/player/Player";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { TargetingSystem } from "../src/targeting/TargetingSystem";
import { EffectManager } from "../src/effects/EffectManager";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { Megiddo } from "../src/abilities/light/Megiddo";
import { MegiddoResources } from "../src/abilities/light/MegiddoResources";
import { MegiddoEffect } from "../src/abilities/light/MegiddoEffect";
import { BeamStrikeSequence } from "../src/abilities/light/BeamStrikeSequence";
import { MEGIDDO, radiantQuality } from "../src/abilities/light/MegiddoConfig";
import { resolveMegiddoTarget } from "../src/abilities/light/resolveMegiddoTarget";
function fixture(): AbilityCastContext {
  const scene = new Scene(),
    player = new Player(scene),
    quality = new GraphicsSettings(),
    targeting = new TargetingSystem(scene);
  return {
    scene,
    player,
    quality,
    targeting,
    camera: new PerspectiveCamera(),
    origin: player.visual.getRightHandWorldPosition(),
    direction: new Vector3(0, -0.2, -1),
    playerForward: new Vector3(0, 0, -1),
    cameraForward: new Vector3(0, -0.2, -1),
    targetPoint: new Vector3(0, 0, -18),
    groundTarget: new Vector3(0, 0, -18),
    effectManager: new EffectManager(),
    time: 0,
  };
}
function dispose(c: AbilityCastContext): void {
  c.effectManager.dispose();
  c.targeting.dispose();
  c.player.dispose();
  c.quality.dispose();
}

test("Megiddo finite ground targeting clamps 50 m and rejects sky/invalid data", () => {
  const p = new Vector3(10, 0, 17),
    g = new Vector3(-400, 0, -900);
  expect(resolveMegiddoTarget(p, g)?.distanceTo(p)).toBeCloseTo(50, 8);
  expect(resolveMegiddoTarget(p, new Vector3(10, 0, 19))?.z).toBe(19);
  for (const bad of [null, new Vector3(NaN, 0, 1), new Vector3(1, Infinity, 1)])
    expect(resolveMegiddoTarget(p, bad)).toBeNull();
  expect(resolveMegiddoTarget(new Vector3(Infinity, 0, 0), g)).toBeNull();
});
test("Authored score is deterministic, bounded and preserves primary/finisher across quality", () => {
  const score = new BeamStrikeSequence();
  for (const detail of [0, 1, 2]) {
    score.configure(detail, 12345);
    expect(score.count).toBe([5, 8, 12][detail]);
    expect(score.timings[0]).toBeCloseTo(1.3);
    expect(score.timings[(score.count - 1) * 4]).toBeCloseTo(2.46);
    expect(score.offsets[0]).toBeCloseTo(0);
    expect(score.offsets[2]).toBeCloseTo(0);
    for (const n of [...score.offsets, ...score.timings])
      expect(Number.isFinite(n)).toBe(true);
    const before = score.offsets.slice();
    score.configure(detail, 12345);
    expect(score.offsets).toEqual(before);
    for (let i = 0; i < score.count; i++) {
      expect(
        Math.hypot(score.offsets[i * 3], score.offsets[i * 3 + 2]),
      ).toBeLessThan(6.6);
      expect(score.timings[i * 4 + 1]).toBeGreaterThan(0.1);
    }
  }
  expect(score.getFlash(1.3)).toBeGreaterThan(1);
  expect(score.getFlash(3.5)).toBe(0);
});
test("Central budgets control strike count, optical detail and bounded particle buffers", () => {
  const configs = Object.values(QUALITY_PRESETS).map(radiantQuality);
  expect(configs.map((q) => q.strikes)).toEqual([5, 8, 12]);
  expect(configs.map((q) => q.particles)).toEqual([150, 400, 900]);
  const resources = new MegiddoResources(),
    v = resources.pool.acquire()!;
  for (const [i, config] of Object.values(QUALITY_PRESETS).entries()) {
    const q = configs[i];
    v.sequence.configure(q.detail, 12);
    v.particles.configure(q.particles, q.mist, v.sequence, 1);
    v.particles.update(1.36);
    expect(v.particles.count).toBeLessThanOrEqual(config.effectParticleBudget);
    for (const e of v.particles.emitters)
      expect(e.count).toBeLessThanOrEqual(e.capacity);
  }
  resources.pool.release(v);
  resources.dispose();
});
test("F/4 registration, rejected sky cast and shared eight-second cooldown", () => {
  const c = fixture(),
    m = new AbilityManager(),
    a = new Megiddo();
  m.registry.register(a);
  m.assignSlot(3, a.id);
  m.select(3);
  expect(m.slots[3].key).toBe("F");
  expect(m.selectedAbility?.name).toBe("MEGIDDO");
  expect(m.cast({ ...c, groundTarget: null })).toBe(false);
  expect(m.getCooldown(3)).toBe(0);
  expect(m.cast(c)).toBe(true);
  expect(m.getCooldown(3)).toBe(8);
  for (let i = 0; i < 40; i++) expect(m.cast(c)).toBe(false);
  m.update(7.99);
  expect(m.cast(c)).toBe(false);
  m.update(0.02);
  expect(m.cast(c)).toBe(true);
  dispose(c);
  m.dispose();
});
test("6.8 s lifecycle, hand attachment, live quality, transient light and pool cleanup", () => {
  const c = fixture(),
    r = new MegiddoResources(),
    baseline = c.quality.subscriberCount;
  c.quality.setPreset("LOW");
  const e = new MegiddoEffect(c, r, r.pool.acquire()!, c.groundTarget!, 19);
  expect(c.quality.subscriberCount).toBe(baseline + 1);
  e.update(0.22, 0);
  expect(
    e.visuals.hand.root.position
      .clone()
      .add(e.target)
      .distanceTo(c.player.visual.getRightHandWorldPosition()),
  ).toBeLessThan(0.001);
  c.quality.setPreset("MAX");
  e.update(1.14, 0);
  expect(e.visuals.beams.geometry.instanceCount).toBe(12);
  expect(e.visuals.impactLight.intensity).toBeGreaterThan(200);
  expect(e.particleCount).toBe(900);
  e.update(1.7, 0);
  expect(e.visuals.impactLight.parent).toBeNull();
  expect(e.visuals.fillLight.parent).toBeNull();
  c.quality.setPreset("LOW");
  e.update(0, 0);
  expect(e.visuals.beams.geometry.instanceCount).toBe(5);
  expect(e.update(MEGIDDO.lifetime - 3.06 - 0.001, 0)).toBe(true);
  expect(e.update(0.002, 0)).toBe(false);
  e.dispose();
  e.dispose();
  expect(c.quality.subscriberCount).toBe(baseline);
  expect(e.visuals.root.parent).toBeNull();
  expect(e.visuals.impactLight.intensity).toBe(0);
  const reused = r.pool.acquire()!;
  expect(reused).toBe(e.visuals);
  r.pool.release(reused);
  r.dispose();
  dispose(c);
});
