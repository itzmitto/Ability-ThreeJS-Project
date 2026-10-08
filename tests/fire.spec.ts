import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { Player } from "../src/player/Player";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { TargetingSystem } from "../src/targeting/TargetingSystem";
import { EffectManager } from "../src/effects/EffectManager";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { AbyssalFlame } from "../src/abilities/fire/AbyssalFlame";
import { AbyssalFlameEffect } from "../src/abilities/fire/AbyssalFlameEffect";
import { FireResources } from "../src/abilities/fire/FireResources";
import {
  ABYSSAL,
  fireQuality,
  burnStrength,
} from "../src/abilities/fire/AbyssalFlameConfig";
import { resolveFireTarget } from "../src/abilities/fire/resolveFireTarget";
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
test("Finite ground targets clamp 42 m and failed targeting never becomes origin", () => {
  const p = new Vector3(12, 0, -13);
  expect(
    resolveFireTarget(p, new Vector3(500, 0, -800))?.distanceTo(p),
  ).toBeCloseTo(42, 8);
  for (const g of [null, new Vector3(NaN, 0, 2), new Vector3(0, Infinity, 0)])
    expect(resolveFireTarget(p, g)).toBeNull();
  expect(
    resolveFireTarget(new Vector3(Infinity, 0, 0), new Vector3()),
  ).toBeNull();
});
test("V/5 uses existing selection and six-second cooldown", () => {
  const c = fixture(),
    m = new AbilityManager(),
    a = new AbyssalFlame();
  m.registry.register(a);
  m.assignSlot(4, a.id);
  m.select(4);
  expect(m.slots[4].key).toBe("V");
  expect(m.selectedAbility?.name).toBe("ABYSSAL FLAME");
  expect(m.cast({ ...c, groundTarget: null })).toBe(false);
  expect(m.getCooldown(4)).toBe(0);
  expect(m.cast(c)).toBe(true);
  expect(m.getCooldown(4)).toBe(6);
  for (let i = 0; i < 40; i++) expect(m.cast(c)).toBe(false);
  m.update(5.99);
  expect(m.cast(c)).toBe(false);
  m.update(0.02);
  expect(m.cast(c)).toBe(true);
  dispose(c);
  m.dispose();
});
test("Presets bound flame layers, smoke and distinct ember categories", () => {
  const r = new FireResources(),
    v = r.pool.acquire()!;
  const q = Object.values(QUALITY_PRESETS).map(fireQuality);
  expect(q.map((c) => c.secondary)).toEqual([3, 6, 9]);
  expect(q.map((c) => c.layers)).toEqual([2, 3, 4]);
  expect(q.map((c) => c.smoke)).toEqual([12, 28, 48]);
  for (const config of q) {
    v.flames.configure(config, 182);
    expect(v.flames.geometry.instanceCount).toBe(
      (1 + config.secondary + config.pockets) * config.layers,
    );
    expect(v.flames.geometry.instanceCount).toBeLessThanOrEqual(200);
    v.embers.configure(config.embers, 1);
    expect(v.embers.emitters.reduce((n, e) => n + e.count, 0)).toBe(
      config.embers,
    );
    for (const e of v.embers.emitters) expect(e.count).toBeLessThanOrEqual(450);
  }
  r.pool.release(v);
  r.dispose();
});
test("Burn remains after eruption and peripheral fuel expires before central heat", () => {
  expect(burnStrength(3)).toBe(1);
  expect(burnStrength(5.8, 4.7)).toBeLessThan(burnStrength(5.8, 0));
  expect(burnStrength(6.2, 4.7)).toBe(0);
  expect(burnStrength(6.2, 0)).toBeGreaterThan(0.5);
  expect(burnStrength(7.8, 0)).toBe(0);
});
test("Live quality, 8.6 s lingering lifecycle, light removal, unsubscribe and bounded pool reuse", () => {
  const c = fixture(),
    r = new FireResources(),
    base = c.quality.subscriberCount;
  c.quality.setPreset("LOW");
  const e = new AbyssalFlameEffect(
    c,
    r,
    r.pool.acquire()!,
    c.groundTarget!,
    72,
  );
  e.update(0.22, 0);
  expect(
    e.visuals.charge.root.position
      .clone()
      .add(e.target)
      .distanceTo(c.player.visual.getRightHandWorldPosition()),
  ).toBeLessThan(0.001);
  e.update(2.78, 0);
  expect(e.visuals.flames.body.visible).toBe(true);
  c.quality.setPreset("MAX");
  e.update(0, 0);
  expect(e.visuals.flames.geometry.instanceCount).toBe(192);
  expect(e.visuals.smoke.geometry.instanceCount).toBe(48);
  e.update(3.2, 0);
  c.quality.setPreset("LOW");
  e.update(0, 0);
  expect(e.visuals.smoke.geometry.instanceCount).toBe(12);
  expect(e.visuals.heat.mesh.visible).toBe(false);
  e.update(1.7, 0);
  expect(e.visuals.impactLight.parent).toBeNull();
  expect(e.visuals.fillLight.parent).toBeNull();
  expect(e.visuals.smoke.mesh.visible).toBe(true);
  expect(e.visuals.residue.mesh.visible).toBe(true);
  expect(e.update(ABYSSAL.lifetime - 7.9 + 0.001, 0)).toBe(false);
  e.dispose();
  e.dispose();
  expect(c.quality.subscriberCount).toBe(base);
  expect(e.visuals.root.parent).toBeNull();
  expect(e.visuals.impactLight.intensity).toBe(0);
  const reused = r.pool.acquire()!;
  expect(reused).toBe(e.visuals);
  r.pool.release(reused);
  r.dispose();
  dispose(c);
});
