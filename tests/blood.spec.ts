import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Scene, Vector3, Mesh } from "three";
import { Player } from "../src/player/Player";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { TargetingSystem } from "../src/targeting/TargetingSystem";
import { EffectManager } from "../src/effects/EffectManager";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { WaterInteractionManager } from "../src/world/water/WaterInteractionManager";
import { SanguineEclipse } from "../src/abilities/blood/SanguineEclipse";
import { SanguineEclipseEffect } from "../src/abilities/blood/SanguineEclipseEffect";
import { BloodResourceManager } from "../src/abilities/blood/BloodResourceManager";
import { resolveBloodTarget } from "../src/abilities/blood/resolveBloodTarget";
import { bloodQuality } from "../src/abilities/blood/SanguineQuality";
import {
  SanguineTimeline,
  sanguineStage,
} from "../src/abilities/blood/SanguineTimeline";
import { LANCE_TIMES } from "../src/abilities/blood/BloodLanceScore";
function context(): AbilityCastContext {
  const scene = new Scene(),
    player = new Player(scene),
    water = new WaterInteractionManager();
  return {
    scene,
    player,
    water,
    camera: new PerspectiveCamera(),
    quality: new GraphicsSettings(),
    targeting: new TargetingSystem(scene),
    effectManager: new EffectManager(),
    origin: player.visual.getRightHandWorldPosition(),
    direction: new Vector3(0, -0.2, -1),
    groundTarget: new Vector3(0, 0, -40),
    targetPoint: new Vector3(0, 0, -40),
    playerForward: new Vector3(0, 0, -1),
    cameraForward: new Vector3(0, -0.2, -1),
    time: 0,
  };
}
function cleanup(c: AbilityCastContext): void {
  c.effectManager.dispose();
  c.player.dispose();
  c.targeting.dispose();
  c.quality.dispose();
  c.water?.dispose();
}
test("Blood target snapshots finite ground hits, clamps sixty metres and rejects sky", () => {
  const origin = new Vector3(2, 0, 3),
    hit = new Vector3(2, 0, -200),
    target = resolveBloodTarget(origin, hit)!;
  expect(target.distanceTo(origin)).toBeCloseTo(60);
  hit.set(100, 0, 100);
  expect(target.z).toBeCloseTo(-57);
  expect(resolveBloodTarget(origin, null)).toBeNull();
  expect(resolveBloodTarget(origin, new Vector3(0, NaN, 0))).toBeNull();
});
test("B/8 registration uses shared fourteen-second cooldown and allows two bounded overlapping bundles", () => {
  const c = context(),
    ability = new SanguineEclipse(),
    manager = new AbilityManager();
  manager.registry.register(ability);
  manager.assignSlot(7, ability.id);
  manager.select(7);
  expect(manager.slots[7].code).toBe("KeyB");
  expect(manager.cast(c)).toBe(true);
  expect(manager.getCooldown(7)).toBe(14);
  for (let i = 0; i < 100; i++) expect(manager.cast(c)).toBe(false);
  manager.update(14.1);
  expect(manager.cast(c)).toBe(true);
  manager.update(14.1);
  expect(manager.cast(c)).toBe(false);
  cleanup(c);
  manager.dispose();
});
test("Liquid timeline has distinct stages and barrage retains intentional cadence", () => {
  expect(
    [0.5, 2, 3, 5.5, 6.9, 8.7, 9.8, 10.6, 14.9].map(sanguineStage),
  ).toEqual([
    "AWAKENING",
    "ASCENSION",
    "ECLIPSE FORMATION",
    "LANCE FORMATION",
    "BARRAGE",
    "COMPRESSION",
    "EXECUTION",
    "LIQUID IMPACT",
    "AFTERMATH",
  ]);
  const a = new SanguineTimeline(),
    b = new SanguineTimeline();
  a.advance(10.5);
  for (const dt of [0.2, 0.01, 2.29, 8]) b.advance(dt);
  expect(a).toEqual(b);
  expect(LANCE_TIMES[2] - LANCE_TIMES[1]).toBeGreaterThan(0.4);
  expect(LANCE_TIMES[3] - LANCE_TIMES[2]).toBeLessThan(0.15);
  expect(LANCE_TIMES[7]).toBeGreaterThan(8);
});
test("Blood quality scales liquid geometry, lances, mist, droplets and bounded lights", () => {
  const q = Object.values(QUALITY_PRESETS).map(bloodQuality);
  expect(q.map((t) => t.droplets)).toEqual([240, 720, 1800]);
  expect(q.map((t) => t.lances)).toEqual([8, 16, 28]);
  expect(q.map((t) => t.lights)).toEqual([1, 2, 3]);
});
test("Liquid geometry, live hand, quality, water ownership and active disposal stay finite", () => {
  const c = context(),
    resources = new BloodResourceManager(),
    v = resources.pool.acquire()!,
    e = new SanguineEclipseEffect(c, resources, v, c.groundTarget!);
  let finite = true;
  v.root.traverse((o) => {
    if (o instanceof Mesh)
      finite &&= Array.from(o.geometry.getAttribute("position").array).every(
        Number.isFinite,
      );
  });
  expect(finite).toBe(true);
  expect(v.lance.material.vertexShader).toContain("instanceMatrix");
  e.update(4.5, 0);
  c.quality.setPreset("LOW");
  e.update(0, 0);
  expect(e.age).toBe(4.5);
  e.update(2.8, 0);
  expect(v.lance.impacts[0]).toBe(1);
  expect(c.water!.activeCount).toBeGreaterThan(0);
  const other = {};
  c.water!.addRipple(
    { position: new Vector3(), strength: 0.1, duration: 5, waveSpeed: 1 },
    other,
  );
  c.quality.setPreset("MAX");
  e.update(3, 0);
  expect(e.timeline.execution).toBeGreaterThan(0);
  e.dispose();
  e.dispose();
  expect(c.water!.activeCount).toBe(1);
  expect(c.quality.subscriberCount).toBe(0);
  expect(v.root.parent).toBeNull();
  expect(v.lights.lights.every((l) => !l.parent)).toBe(true);
  resources.dispose();
  cleanup(c);
});
