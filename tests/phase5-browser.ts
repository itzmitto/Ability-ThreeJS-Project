import "../src/styles/game.css";
import { PointLight, Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { MegiddoResources } from "../src/abilities/light/MegiddoResources";
import { MegiddoEffect } from "../src/abilities/light/MegiddoEffect";
import { resolveMegiddoTarget } from "../src/abilities/light/resolveMegiddoTarget";
import { radiantQuality, MEGIDDO } from "../src/abilities/light/MegiddoConfig";
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
  resources = new MegiddoResources();
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
  game.effects.update(7, 0);
  game.renderer.render();
};
const cast = (slot: number): boolean => {
  game.abilities.select(slot);
  game.abilities.update(9);
  return game.abilities.cast(context());
};
const renderStages = (): void => {
  for (const step of [
    0.22, 0.36, 0.3, 0.4, 0.074, 0.18, 0.16, 0.17, 0.56, 0.65, 1.5,
  ]) {
    game.effects.update(step, 0);
    game.renderer.render();
  }
};
const stable = (baseline: ReturnType<typeof counters>): boolean => {
  const now = counters();
  return (Object.keys(baseline) as (keyof typeof baseline)[]).every(
    (k) => now[k] === baseline[k],
  );
};
try {
  await game.player.visual.ready;
  await delay(350);
  assert(
    game.player.visual.loaded && game.player.visual.animationState === "Idle",
    "Local Rocketbox human and Idle",
  );
  key("KeyW", true);
  await delay(420);
  assert(game.player.visual.animationState === "Walk", "WASD and Walk");
  key("ShiftLeft", true);
  await delay(420);
  assert(game.player.visual.animationState === "Run", "Sprint and Run");
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
  await delay(150);
  assert(
    game.targeting.hasGroundTarget &&
      game.targeting.aimDirection.distanceTo(previousAim) > 0.02,
    "Camera-relative mouse aiming and existing ground target",
  );
  key("KeyF", true);
  await delay(80);
  key("KeyF", false);
  assert(game.abilities.selectedAbility?.id === "megiddo", "F selects MEGIDDO");
  assert(
    root.querySelector('[aria-label="F: MEGIDDO"]') !== null,
    "Existing HUD shows F / MEGIDDO / celestial icon",
  );
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0 }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === 1 && game.abilities.getCooldown(3) > 7.8,
    "Normal left click casts and starts eight-second cooldown",
  );
  assert(!game.abilities.cast(context()), "Cooldown rejects repeated cast");
  await delay(250);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Existing cooldown mask and remaining time",
  );
  await delay(6900);
  assert(
    game.effects.activeCount === 0 && !scene.getObjectByName("MEGIDDO"),
    "Real-time 6.8 second effect expires",
  );
  key("Digit4", true);
  await delay(80);
  key("Digit4", false);
  assert(game.abilities.selectedIndex === 3, "4 aliases F");
  game.abilities.update(9);
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.abilities.getCooldown(3) === 0,
    "Sky failure rejects without cooldown or origin strike",
  );
  for (const [slot, code, id] of [
    [0, "KeyQ", "glacial-eruption"],
    [1, "KeyE", "tempest-break"],
    [2, "KeyR", "heavens-verdict"],
  ] as const) {
    key(code, true);
    await delay(80);
    key(code, false);
    assert(
      game.abilities.selectedAbility?.id === id && cast(slot),
      `${code} existing spell selects and casts`,
    );
    game.effects.update(1.36, 0);
    game.renderer.render();
    assert(
      game.effects.particleCount > 0 && game.effects.instanceCount > 0,
      `${id} VFX render`,
    );
    empty();
  }
  game.abilities.select(5);
  assert(game.abilities.selectedAbility?.id === "worldrend", "X now selects WORLDREND");
  assert(
    game.abilities.slots.filter((s) => s.abilityId !== null).length === 8,
    "Exactly seven equipped abilities",
  );
  key("F3", true);
  await delay(120);
  key("F3", false);
  assert(!!root.querySelector(".debug-panel:not([hidden])"), "F3 debug works");
  key("F3", true);
  await delay(80);
  key("F3", false);
  const baseSubscriptions = game.settings.subscriberCount;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    game.settings.setPreset(preset);
    await delay(80);
    const c = context(),
      target = resolveMegiddoTarget(c.player.position, c.groundTarget)!;
    const impulses: { strength: number; duration: number }[] = [];
    const effect = new MegiddoEffect(
      {
        ...c,
        cameraFeedback: (strength, duration) =>
          impulses.push({ strength, duration }),
      },
      resources,
      resources.pool.acquire()!,
      target,
      48137,
    );
    effect.update(0.22, 0);
    assert(
      effect.visuals.hand.root.position
        .clone()
        .add(target)
        .distanceTo(game.player.visual.getRightHandWorldPosition()) < 0.001,
      `${preset} hand channel follows animated right hand`,
    );
    effect.update(0.34, 0);
    assert(
      effect.visuals.mark.mesh.visible,
      `${preset} mathematical target mark reveals`,
    );
    effect.update(0.2, 0);
    assert(
      effect.visuals.array.prisms.visible && effect.visuals.echoes.mesh.visible,
      `${preset} high celestial array and lower optical echoes`,
    );
    effect.update(0.56, 0);
    game.renderer.render();
    const q = radiantQuality(game.settings.config),
      v = effect.visuals;
    assert(
      v.sequence.count === q.strikes &&
        v.beams.geometry.instanceCount === q.strikes,
      `${preset} authored score / batched beam count`,
    );
    assert(
      effect.particleCount === q.particles && v.particles.mist.count === q.mist,
      `${preset} dust / burst / mist budgets`,
    );
    assert(
      v.ripples.mesh.visible && v.impactLight.intensity > 100,
      "Per-impact water radiance, ripple and real 3D lighting",
    );
    assert(
      impulses.length === 1 &&
        impulses[0].duration === 0.16 &&
        impulses[0].strength <= 0.0028,
      "Single restrained camera impulse",
    );
    profiles.push({
      stage: "primary strike",
      preset,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      particles: effect.particleCount,
      instances: effect.instanceCount,
    });
    effect.update(1.8, 0);
    assert(
      v.impactLight.parent === null && v.fillLight.parent === null,
      "Both transient lights detach before residue",
    );
    game.settings.setPreset(preset === "LOW" ? "MAX" : "LOW");
    effect.update(0, 0);
    assert(
      v.sequence.count === (preset === "LOW" ? 12 : 5),
      "Live presets alter existing beams, lenses and particles",
    );
    assert(!effect.update(4, 0), "Fixed 6.8 second lifetime");
    effect.dispose();
    effect.dispose();
    assert(
      v.root.parent === null &&
        game.settings.subscriberCount === baseSubscriptions,
      "Idempotent disposal removes root and subscription",
    );
  }
  const far = context(100);
  assert(
    resolveMegiddoTarget(far.player.position, far.groundTarget)!.distanceTo(
      far.player.position,
    ) <= 50.000001,
    "50 metre clamp",
  );
  game.settings.setPreset("LOW");
  const switching = new MegiddoEffect(
    context(),
    resources,
    resources.pool.acquire()!,
    context().groundTarget!,
    9771,
  );
  switching.update(0.3, 0);
  game.settings.setPreset("MAX");
  switching.update(0.5, 0);
  game.renderer.render();
  assert(switching.visuals.sequence.count === 12, "LOW → MAX during buildup");
  switching.update(2.4, 0);
  game.settings.setPreset("LOW");
  switching.update(0, 0);
  game.renderer.render();
  assert(
    switching.visuals.sequence.count === 5 &&
      switching.visuals.particles.mist.count === 8,
    "MAX → LOW during aftermath",
  );
  switching.dispose();
  resources.dispose();
  // Warm both bounded bundles and all standard scene-light variants that concurrent spells can use.
  game.settings.setPreset("MAX");
  for (const slot of [0, 1, 2, 3]) {
    cast(slot);
    cast(slot);
  }
  renderStages();
  empty();
  for (let count = 0; count <= 7; count++) {
    const lights: PointLight[] = [];
    for (let i = 0; i < count; i++) {
      const light = new PointLight("#ffffff", 0, 20, 2);
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
  game.renderer.render();
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    assert(cast(3), `Megiddo stress cast ${i + 1}`);
    renderStages();
    empty();
    if (i === 9 || i === 19)
      assert(
        stable(baseline),
        `${i + 1} casts restore scene / GPU / programs / lights / subscriptions`,
      );
  }
  for (const total of [20, 40]) {
    for (let i = 0; i < total; i++) {
      assert(cast(i % 4), `${total}-cast alternating sequence ${i + 1}`);
      game.effects.update(0.33, 0);
      game.renderer.render();
      if (i % 4 === 3) empty();
    }
    empty();
    assert(
      stable(baseline),
      `${total} Ice → Wind → Lightning → Megiddo casts restore baseline`,
    );
  }
  assert(cast(3), "Rapid initial cast");
  let rejected = 0;
  for (let i = 0; i < 80; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 80 && game.effects.activeCount === 1,
    "80 rapid attempts rejected during cooldown",
  );
  empty();
  assert(stable(baseline), "Rapid rejection stress restores all counters");
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    await delay(100);
    cast(3);
    renderStages();
    empty();
    await delay(100);
    cast(3);
    const intervals: number[] = [];
    let previous = performance.now(),
      peakCalls = 0,
      peakParticles = 0,
      peakTriangles = 0,
      peakInstances = 0,
      peakLights = 0,
      raf = 0;
    const monitor = (now: number): void => {
      intervals.push(now - previous);
      previous = now;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      peakParticles = Math.max(peakParticles, game.effects.particleCount);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      peakInstances = Math.max(peakInstances, game.effects.instanceCount);
      peakLights = Math.max(peakLights, counters().lights);
      raf = requestAnimationFrame(monitor);
    };
    raf = requestAnimationFrame(monitor);
    await delay(7300);
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
      peakLights,
    });
    assert(
      game.effects.activeCount === 0,
      `${preset} real-time profile expires`,
    );
  }
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  const final = counters();
  assert(stable(baseline), "All profiles return to warmed baseline");
  report.textContent += `\n\nPROFILES ${JSON.stringify(profiles)}\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(final)}\n${failures.length ? `${failures.length} FAILURES` : "ALL PHASE 05 BROWSER CHECKS PASSED"}`;
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
