import { test, expect } from "@playwright/test";
import { Scene, Vector3 } from "three";
import { WaterInteractionManager } from "../src/world/water/WaterInteractionManager";
import { WaterFootstepInteraction } from "../src/world/water/WaterFootstepInteraction";
import { waterQuality } from "../src/world/water/WaterQualityConfig";
import { waterSurfaceGeometry } from "../src/world/water/WaterSurfaceGeometry";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { Player } from "../src/player/Player";
test("Ripple handles are finite, bounded, generation-safe and source-owned", () => {
  const water = new WaterInteractionManager(),
    a = {},
    b = {},
    point = new Vector3(3, 0, 8);
  water.setCapacity(8);
  const old = water.addRipple(
    { position: point, strength: 0.2, duration: 2, waveSpeed: 1 },
    a,
  );
  water.addRipple(
    { position: point, strength: 0.3, duration: 3, waveSpeed: 2 },
    b,
  );
  water.removeOwner(a);
  expect(water.activeCount).toBe(1);
  for (let i = 0; i < 200; i++)
    water.addRipple(
      { position: point, strength: 0.1, duration: 2, waveSpeed: 1 },
      b,
    );
  expect(water.activeCount).toBe(8);
  water.removeDisturbance(old);
  expect(water.activeCount).toBe(8);
  water.removeOwner(b);
  expect(water.activeCount).toBe(0);
  expect(
    water.addRipple({
      position: new Vector3(NaN, 0, 2),
      strength: 0.1,
      duration: 2,
      waveSpeed: 1,
    }),
  ).toBe(0);
});
test("Live water tier changes retain existing disturbances until damping expiry", () => {
  const water = new WaterInteractionManager();
  water.update(4);
  const handle = water.addRipple({
    position: new Vector3(),
    strength: 0.2,
    duration: 3,
    waveSpeed: 2,
  });
  water.setCapacity(8);
  water.update(6);
  expect(water.activeCount).toBe(1);
  water.update(7);
  expect(water.activeCount).toBe(0);
  water.removeDisturbance(handle);
  expect(water.activeCount).toBe(0);
});
test("Foot contact phase emits alternating world shoe ripples only while moving", () => {
  const scene = new Scene(),
    player = new Player(scene),
    water = new WaterInteractionManager(),
    steps = new WaterFootstepInteraction(water);
  for (let i = 0; i < 50; i++) steps.update(i * 0.016, player);
  expect(water.emitted).toBe(0);
  player.position.set(10, 0, 15);
  player.velocity.set(3.6, 0, 0);
  for (let i = 50; i < 150; i++) steps.update(i * 0.016, player);
  expect(water.emitted).toBeGreaterThan(4);
  expect(water.data[0]).toBeCloseTo(10.1);
  expect(water.data[4]).toBeCloseTo(9.9);
  const walking = water.emitted;
  player.velocity.set(0, 0, 0);
  for (let i = 150; i < 220; i++) steps.update(i * 0.016, player);
  expect(water.emitted).toBe(walking);
  steps.dispose();
  expect(water.activeCount).toBe(0);
  player.dispose();
});
test("Sprint contacts increase frequency without unbounded capacity", () => {
  const scene = new Scene(),
    player = new Player(scene),
    water = new WaterInteractionManager(),
    steps = new WaterFootstepInteraction(water);
  player.velocity.set(8, 0, 0);
  for (let i = 0; i < 180; i++) steps.update(i * 0.016, player);
  expect(water.emitted).toBeGreaterThan(12);
  expect(water.activeCount).toBeLessThanOrEqual(32);
  steps.dispose();
  player.dispose();
});
test("Water quality bounds reflection resolution, ripple sources and local lights", () => {
  const tiers = Object.values(QUALITY_PRESETS).map(waterQuality);
  expect(tiers.map((t) => t.reflectionSize)).toEqual([0, 384, 768]);
  expect(tiers.map((t) => t.rippleCapacity)).toEqual([8, 20, 32]);
  expect(tiers[2].lightCapacity).toBe(12);
});
test("Water LOD geometry retains seamless bounds and concentrates vertices near contact", () => {
  const g = waterSurfaceGeometry(6000, 160),
    p = g.getAttribute("position");
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
  g.computeBoundingBox();
  expect(g.boundingBox!.max.x).toBeCloseTo(3000);
  const near: number[] = [];
  for (let i = 0; i < p.count; i++)
    if (Math.abs(p.getX(i)) < 1) near.push(p.getX(i));
  expect(near.length).toBeGreaterThan(160);
  g.dispose();
});
