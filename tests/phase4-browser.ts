import "../src/styles/game.css";
import { PointLight, Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { VerdictResources } from "../src/abilities/lightning/VerdictResources";
import { HeavensVerdictEffect } from "../src/abilities/lightning/HeavensVerdictEffect";
import { resolveVerdictTarget } from "../src/abilities/lightning/resolveVerdictTarget";
import {
  lightningQuality,
  VERDICT,
} from "../src/abilities/lightning/verdictConfig";
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
  resources = new VerdictResources();
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
  game.abilities.update(5);
  return game.abilities.cast(context());
};
const renderStages = (): void => {
  for (const step of [
    0.22, 0.36, 0.2, 0.18, 0.074, 0.08, 0.16, 0.17, 0.56, 0.65, 1.5,
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
    "Local human model and Idle render",
  );
  key("KeyW", true);
  await delay(420);
  assert(
    game.player.visual.animationState === "Walk",
    "W movement and Walk animation",
  );
  key("ShiftLeft", true);
  await delay(420);
  assert(
    game.player.visual.animationState === "Run",
    "Shift sprint and Run animation",
  );
  key("KeyW", false);
  key("ShiftLeft", false);
  await delay(600);
  const aim = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      buttons: 2,
      movementX: 40,
      movementY: 8,
    }),
  );
  await delay(180);
  assert(
    game.targeting.hasGroundTarget &&
      game.targeting.aimDirection.distanceTo(aim) > 0.02,
    "Existing mouse camera and ground ray remain operational",
  );
  key("KeyR", true);
  await delay(80);
  key("KeyR", false);
  assert(
    game.abilities.selectedAbility?.id === "heavens-verdict",
    "R selects Heaven’s Verdict",
  );
  assert(
    root.querySelector('[aria-label="R: HEAVEN\'S VERDICT"]') !== null,
    "HUD shows lightning name, icon and selected slot",
  );
  const active = game.effects.activeCount;
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0 }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === active + 1,
    "Normal left mouse input casts lightning",
  );
  assert(
    game.abilities.getCooldown(2) > 3.8 && !game.abilities.cast(context()),
    "4 second cooldown rejects a second cast",
  );
  await delay(250);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Existing cooldown UI displays progress",
  );
  await delay(6700);
  assert(
    game.effects.activeCount === 0 &&
      !scene.getObjectByName("Heaven's Verdict"),
    "Real-time 6.2 second lifecycle removes lightning/storm/particles",
  );
  key("Digit3", true);
  await delay(80);
  key("Digit3", false);
  assert(game.abilities.selectedIndex === 2, "3 aliases R");
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.effects.activeCount === 0,
    "Invalid/sky target rejects without origin fallback",
  );
  for (const [slot, name] of [
    [0, "glacial-eruption"],
    [1, "tempest-break"],
  ] as const) {
    const code = slot === 0 ? "KeyQ" : "KeyE";
    key(code, true);
    await delay(80);
    key(code, false);
    assert(
      game.abilities.selectedAbility?.id === name && cast(slot),
      `${code}: existing ability selects and casts`,
    );
    game.effects.update(slot === 0 ? 1.1 : 0.85, 0);
    game.renderer.render();
    assert(
      game.effects.particleCount > 0 && game.effects.instanceCount > 0,
      `${name}: existing VFX still render`,
    );
    empty();
  }
  game.abilities.select(5);
  assert(game.abilities.selectedAbility?.id === "worldrend", "X now selects WORLDREND");
  assert(
    game.abilities.slots.filter((s) => s.abilityId !== null).length === 8,
    "Exactly seven real equipped abilities",
  );
  const baseSubscriptions = game.settings.subscriberCount;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    game.settings.setPreset(preset);
    await delay(80);
    const c = context(),
      target = resolveVerdictTarget(c.player.position, c.groundTarget)!;
    const impulses: { strength: number; duration: number }[] = [];
    const effect = new HeavensVerdictEffect(
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
      effect.visuals.charge.root.position
        .clone()
        .add(target)
        .distanceTo(game.player.visual.getRightHandWorldPosition()) < 0.001,
      `${preset}: charge follows animated hand`,
    );
    effect.update(0.34, 0);
    assert(
      effect.visuals.water.travel.mesh.visible &&
        effect.visuals.water.veins.mesh.visible,
      `${preset}: player-to-target pulse and unstable water ionization`,
    );
    effect.update(0.2, 0);
    assert(
      effect.visuals.storm.root.visible,
      `${preset}: localized turbulent storm buildup`,
    );
    effect.update(0.2, 0);
    assert(
      effect.visuals.discharge.precursors.mesh.visible,
      "Precursor channels search before connection",
    );
    effect.update(0.074, 0);
    game.renderer.render();
    const q = lightningQuality(game.settings.config),
      v = effect.visuals;
    assert(
      v.discharge.main.segmentCount ===
        q.subdivisions + q.major * 16 + q.minor * 9 + q.micro * 5 &&
        v.discharge.main.mesh.visible,
      `${preset}: thick bounded branching main bolt`,
    );
    assert(
      v.storm.clouds.count === q.clouds &&
        v.mist.mesh.count === q.mist &&
        effect.particleCount === q.particles,
      `${preset}: cloud / mist / particle counts apply`,
    );
    assert(
      v.impactLight.intensity > 100 &&
        v.shockwave.mesh.visible &&
        v.mist.mesh.visible,
      "Impact flashes 3D light, reflective water and ionized mist",
    );
    assert(
      impulses.length === 1 &&
        impulses[0].duration === 0.2 &&
        impulses[0].strength <= 0.0038,
      "Comfortable bounded camera impulse fires once",
    );
    profiles.push({
      stage: "static main impact",
      preset,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      particles: effect.particleCount,
      instances: effect.instanceCount,
      programs: renderer.info.programs?.length,
    });
    effect.update(0.08, 0);
    assert(
      v.discharge.secondary.mesh.visible,
      "Secondary strikes occur after main connection",
    );
    effect.update(0.94, 0);
    assert(
      v.impactLight.parent === null && v.skyLight.parent === null,
      "Both transient lights leave scene before lingering phase",
    );
    game.settings.setPreset(preset === "LOW" ? "MAX" : "LOW");
    effect.update(0, 0);
    assert(
      v.storm.clouds.count === (preset === "LOW" ? 10 : 3),
      "Live quality changes alter existing cloud and branch detail",
    );
    effect.update(4.3, 0);
    assert(!effect.update(0, 0), "Fixed 6.2 second effect lifetime ends");
    effect.dispose();
    effect.dispose();
    assert(
      v.root.parent === null &&
        game.settings.subscriberCount === baseSubscriptions,
      "Dispose removes full root and unsubscribes exactly once",
    );
  }
  const c = context(100),
    target = resolveVerdictTarget(c.player.position, c.groundTarget)!;
  assert(
    target.distanceTo(c.player.position) <= 45.000001,
    "Far targets clamp at 45 metres",
  );
  game.settings.setPreset("LOW");
  const switching = new HeavensVerdictEffect(
    context(),
    resources,
    resources.pool.acquire()!,
    context().groundTarget!,
    9771,
  );
  switching.update(0.3, 0);
  game.settings.setPreset("MAX");
  switching.update(0.46, 0);
  game.renderer.render();
  assert(
    switching.visuals.storm.clouds.count === 10 &&
      switching.visuals.discharge.main.segmentCount > 700,
    "LOW → MAX during charging",
  );
  switching.update(1.4, 0);
  game.settings.setPreset("LOW");
  switching.update(0, 0);
  game.renderer.render();
  assert(
    switching.visuals.mist.mesh.count === 6 &&
      switching.visuals.discharge.main.segmentCount < 300,
    "MAX → LOW during lingering field",
  );
  switching.dispose();
  resources.dispose();
  // Warm bounded caches and standard scene-light variants, avoiding first-use compilation in the profile.
  game.settings.setPreset("MEDIUM");
  for (const slot of [0, 1, 2]) {
    cast(slot);
    cast(slot);
  }
  renderStages();
  empty();
  for (let count = 0; count <= 4; count++) {
    const lights: PointLight[] = [];
    for (let i = 0; i < count; i++) {
      const light = new PointLight("#badfff", 0, 20, 2);
      scene.add(light);
      lights.push(light);
    }
    game.renderer.render();
    for (const light of lights) {
      light.removeFromParent();
      light.dispose();
    }
  }
  game.renderer.render();
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    assert(cast(2), `Verdict stress cast ${i + 1}`);
    renderStages();
    empty();
    if (i === 9 || i === 19)
      assert(
        stable(baseline),
        `${i + 1} verdict casts restore scene/GPU/program/light/subscription baseline`,
      );
  }
  for (const total of [20, 30]) {
    for (let i = 0; i < total; i++) {
      assert(cast(i % 3), `${total}-cast alternating sequence ${i + 1}`);
      game.effects.update(0.33, 0);
      game.renderer.render();
      if (i % 3 === 2) empty();
    }
    empty();
    assert(
      stable(baseline),
      `${total} alternating Ice → Wind → Lightning casts restore full baseline`,
    );
  }
  assert(cast(2), "Rapid initial cast accepted");
  let rejected = 0;
  for (let i = 0; i < 60; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 60 && game.effects.activeCount === 1,
    "60 rapid requests rejected during cooldown",
  );
  empty();
  assert(
    stable(baseline),
    "Rapid rejected cast stress returns all counters to baseline",
  );
  // Real-time frame observation on complete casts, separate from the accelerated cleanup stress.
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    await delay(150);
    cast(2);
    renderStages();
    empty();
    await delay(100);
    game.abilities.update(5);
    game.abilities.cast(context());
    const intervals: number[] = [];
    let previous = performance.now(),
      peakCalls = 0,
      peakParticles = 0,
      peakTriangles = 0,
      raf = 0;
    const monitor = (now: number): void => {
      intervals.push(now - previous);
      previous = now;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      peakParticles = Math.max(peakParticles, game.effects.particleCount);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      raf = requestAnimationFrame(monitor);
    };
    raf = requestAnimationFrame(monitor);
    await delay(6800);
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
    });
    assert(
      game.effects.activeCount === 0,
      `${preset}: real-time cast expires after profiling`,
    );
  }
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  const final = counters();
  assert(
    stable(baseline),
    "All quality profiles finish at the original warmed baseline",
  );
  report.textContent += `\n\nPROFILES ${JSON.stringify(profiles)}\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(final)}\n${failures.length ? `${failures.length} FAILURES` : "ALL PHASE 04 BROWSER CHECKS PASSED"}`;
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
