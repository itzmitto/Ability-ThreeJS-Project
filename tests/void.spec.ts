import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { Player } from "../src/player/Player";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { TargetingSystem } from "../src/targeting/TargetingSystem";
import { EffectManager } from "../src/effects/EffectManager";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { Worldrend } from "../src/abilities/void/Worldrend";
import { WorldrendEffect } from "../src/abilities/void/WorldrendEffect";
import { VoidResources } from "../src/abilities/void/VoidResources";
import {
  WORLDREND,
  voidQuality,
  riftPhase,
} from "../src/abilities/void/WorldrendConfig";
import { resolveVoidTarget } from "../src/abilities/void/resolveVoidTarget";
import { makeRiftGeometry } from "../src/abilities/void/RiftGeometry";
import { RiftOpening } from "../src/abilities/void/RiftOpening";
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
test("Seed changes retain warmed geometry while topology changes replace owned buffers", () => {
  const r = new RiftOpening(),
    q = voidQuality(QUALITY_PRESETS.MEDIUM);
  r.configure(q, 11);
  const g = r.interior.geometry,
    first = g.getAttribute("position").getX(20);
  r.configure(q, 32);
  expect(r.interior.geometry).toBe(g);
  expect(g.getAttribute("position").getX(20)).not.toBe(first);
  r.configure(voidQuality(QUALITY_PRESETS.MAX), 32);
  expect(r.interior.geometry).not.toBe(g);
  r.dispose();
});
function dispose(c: AbilityCastContext): void {
  c.effectManager.dispose();
  c.targeting.dispose();
  c.player.dispose();
  c.quality.dispose();
}

test("X/6 registry and shared cooldown reject rapid attempts for twelve seconds", () => {
  const c = fixture(),
    m = new AbilityManager(),
    a = new Worldrend();
  m.registry.register(a);
  m.assignSlot(5, a.id);
  m.select(5);
  expect(m.selectedAbility?.id).toBe("worldrend");
  expect(m.selectedAbility?.cooldown).toBe(12);
  expect(m.cast(c)).toBe(true);
  for (let i = 0; i < 80; i++) expect(m.cast(c)).toBe(false);
  m.update(11.99);
  expect(m.cast(c)).toBe(false);
  m.update(0.02);
  expect(m.cast(c)).toBe(true);
  c.effectManager.dispose();
  m.dispose();
  dispose(c);
});
test("Ground range validates every component and clamps to 55 metres", () => {
  const p = new Vector3(2, 0, 7);
  expect(
    resolveVoidTarget(p, new Vector3(500, 0, -700))?.distanceTo(p),
  ).toBeCloseTo(55, 9);
  for (const v of [null, new Vector3(NaN, 0, 1), new Vector3(2, Infinity, 3)])
    expect(resolveVoidTarget(p, v)).toBeNull();
  expect(
    resolveVoidTarget(new Vector3(Infinity, 0, 0), new Vector3()),
  ).toBeNull();
  const c = fixture(),
    a = new Worldrend();
  expect(a.cast({ ...c, groundTarget: null })).toBe(false);
  expect(c.effectManager.activeCount).toBe(0);
  a.dispose();
  dispose(c);
});
test("Authored geometry opens, contracts, implodes and repairs rather than fading", () => {
  expect(riftPhase(0.5).open).toBe(0);
  expect(riftPhase(1.8).open).toBeGreaterThan(0);
  expect(riftPhase(3).open).toBe(1);
  expect(riftPhase(6.7).open).toBeLessThan(0.5);
  expect(riftPhase(7.5).open).toBe(0);
  expect(riftPhase(9).repair).toBeGreaterThan(0);
  expect(riftPhase(10.5).repair).toBe(0);
  expect(WORLDREND.lifetime).toBe(11);
});
test("Quality and seeded procedural geometry remain finite, bounded and deterministic", () => {
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    const q = voidQuality(QUALITY_PRESETS[preset]);
    const a = makeRiftGeometry(q.levels, q.depths, 829),
      b = makeRiftGeometry(q.levels, q.depths, 829);
    expect(Array.from(a.getAttribute("position").array)).toEqual(
      Array.from(b.getAttribute("position").array),
    );
    expect(
      Array.from(a.getAttribute("position").array).every(Number.isFinite),
    ).toBe(true);
    expect(a.boundingBox!.max.y).toBe(18);
    expect(a.boundingBox!.min.z).toBeGreaterThanOrEqual(-8.81);
    expect(a.getAttribute("position").count).toBeLessThan(1200);
    expect(q.shards + q.fragments).toBeLessThanOrEqual(484);
    expect(q.particles).toBeLessThanOrEqual(1100);
    a.dispose();
    b.dispose();
  }
});
test("Frozen world orientation, live quality changes, phase lifecycle and active disposal", () => {
  const c = fixture(),
    resources = new VoidResources(),
    base = c.quality.subscriberCount;
  const v = resources.pool.acquire()!;
  const e = new WorldrendEffect(c, resources, v, new Vector3(0, 0, -20), 729);
  const orientation = v.root.quaternion.clone();
  c.camera.position.x = 12;
  e.update(1.8, 0);
  expect(v.root.quaternion.equals(orientation)).toBe(true);
  expect(v.rift.interior.visible).toBe(true);
  c.quality.setPreset("MAX");
  e.update(1, 0);
  expect(v.shards.geometry.instanceCount).toBe(484);
  expect(v.particles.count).toBe(1100);
  c.quality.setPreset("MEDIUM");
  e.update(2.8, 0);
  expect(e.age).toBeCloseTo(5.6);
  c.quality.setPreset("LOW");
  e.update(1.95, 0);
  expect(v.core.mesh.visible).toBe(true);
  expect(v.upper.parent).toBeNull();
  e.update(1.5, 0);
  c.quality.setPreset("MAX");
  e.update(0, 0);
  expect(v.rift.edges.visible).toBe(true);
  expect(v.light.parent).toBeNull();
  expect(e.update(2, 0)).toBe(false);
  e.dispose();
  e.dispose();
  expect(v.root.parent).toBeNull();
  expect(c.quality.subscriberCount).toBe(base);
  const again = resources.pool.acquire()!;
  expect(again).toBe(v);
  const second = new WorldrendEffect(
    c,
    resources,
    again,
    new Vector3(1, 0, -2),
    729,
  );
  second.update(3, 0);
  second.dispose();
  resources.dispose();
  dispose(c);
});
