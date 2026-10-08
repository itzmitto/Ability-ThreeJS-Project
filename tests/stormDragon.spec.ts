import { test, expect } from "@playwright/test";
import { Mesh, PerspectiveCamera, Scene, Vector3 } from "three";
import { StormDragon } from "../src/abilities/stormDragon/StormDragon";
import {
  StormDragonTimeline,
  dragonState,
} from "../src/abilities/stormDragon/StormDragonTimeline";
import { DragonAnimationController } from "../src/abilities/stormDragon/DragonAnimationController";
import { resolveStormTarget } from "../src/abilities/stormDragon/resolveStormTarget";
import { stormDragonQuality } from "../src/abilities/stormDragon/StormDragonQuality";
import { QUALITY_PRESETS } from "../src/quality/QualityPreset";
import { GraphicsSettings } from "../src/quality/GraphicsSettings";
import { Player } from "../src/player/Player";
import { TargetingSystem } from "../src/targeting/TargetingSystem";
import { EffectManager } from "../src/effects/EffectManager";
import { AbilityManager } from "../src/abilities/AbilityManager";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { TempestCataclysm } from "../src/abilities/stormDragon/TempestCataclysm";
import { TempestCataclysmEffect } from "../src/abilities/stormDragon/TempestCataclysmEffect";
import { StormResourcePool } from "../src/abilities/stormDragon/StormResourcePool";
function context(): AbilityCastContext {
  const scene = new Scene(),
    player = new Player(scene),
    quality = new GraphicsSettings(),
    targeting = new TargetingSystem(scene);
  return {
    scene,
    player,
    quality,
    targeting,
    effectManager: new EffectManager(),
    camera: new PerspectiveCamera(),
    origin: player.visual.getRightHandWorldPosition(),
    direction: new Vector3(0, -0.2, -1),
    cameraForward: new Vector3(0, -0.2, -1),
    playerForward: new Vector3(0, 0, -1),
    targetPoint: new Vector3(0, 0, -45),
    groundTarget: new Vector3(0, 0, -45),
    time: 0,
  };
}
function cleanup(c: AbilityCastContext): void {
  c.effectManager.dispose();
  c.player.dispose();
  c.targeting.dispose();
  c.quality.dispose();
}
test("Dragon geometry has finite bounds, valid indices/normals and real attachments", () => {
  const d = new StormDragon();
  let vertices = 0,
    triangles = 0;
  d.root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry,
      p = g.getAttribute("position");
    vertices += p.count;
    expect([...p.array].every(Number.isFinite)).toBe(true);
    const n = g.getAttribute("normal");
    if (n) expect([...n.array].every(Number.isFinite)).toBe(true);
    if (g.index) {
      triangles += g.index.count / 3;
      expect(
        Array.from(g.index.array).every((i) => i >= 0 && i < p.count),
      ).toBe(true);
    }
    g.computeBoundingSphere();
    expect(Number.isFinite(g.boundingSphere!.radius)).toBe(true);
  });
  expect(vertices).toBeGreaterThan(5000);
  expect(triangles).toBeGreaterThan(5000);
  expect(d.wings).toHaveLength(2);
  expect(d.wings[0].tips).toHaveLength(5);
  expect(d.tail.joints).toHaveLength(12);
  expect(d.limbs.joints).toHaveLength(8);
  d.updateAnchors();
  expect(
    [...d.mouthWorld.toArray(), ...d.anchors.flatMap((a) => a.toArray())].every(
      Number.isFinite,
    ),
  ).toBe(true);
  d.dispose();
});
test("Timeline states and irregular-frame animation remain deterministic", () => {
  expect([1, 2.5, 3.8, 5, 6, 8, 9.5, 11, 14].map(dragonState)).toEqual([
    "DORMANT",
    "EMERGING",
    "ASCENDING",
    "CIRCLING",
    "HOVERING",
    "CHARGING",
    "BREATHING",
    "CATACLYSM",
    "DISSOLVING",
  ]);
  const a = new StormDragon(),
    b = new StormDragon(),
    ta = new StormDragonTimeline(),
    tb = new StormDragonTimeline();
  ta.advance(9.5);
  for (const dt of [0.01, 0.2, 1.29, 3, 5]) tb.advance(dt);
  new DragonAnimationController(a).update(ta, 45, 2);
  new DragonAnimationController(b).update(tb, 45, 2);
  expect(a.mouthWorld.distanceTo(b.mouthWorld)).toBeLessThan(1e-8);
  for (let t = 0; t < 18; t += 0.137) {
    ta.age = 0;
    ta.advance(t);
    new DragonAnimationController(a).update(ta, 5, 2);
    let finite = true;
    a.root.traverse((o) => {
      if (
        ![...o.position.toArray(), ...o.quaternion.toArray()].every(
          Number.isFinite,
        )
      )
        finite = false;
    });
    expect(finite).toBe(true);
  }
  a.dispose();
  b.dispose();
});
test("Ground targeting rejects invalid input and clamps a snapshot to seventy metres", () => {
  const p = new Vector3(5, 0, 4),
    hit = new Vector3(5, 0, -200);
  const target = resolveStormTarget(p, hit)!;
  expect(target.distanceTo(p)).toBeCloseTo(70);
  hit.x = 99;
  p.x = 80;
  expect(target.x).toBe(5);
  expect(resolveStormTarget(p, null)).toBeNull();
  expect(resolveStormTarget(p, new Vector3(NaN, 0, 1))).toBeNull();
  expect(resolveStormTarget(new Vector3(0, Infinity, 0), hit)).toBeNull();
});
test("Central presets increase bounded rain, clouds, arcs and attack detail", () => {
  const a = stormDragonQuality(QUALITY_PRESETS.LOW),
    b = stormDragonQuality(QUALITY_PRESETS.MEDIUM),
    c = stormDragonQuality(QUALITY_PRESETS.MAX);
  for (const key of [
    "clouds",
    "rain",
    "particles",
    "arcs",
    "strikes",
    "tornadoes",
    "helices",
    "scales",
    "lights",
  ] as const) {
    expect(a[key]).toBeLessThan(b[key]);
    expect(b[key]).toBeLessThan(c[key]);
  }
  expect(c.particles + c.rain).toBe(4100);
  expect(c.lights).toBe(3);
});
test("C/7 uses shared cooldown and a single bounded manifestation", () => {
  const c = context(),
    m = new AbilityManager(),
    a = new TempestCataclysm();
  m.registry.register(a);
  m.assignSlot(6, a.id);
  m.select(6);
  expect(m.selectedAbility?.id).toBe("tempest-cataclysm");
  expect(m.cast(c)).toBe(true);
  for (let i = 0; i < 100; i++) expect(m.cast(c)).toBe(false);
  expect(a.cast(c)).toBe(false);
  c.effectManager.update(18.1, 18.1);
  expect(c.effectManager.activeCount).toBe(0);
  m.update(24.99);
  expect(m.cast(c)).toBe(false);
  m.update(0.02);
  expect(m.cast(c)).toBe(true);
  c.effectManager.dispose();
  m.dispose();
  cleanup(c);
});
test("Live quality preserves target/time, breath starts at animated mouth, and active cleanup unsubscribes", () => {
  const c = context(),
    resources = new StormResourcePool(),
    v = resources.pool.acquire()!,
    base = c.quality.subscriberCount,
    e = new TempestCataclysmEffect(c, resources, v, c.groundTarget!);
  const target = e.target.clone();
  e.update(9.5, 9.5);
  expect(v.beam.root.position.distanceTo(e.mouth)).toBeLessThan(1e-9);
  expect(v.beam.direction.length()).toBeCloseTo(1);
  expect(v.dragon.head.jaw.rotation.x).toBeGreaterThan(0.4);
  c.player.position.set(10, 0, 10);
  for (const preset of ["LOW", "MAX", "MEDIUM"] as const) {
    c.quality.setPreset(preset);
    e.update(0, 9.5);
    expect(e.age).toBe(9.5);
    expect(e.target.distanceTo(target)).toBe(0);
    expect(v.beam.root.position.distanceTo(e.mouth)).toBeLessThan(1e-9);
  }
  expect(c.quality.subscriberCount).toBe(base + 1);
  e.dispose();
  e.dispose();
  expect(c.quality.subscriberCount).toBe(base);
  expect(v.root.parent).toBeNull();
  expect(v.lighting.lights.every((l) => !l.parent)).toBe(true);
  expect(resources.pool.acquire()).toBe(v);
  resources.pool.release(v);
  resources.dispose();
  cleanup(c);
});
