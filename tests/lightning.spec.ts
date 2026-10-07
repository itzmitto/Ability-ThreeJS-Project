import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { resolveVerdictTarget } from "../src/abilities/lightning/resolveVerdictTarget";
import { LightningBranchGenerator } from "../src/abilities/lightning/LightningBranchGenerator";
import { LightningPath } from "../src/abilities/lightning/LightningPath";
import { HeavensVerdict } from "../src/abilities/lightning/HeavensVerdict";
import { HeavensVerdictEffect } from "../src/abilities/lightning/HeavensVerdictEffect";
import { VerdictResources } from "../src/abilities/lightning/VerdictResources";
import {
  lightningQuality,
  VERDICT,
} from "../src/abilities/lightning/verdictConfig";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { EffectManager } from "../src/effects/EffectManager";
import { Player } from "../src/player/Player";
import { TargetingSystem } from "../src/targeting/TargetingSystem";

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

test("Verdict ground targets clamp to 45 m and invalid/sky data never becomes an origin strike", () => {
  const player = new Vector3(19, 0, -17),
    near = new Vector3(21, 0, -25);
  expect(resolveVerdictTarget(player, near)?.equals(near)).toBe(true);
  expect(
    resolveVerdictTarget(player, new Vector3(400, 0, -170))?.distanceTo(player),
  ).toBeCloseTo(45, 8);
  for (const bad of [null, new Vector3(NaN, 0, 0), new Vector3(0, Infinity, 0)])
    expect(resolveVerdictTarget(player, bad)).toBeNull();
  expect(resolveVerdictTarget(new Vector3(Infinity, 0, 0), near)).toBeNull();
});

test("Bounded branching is finite, deterministic, increasingly detailed and attaches forks to a stable trunk", () => {
  const generator = new LightningBranchGenerator();
  let previous = 0;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    const q = lightningQuality(QUALITY_PRESETS[preset]);
    const path = generator.generate(48137, q);
    expect(path.count).toBe(
      q.subdivisions + q.major * 16 + q.minor * 9 + q.micro * 5,
    );
    expect(path.count).toBeGreaterThan(previous);
    expect(path.count).toBeLessThanOrEqual(path.capacity);
    previous = path.count;
    const original = path.data.slice(0, path.count * 10);
    for (const value of original) expect(Number.isFinite(value)).toBe(true);
    expect(path.data[1]).toBe(VERDICT.height);
    expect(path.data[(q.subdivisions - 1) * 10 + 4]).toBeCloseTo(0.06, 5);
    const fork = q.subdivisions * 10;
    let attached = false;
    for (let i = 0; i < q.subdivisions; i++)
      if (
        path.data[i * 10 + 3] === path.data[fork] &&
        path.data[i * 10 + 4] === path.data[fork + 1] &&
        path.data[i * 10 + 5] === path.data[fork + 2]
      )
        attached = true;
    expect(attached).toBe(true);
    generator.generate(48137, q, 1);
    expect(Array.from(path.data.slice(0, q.subdivisions * 10))).toEqual(
      Array.from(original.slice(0, q.subdivisions * 10)),
    );
    expect(
      Array.from(path.data.slice(q.subdivisions * 10, path.count * 10)),
    ).not.toEqual(Array.from(original.slice(q.subdivisions * 10)));
  }
  const bounded = new LightningPath(4);
  bounded.clear(1);
  bounded.channel(new Vector3(), new Vector3(0, 10, 0), 100, 0.1, 1);
  expect(bounded.count).toBe(4);
});

test("Central quality budgets control branches, clouds, leaders, particles and secondary strikes", () => {
  const q = Object.values(QUALITY_PRESETS).map(lightningQuality);
  expect(q.map((v) => v.major)).toEqual([4, 8, 12]);
  expect(q.map((v) => v.minor)).toEqual([10, 22, 42]);
  expect(q.map((v) => v.clouds)).toEqual([3, 6, 10]);
  expect(q.map((v) => v.precursors)).toEqual([3, 6, 10]);
  expect(q.map((v) => v.secondary)).toEqual([2, 4, 7]);
  for (const [i, config] of Object.values(QUALITY_PRESETS).entries())
    expect(q[i].particles).toBeLessThanOrEqual(config.effectParticleBudget);
});

test("Real ability registers on R/3, invalid casts reject safely and four-second cooldown is shared", () => {
  const c = fixture(),
    manager = new AbilityManager(),
    ability = new HeavensVerdict();
  manager.registry.register(ability);
  manager.assignSlot(2, ability.id);
  manager.select(2);
  expect(manager.slots[2].key).toBe("R");
  expect(manager.selectedAbility?.name).toBe("HEAVEN'S VERDICT");
  expect(manager.cast({ ...c, groundTarget: null })).toBe(false);
  expect(manager.getCooldown(2)).toBe(0);
  expect(c.effectManager.activeCount).toBe(0);
  expect(manager.cast(c)).toBe(true);
  expect(manager.getCooldown(2)).toBe(4);
  expect(manager.cast(c)).toBe(false);
  manager.update(3.99);
  expect(manager.cast(c)).toBe(false);
  manager.update(0.02);
  expect(manager.getCooldown(2)).toBe(0);
  expect(manager.cast(c)).toBe(true);
  dispose(c);
  manager.dispose();
});

test("Effect lifecycle, live preset transitions, lights, subscription and pooled-resource cleanup", () => {
  const c = fixture(),
    resources = new VerdictResources(),
    baseline = c.quality.subscriberCount;
  const target = resolveVerdictTarget(c.player.position, c.groundTarget)!;
  c.quality.setPreset("LOW");
  const effect = new HeavensVerdictEffect(
    c,
    resources,
    resources.pool.acquire()!,
    target,
    813,
  );
  expect(c.quality.subscriberCount).toBe(baseline + 1);
  effect.update(0.4, 0);
  c.quality.setPreset("MAX");
  expect(effect.visuals.storm.clouds.count).toBe(10);
  effect.update(0.632, 0);
  expect(effect.visuals.discharge.main.mesh.visible).toBe(true);
  expect(effect.visuals.impactLight.intensity).toBeGreaterThan(100);
  expect(effect.particleCount).toBe(840);
  effect.update(1.0, 0);
  expect(effect.visuals.impactLight.parent).toBeNull();
  expect(effect.visuals.skyLight.parent).toBeNull();
  c.quality.setPreset("LOW");
  expect(effect.visuals.mist.mesh.count).toBe(6);
  expect(effect.update(VERDICT.lifetime - 2.032 - 0.001, 0)).toBe(true);
  expect(effect.update(0.002, 0)).toBe(false);
  effect.dispose();
  effect.dispose();
  expect(c.quality.subscriberCount).toBe(baseline);
  expect(effect.visuals.root.parent).toBeNull();
  expect(effect.visuals.impactLight.intensity).toBe(0);
  const reused = resources.pool.acquire()!;
  expect(reused).toBe(effect.visuals);
  resources.pool.release(reused);
  resources.dispose();
  dispose(c);
});
