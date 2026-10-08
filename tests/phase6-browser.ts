import "../src/styles/game.css";
import { PointLight, Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { FireResources } from "../src/abilities/fire/FireResources";
import { AbyssalFlameEffect } from "../src/abilities/fire/AbyssalFlameEffect";
import { resolveFireTarget } from "../src/abilities/fire/resolveFireTarget";
import { fireQuality, ABYSSAL } from "../src/abilities/fire/AbyssalFlameConfig";
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
  resources = new FireResources();
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
  game.effects.update(ABYSSAL.lifetime + 0.4, 0);
  game.renderer.render();
};
const cast = (slot: number): boolean => {
  game.abilities.select(slot);
  game.abilities.update(9);
  return game.abilities.cast(context());
};
const renderStages = (): void => {
  for (const step of [
    0.22, 0.36, 0.3, 0.4, 0.074, 0.18, 0.16, 0.17, 0.56, 0.65, 1.5, 2.0, 1.4,
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
  key("KeyV", true);
  await delay(80);
  key("KeyV", false);
  assert(
    game.abilities.selectedAbility?.id === "abyssal-flame",
    "V selects ABYSSAL FLAME",
  );
  assert(
    root.querySelector('[aria-label="V: ABYSSAL FLAME"]') !== null,
    "Existing HUD shows V / ABYSSAL FLAME / ember crest",
  );
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0 }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === 1 && game.abilities.getCooldown(4) > 5.8,
    "Normal left click casts and starts six-second cooldown",
  );
  assert(!game.abilities.cast(context()), "Cooldown rejects repeated cast");
  await delay(250);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Existing cooldown mask and remaining time",
  );
  await delay(8700);
  assert(
    game.effects.activeCount === 0 && !scene.getObjectByName("ABYSSAL FLAME"),
    "Real-time 8.6 second effect expires",
  );
  key("Digit5", true);
  await delay(80);
  key("Digit5", false);
  assert(game.abilities.selectedIndex === 4, "5 aliases V");
  game.abilities.update(9);
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.abilities.getCooldown(4) === 0,
    "Sky failure rejects without cooldown or origin strike",
  );
  for (const [slot, code, id] of [
    [0, "KeyQ", "glacial-eruption"],
    [1, "KeyE", "tempest-break"],
    [2, "KeyR", "heavens-verdict"],
    [3, "KeyF", "megiddo"],
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
      target = resolveFireTarget(c.player.position, c.groundTarget)!;
    const impulses: { strength: number; duration: number }[] = [];
    const e = new AbyssalFlameEffect(
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
    const v = e.visuals;
    e.update(0.22, 0);
    assert(
      v.charge.root.position
        .clone()
        .add(target)
        .distanceTo(game.player.visual.getRightHandWorldPosition()) < 0.001,
      `${preset} charge follows right hand`,
    );
    assert(v.trail.mesh.visible, `${preset} ground ignition wave travels`);
    e.update(0.3, 0);
    assert(
      v.residue.mesh.visible && v.smoke.mesh.visible,
      "Kindling and leaking dark smoke precede eruption",
    );
    e.update(0.3, 0);
    game.renderer.render();
    const q = fireQuality(game.settings.config);
    assert(
      v.flames.body.visible &&
        v.flames.geometry.instanceCount ===
          (1 + q.secondary + q.pockets) * q.layers,
      `${preset} batched main / secondary / pocket flames`,
    );
    assert(
      v.impactLight.intensity > 20 && v.residue.mesh.visible,
      "Real red 3D light and reflected fire heat",
    );
    assert(
      impulses.length === 1 &&
        impulses[0].duration === 0.15 &&
        impulses[0].strength <= 0.0025,
      "Restrained camera feedback",
    );
    profiles.push({
      stage: "eruption",
      preset,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      particles: e.particleCount,
      instances: e.instanceCount,
    });
    e.update(2.2, 0);
    assert(
      v.flames.body.visible && v.smoke.mesh.visible && v.embers.count > 0,
      "Inferno persists with smoke and rising ember categories",
    );
    game.settings.setPreset("MAX");
    e.update(0, 0);
    assert(
      v.flames.geometry.instanceCount === 192 &&
        v.smoke.geometry.instanceCount === 48,
      "LOW → MAX during active lingering fire",
    );
    e.update(3.2, 0);
    game.settings.setPreset("LOW");
    e.update(0, 0);
    assert(
      v.flames.geometry.instanceCount === 28 &&
        v.smoke.geometry.instanceCount === 12 &&
        !v.heat.mesh.visible,
      "MAX → LOW during late extinguish",
    );
    e.update(1.7, 0);
    assert(
      v.impactLight.parent === null && v.fillLight.parent === null,
      "Lights leave before final smoke / afterglow",
    );
    assert(
      !v.flames.body.visible && v.smoke.mesh.visible && v.residue.mesh.visible,
      "Smoke / residual embers outlast flames",
    );
    assert(!e.update(1, 0), "8.6 second lifetime completes");
    e.dispose();
    e.dispose();
    assert(
      v.root.parent === null &&
        game.settings.subscriberCount === baseSubscriptions,
      "Dispose removes root and subscription exactly once",
    );
  }
  const far = context(100);
  assert(
    resolveFireTarget(far.player.position, far.groundTarget)!.distanceTo(
      far.player.position,
    ) <= 42.000001,
    "42 metre clamp",
  );
  resources.dispose();
  // Warm both bounded bundles and all standard scene-light variants that concurrent spells can use.
  game.settings.setPreset("MAX");
  for (const slot of [0, 1, 2, 3, 4]) {
    cast(slot);
    cast(slot);
  }
  renderStages();
  empty();
  for (let count = 0; count <= 10; count++) {
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
    assert(cast(4), `Abyssal stress cast ${i + 1}`);
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
      assert(cast(i % 5), `${total}-cast alternating sequence ${i + 1}`);
      game.effects.update(0.33, 0);
      game.renderer.render();
      if (i % 5 === 4) empty();
    }
    empty();
    assert(
      stable(baseline),
      `${total} Ice → Wind → Lightning → Megiddo → Abyssal casts restore baseline`,
    );
  }
  assert(cast(4), "Rapid initial cast");
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
    cast(4);
    renderStages();
    empty();
    await delay(100);
    cast(4);
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
    await delay(9000);
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
  report.textContent += `\n\nPROFILES ${JSON.stringify(profiles)}\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(final)}\n${failures.length ? `${failures.length} FAILURES` : "ALL PHASE 06 BROWSER CHECKS PASSED"}`;
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
