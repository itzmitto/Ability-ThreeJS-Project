import "../src/styles/game.css";
import { PointLight, Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { VoidResources } from "../src/abilities/void/VoidResources";
import { WorldrendEffect } from "../src/abilities/void/WorldrendEffect";
import { resolveVoidTarget } from "../src/abilities/void/resolveVoidTarget";
import { voidQuality, WORLDREND } from "../src/abilities/void/WorldrendConfig";
import type { QualityPreset } from "../src/quality/QualityPreset";

const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.start();
const report = document.createElement("pre");
report.id = "acceptance-report";
report.style.cssText =
  "position:fixed;left:30px;top:130px;max-height:73vh;max-width:93vw;overflow:auto;background:#071120f5;color:#bcd3f6;font:11px/1.45 monospace;padding:16px;z-index:30";
root.append(report);
const results: string[] = [],
  failures: string[] = [],
  profiles: unknown[] = [];
const assert = (ok: boolean, name: string): void => {
  (ok ? results : failures).push(name);
  report.textContent = [
    ...results.map((s) => `PASS ${s}`),
    ...failures.map((s) => `FAIL ${s}`),
  ].join("\n");
};
window.addEventListener("error", (e) => assert(false, e.message));
window.addEventListener("unhandledrejection", (e) =>
  assert(false, String(e.reason)),
);
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
const key = (code: string, down: boolean): void => {
  window.dispatchEvent(
    new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
  );
};
const scene = game.sceneManager.scene,
  renderer = game.renderer.renderer,
  resources = new VoidResources();
const context = (distance = 18): AbilityCastContext => {
  const target = new Vector3(
    game.player.position.x,
    0,
    game.player.position.z - distance,
  );
  return {
    player: game.player,
    scene,
    camera: game.camera.camera,
    origin: game.player.visual.getRightHandWorldPosition(),
    direction: game.targeting.aimDirection.clone(),
    groundTarget: target,
    targetPoint: target,
    playerForward: game.player.getForward().clone(),
    cameraForward: game.targeting.aimDirection.clone(),
    targeting: game.targeting,
    effectManager: game.effects,
    quality: game.settings,
    time: 0,
    cameraFeedback: game.camera.addFeedback,
  };
};
const counters = () => {
  let lights = 0;
  scene.traverse((o) => {
    if ((o as PointLight).isPointLight) lights++;
  });
  return {
    children: scene.children.length,
    lights,
    subscriptions: game.settings.subscriberCount,
    active: game.effects.activeCount,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
    calls: renderer.info.render.calls,
  };
};
const empty = (): void => {
  game.effects.update(WORLDREND.lifetime + 0.4, 0);
  game.renderer.render();
};
const cast = (slot: number): boolean => {
  game.abilities.select(slot);
  game.abilities.update(13);
  return game.abilities.cast(context());
};
const renderStages = (): void => {
  for (const step of [
    0.22, 0.6, 0.4, 0.6, 0.9, 1.1, 1.5, 1.2, 0.45, 0.3, 0.5, 0.8, 1.2, 1.5,
  ]) {
    game.effects.update(step, 0);
    game.renderer.render();
  }
};
const stable = (baseline: ReturnType<typeof counters>): boolean => {
  const now = counters();
  const matches = (Object.keys(baseline) as (keyof typeof baseline)[]).every(
    (k) => now[k] === baseline[k],
  );
  if (!matches) profiles.push({ stage: "counter mismatch", baseline, now });
  return matches;
};
function stageTiming(intervals: number[]) {
  const sorted = intervals.sort((a, b) => a - b);
  return {
    frames: sorted.length,
    median: Number(sorted[Math.floor(sorted.length * 0.5)]?.toFixed(2)),
    p95: Number(sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2)),
  };
}
try {
  await game.player.visual.ready;
  await delay(350);
  assert(
    game.player.visual.loaded && game.player.visual.animationState === "Idle",
    "Local human and Idle",
  );
  key("KeyW", true);
  await delay(420);
  assert(game.player.visual.animationState === "Walk", "WASD / Walk");
  key("ShiftLeft", true);
  await delay(420);
  assert(game.player.visual.animationState === "Run", "Sprint / Run");
  key("KeyW", false);
  key("ShiftLeft", false);
  await delay(650);
  const previousAim = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      buttons: 2,
      movementX: 40,
      movementY: 8,
    }),
  );
  await delay(100);
  assert(
    game.targeting.hasGroundTarget &&
      game.targeting.aimDirection.distanceTo(previousAim) > 0.02,
    "Camera mouse aiming and shared ground target",
  );
  key("KeyX", true);
  await delay(80);
  key("KeyX", false);
  assert(
    game.abilities.selectedAbility?.id === "worldrend",
    "X selects WORLDREND",
  );
  assert(
    !!root.querySelector('[aria-label="X: WORLDREND"]'),
    "Existing HUD shows WORLDREND",
  );
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0 }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === 1 && game.abilities.getCooldown(5) > 11.8,
    "Left click casts and starts twelve-second cooldown",
  );
  assert(!game.abilities.cast(context()), "Cooldown rejection");
  await delay(250);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Cooldown progress mask",
  );
  key("KeyD", true);
  await delay(700);
  key("KeyD", false);
  await delay(10300);
  assert(
    game.effects.activeCount === 0 && !scene.getObjectByName("WORLDREND"),
    "Real-time expiry while player moves",
  );
  key("Digit6", true);
  await delay(80);
  key("Digit6", false);
  assert(game.abilities.selectedIndex === 5, "6 aliases X");
  game.abilities.update(13);
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.abilities.getCooldown(5) === 0,
    "Sky rejection without cooldown",
  );
  for (const [slot, code, id] of [
    [0, "KeyQ", "glacial-eruption"],
    [1, "KeyE", "tempest-break"],
    [2, "KeyR", "heavens-verdict"],
    [3, "KeyF", "megiddo"],
    [4, "KeyV", "abyssal-flame"],
  ] as const) {
    key(code, true);
    await delay(80);
    key(code, false);
    assert(
      game.abilities.selectedAbility?.id === id && cast(slot),
      `${id} selection and cast`,
    );
    game.effects.update(1.36, 0);
    game.renderer.render();
    assert(
      game.effects.particleCount > 0 && game.effects.instanceCount > 0,
      `${id} visual layers render`,
    );
    empty();
  }
  assert(
    game.abilities.slots.filter((s) => s.abilityId !== null).length === 8,
    "Exactly eight equipped spells",
  );
  key("F3", true);
  await delay(100);
  key("F3", false);
  assert(!!root.querySelector(".debug-panel:not([hidden])"), "F3 debug");
  key("F3", true);
  await delay(80);
  key("F3", false);
  const baseSubs = game.settings.subscriberCount;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    const c = context(),
      v = resources.pool.acquire()!,
      e = new WorldrendEffect(c, resources, v, c.groundTarget!, 32751);
    const q = voidQuality(game.settings.config);
    const orientation = v.root.quaternion.clone();
    e.update(0.22, 0);
    assert(
      v.charge.mesh.visible && v.charge.mesh.position.length() > 0,
      `${preset} live hand channel`,
    );
    game.renderer.render();
    e.update(0.85, 0);
    assert(
      v.filaments.mesh.visible && !v.rift.interior.visible,
      "3D fractures precede opening",
    );
    game.renderer.render();
    e.update(0.75, 0);
    assert(
      v.rift.interior.visible &&
        v.rift.interior.geometry.getAttribute("position").count > 100,
      "Recessed layered geometry opens",
    );
    game.settings.setPreset("MAX");
    e.update(0, 0);
    assert(
      v.shards.geometry.instanceCount === 484 && e.age < 2,
      "LOW → MAX during opening preserves clock",
    );
    e.update(1.98, 0);
    game.settings.setPreset(preset);
    e.update(0, 0);
    game.renderer.render();
    assert(
      v.shards.geometry.instanceCount === q.shards + q.fragments &&
        v.particles.count === q.particles,
      `${preset} central quality geometry and particle budget`,
    );
    assert(
      v.rift.interiorMaterial.uniforms.uLayers.value === q.depths,
      "Depth quality updates actual shader",
    );
    assert(
      v.light.intensity > 0 && v.water.mesh.visible,
      "Violet scene light / gravitational water response",
    );
    profiles.push({
      stage: "stable",
      preset,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      particles: e.particleCount,
      instances: e.instanceCount,
      geometry: renderer.info.memory.geometries,
      programs: renderer.info.programs?.length,
    });
    game.settings.setPreset("MEDIUM");
    e.update(0, 0);
    assert(e.age === 3.8, "MAX → MEDIUM stable phase without restart");
    c.camera.position.x += 3;
    c.camera.updateMatrixWorld();
    e.update(0, 0);
    assert(
      v.root.quaternion.equals(orientation),
      "Camera movement does not billboard the rift",
    );
    e.update(2.9, 0);
    game.settings.setPreset("LOW");
    e.update(0, 0);
    assert(v.shards.geometry.instanceCount === 94, "MAX → LOW during collapse");
    e.update(0.85, 0);
    game.settings.setPreset(preset);
    e.update(0, 0);
    game.renderer.render();
    assert(
      v.core.mesh.visible && !v.rift.interior.visible,
      "Geometric compression into singularity",
    );
    profiles.push({
      stage: "implosion",
      preset,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      particles: e.particleCount,
      instances: e.instanceCount,
    });
    e.update(0.45, 0);
    assert(v.water.mesh.visible, "Expanding dimensional water shockwave");
    e.update(1.1, 0);
    game.settings.setPreset("MAX");
    e.update(0, 0);
    assert(
      v.rift.edges.visible && !v.core.mesh.visible && v.light.parent === null,
      "MEDIUM → MAX repair / lights expire",
    );
    assert(!e.update(2, 0), "Eleven-second lifetime completes");
    e.dispose();
    e.dispose();
    assert(
      !v.root.parent && game.settings.subscriberCount === baseSubs,
      "Expiry releases scene and subscription once",
    );
  }
  assert(
    Math.abs(
      resolveVoidTarget(
        game.player.position,
        new Vector3(0, 0, -600),
      )!.distanceTo(game.player.position) - 55,
    ) < 0.001,
    "55 metre range clamp",
  );
  // Warm both bounded bundles, standard scene-light variants and every authored stage before comparison.
  game.camera.update(0, game.player.position, true);
  game.world.update(0, game.player.position);
  for (let round = 0; round < 2; round++)
    for (let slot = 0; slot < 6; slot++) cast(slot);
  renderStages();
  empty();
  for (let count = 0; count <= 24; count++) {
    const lights: PointLight[] = [];
    for (let i = 0; i < count; i++) {
      const light = new PointLight("#9466ff", 0.1, 1);
      scene.add(light);
      lights.push(light);
    }
    game.renderer.render();
    for (const light of lights) {
      light.removeFromParent();
      light.dispose();
    }
  }
  game.settings.setPreset("MEDIUM");
  await delay(150);
  game.camera.update(0, game.player.position, true);
  game.world.update(0, game.player.position);
  game.renderer.render();
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    assert(cast(5), `WORLDREND stress ${i + 1}`);
    renderStages();
    empty();
    if (i === 9 || i === 19)
      assert(stable(baseline), `${i + 1} casts restore all warmed counters`);
  }
  for (const total of [20, 40]) {
    for (let i = 0; i < total; i++) {
      assert(cast(i % 6), `${total} alternating cast ${i + 1}`);
      game.effects.update(0.33, 0);
      game.renderer.render();
      if (i % 6 === 5) empty();
    }
    empty();
    assert(
      stable(baseline),
      `${total} alternating all-six casts restore baseline`,
    );
  }
  assert(cast(5), "Rapid initial cast");
  let rejected = 0;
  for (let i = 0; i < 100; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 100 && game.effects.activeCount === 1,
    "100 rejected cooldown requests",
  );
  empty();
  assert(stable(baseline), "Rapid stress stable");
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    cast(5);
    renderStages();
    empty();
    await delay(100);
    cast(5);
    const intervals: number[] = [];
    const stableIntervals: number[] = [],
      implosionIntervals: number[] = [];
    const profileStart = performance.now();
    let previous = performance.now(),
      peakCalls = 0,
      peakParticles = 0,
      peakTriangles = 0,
      peakInstances = 0,
      raf = 0;
    const monitor = (now: number) => {
      intervals.push(now - previous);
      const age = (now - profileStart) / 1000;
      if (age >= 3 && age <= 5.5) stableIntervals.push(now - previous);
      if (age >= 7.25 && age <= 8.2) implosionIntervals.push(now - previous);
      previous = now;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      peakParticles = Math.max(peakParticles, game.effects.particleCount);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      peakInstances = Math.max(peakInstances, game.effects.instanceCount);
      raf = requestAnimationFrame(monitor);
    };
    raf = requestAnimationFrame(monitor);
    await delay(11500);
    cancelAnimationFrame(raf);
    const sorted = intervals.slice(8).sort((a, b) => a - b),
      median = sorted[Math.floor(sorted.length * 0.5)],
      p95 = sorted[Math.floor(sorted.length * 0.95)];
    profiles.push({
      stage: "real-time full cast",
      preset,
      viewport: [innerWidth, innerHeight],
      frames: intervals.length,
      medianMs: Number(median.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      approxFps: Math.round(1000 / median),
      peakCalls,
      peakParticles,
      peakTriangles,
      peakInstances,
      stableFrameMs: stageTiming(stableIntervals),
      implosionFrameMs: stageTiming(implosionIntervals),
      memory: { ...renderer.info.memory },
      programs: renderer.info.programs?.length,
    });
    assert(game.effects.activeCount === 0, `${preset} real-time expiry`);
  }
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(stable(baseline), "All quality profiles return to baseline");
  const final = counters();
  // Dispose while still open with graphics changes and camera/player movement.
  cast(5);
  game.effects.update(3.5, 0);
  game.settings.setPreset("MAX");
  game.player.position.x += 2;
  game.camera.yaw += 0.2;
  game.camera.update(0, game.player.position, true);
  game.renderer.render();
  game.effects.dispose();
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(
    stable(baseline),
    "Active disposal after movement and quality change returns baseline",
  );
  report.textContent += `\n\nPROFILES ${JSON.stringify(profiles)}\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(final)}\n${failures.length ? `${failures.length} FAILURES` : "ALL PHASE 07 BROWSER CHECKS PASSED"}`;
} catch (error) {
  assert(
    false,
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
} finally {
  game.dispose();
  resources.dispose();
  report.textContent += `\n${renderer.info.memory.geometries === 0 && renderer.info.memory.textures === 0 ? "PASS" : "FAIL"} Full disposal: ${JSON.stringify(renderer.info.memory)} / subscriptions ${game.settings.subscriberCount}`;
}
