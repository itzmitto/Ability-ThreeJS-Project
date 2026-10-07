import { test, expect } from "@playwright/test";
import { Vector3 } from "three";
import { resolveWindTarget } from "../src/abilities/wind/resolveWindTarget";
import { TEMPEST, windQuality } from "../src/abilities/wind/windConfig";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { WindResources } from "../src/abilities/wind/WindResources";

test("Wind target uses ground, clamps from hand and falls back safely for sky/nonfinite hits", () => {
  const hand = new Vector3(7, 1.1, -9),
    aim = new Vector3(0, 0.1, -1),
    ground = new Vector3(7, 0, -25);
  expect(resolveWindTarget(hand, ground, ground, aim)?.toArray()).toEqual([
    7, 0.6, -25,
  ]);
  const far = resolveWindTarget(hand, new Vector3(7, 0, -100), ground, aim)!;
  expect(far.distanceTo(hand)).toBeCloseTo(40, 8);
  const sky = resolveWindTarget(hand, null, ground, aim)!;
  expect(sky.distanceTo(hand)).toBeCloseTo(40, 8);
  expect(sky.y).toBeGreaterThan(hand.y);
  expect(
    resolveWindTarget(hand, new Vector3(NaN, 0, 0), ground, aim)?.equals(sky),
  ).toBe(true);
  expect(
    resolveWindTarget(new Vector3(Infinity, 0, 0), ground, ground, aim),
  ).toBeNull();
  expect(
    resolveWindTarget(hand, null, new Vector3(NaN, 0, 0), new Vector3()),
  ).toBeNull();
  expect(resolveWindTarget(hand, null, hand, new Vector3())).toBeNull();
  expect(TEMPEST.speed).toBe(36);
  expect(TEMPEST.cooldown).toBe(2);
});

test("Central budgets bound particle and instanced detail in every preset", () => {
  const values = Object.values(QUALITY_PRESETS).map(windQuality);
  expect(values.map((q) => q.ribbons)).toEqual([2, 4, 6]);
  expect(values.map((q) => q.rings)).toEqual([8, 12, 20]);
  for (const [i, config] of Object.values(QUALITY_PRESETS).entries())
    expect(values[i].flight + values[i].blast).toBeLessThanOrEqual(
      config.effectParticleBudget,
    );
  expect(values[0].detail).toBe(0);
  expect(values[2].mist).toBeGreaterThan(values[1].mist);
});

test("VFX bundle pool is bounded, removes roots and reuses GPU resources", () => {
  const resources = new WindResources(),
    first = resources.pool.acquire()!,
    second = resources.pool.acquire()!,
    third = resources.pool.acquire()!;
  expect(resources.pool.acquire()).toBeNull();
  const geometry = first.projectile.ribbons.mesh.geometry,
    material = first.projectile.ribbons.material;
  first.light.intensity = 5;
  resources.pool.release(first);
  expect(first.root.parent).toBeNull();
  expect(first.light.intensity).toBe(0);
  const reused = resources.pool.acquire()!;
  expect(reused).toBe(first);
  expect(reused.projectile.ribbons.mesh.geometry).toBe(geometry);
  expect(reused.projectile.ribbons.material).toBe(material);
  resources.pool.release(reused);
  resources.pool.release(second);
  resources.pool.release(third);
  resources.dispose();
});
