import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { WindResources } from "../src/abilities/wind/WindResources";
import { TempestBreakEffect } from "../src/abilities/wind/TempestBreakEffect";
import { resolveWindTarget } from "../src/abilities/wind/resolveWindTarget";
import { TEMPEST, windQuality } from "../src/abilities/wind/windConfig";

const root = document.querySelector<HTMLElement>("#app")!;
const game = new Game(root);
game.start();
const report = document.createElement("pre");
report.id = "acceptance-report";
report.style.cssText =
  "position:fixed;top:130px;left:30px;max-height:70vh;overflow:auto;background:#05111ef5;color:#bfdde4;font:11px/1.4 monospace;padding:16px;z-index:30";
root.append(report);
const results: string[] = [],
  failures: string[] = [];
const measurements: unknown[] = [];
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
  renderer = game.renderer.renderer;
const context = (distance = 18, sky = false): AbilityCastContext => {
  const ground = new Vector3(
    game.player.position.x,
    0,
    game.player.position.z - distance,
  );
  return {
    player: game.player,
    scene,
    camera: game.camera.camera,
    origin: game.player.visual.getRightHandWorldPosition(),
    direction: sky
      ? new Vector3(0, 0.4, -1)
      : game.targeting.aimDirection.clone(),
    targetPoint: ground,
    groundTarget: sky ? null : ground,
    playerForward: game.player.getForward().clone(),
    cameraForward: game.targeting.aimDirection.clone(),
    targeting: game.targeting,
    effectManager: game.effects,
    quality: game.settings,
    time: 0,
    cameraFeedback: game.camera.addFeedback,
  };
};
const counters = () => ({
  children: scene.children.length,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  programs: renderer.info.programs?.length ?? 0,
  calls: renderer.info.render.calls,
  active: game.effects.activeCount,
});
const resources = new WindResources();
try {
  await game.player.visual.ready;
  await delay(400);
  assert(
    game.player.visual.loaded && game.player.visual.animationState === "Idle",
    "Local Rocketbox human and Idle still work",
  );
  key("KeyW", true);
  await delay(450);
  assert(
    game.player.visual.animationState === "Walk",
    "WASD still drives Walk",
  );
  key("ShiftLeft", true);
  await delay(450);
  assert(
    game.player.visual.animationState === "Run" &&
      game.player.velocity.length() > 7,
    "Sprint still drives Run",
  );
  key("KeyW", false);
  key("ShiftLeft", false);
  await delay(650);
  const aim = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      buttons: 2,
      movementX: 35,
      movementY: 5,
    }),
  );
  await delay(200);
  assert(
    game.targeting.aimDirection.distanceTo(aim) > 0.02 &&
      game.targeting.hasGroundTarget,
    "Camera mouse aiming and shared targeting preserved",
  );
  key("KeyE", true);
  await delay(90);
  key("KeyE", false);
  assert(
    game.abilities.selectedAbility?.id === "tempest-break",
    "E selects Tempest Break",
  );
  assert(
    root.querySelector('.ability-slot[aria-label="E: TEMPEST BREAK"]') !== null,
    "HUD has E / Tempest Break",
  );
  const before = game.effects.activeCount;
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, button: 0 }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === before + 1,
    "Left click starts wind cast",
  );
  assert(
    game.abilities.getCooldown(1) > 1.7 && !game.abilities.cast(context()),
    "Two-second cooldown rejects recast",
  );
  await delay(250);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Existing HUD displays wind cooldown",
  );
  await delay(4200);
  assert(
    game.effects.activeCount === 0 && !scene.getObjectByName("Tempest Break"),
    "Real-time wind completes and leaves no scene root",
  );
  key("Digit1", true);
  await delay(80);
  key("Digit1", false);
  assert(
    game.abilities.selectedAbility?.id === "glacial-eruption" &&
      game.abilities.cast(context()),
    "1 / Q preserves Glacial Eruption casting",
  );
  game.effects.update(1.1, 0);
  game.renderer.render();
  assert(
    game.effects.instanceCount > 0 && game.effects.particleCount > 0,
    "Ice still emits crystals and frost",
  );
  game.effects.update(6, 0);
  key("Digit2", true);
  await delay(80);
  key("Digit2", false);
  assert(game.abilities.selectedAbility?.id === "tempest-break", "2 aliases E");
  game.abilities.select(5);
  assert(game.abilities.selectedAbility?.id === "worldrend", "X now selects WORLDREND");
  game.abilities.select(1);
  key("F3", true);
  await delay(120);
  key("F3", false);
  assert(!!root.querySelector(".debug-panel:not([hidden])"), "F3 debug works");
  key("F3", true);
  await delay(120);
  key("F3", false);
  assert(
    !!root.querySelector(".performance-panel") ||
      !!root.querySelector('[aria-label="Performance"]'),
    "Performance HUD preserved",
  );
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    game.settings.setPreset(preset);
    await delay(120);
    const c = context(),
      target = resolveWindTarget(
        c.origin,
        c.groundTarget,
        c.targetPoint,
        c.direction,
      )!;
    const effect = new TempestBreakEffect(
      c,
      resources,
      resources.pool.acquire()!,
      target,
    );
    effect.update(0.2, 0);
    assert(
      effect.position.distanceTo(
        game.player.visual.getRightHandWorldPosition(),
      ) < 0.01,
      `${preset}: charge follows real hand`,
    );
    effect.update(0.1, 0);
    const early = effect.position.clone();
    effect.update(0.1, 0);
    assert(
      Math.abs(effect.position.distanceTo(early) / 0.1 - TEMPEST.speed) < 0.001,
      `${preset}: projectile visibly travels at 36 m/s`,
    );
    assert(
      effect.visuals.wake.mesh.visible && effect.visuals.trail.mesh.visible,
      `${preset}: moving water wake and tapered trail`,
    );
    effect.update(effect.impactTime - 0.035 - 0.4, 0);
    game.renderer.render();
    assert(
      effect.visuals.projectile.core.scale.x < 0.85,
      "Pressure core compresses before detonation",
    );
    effect.update(0.195, 0);
    game.renderer.render();
    const q = windQuality(game.settings.config);
    assert(
      effect.visuals.projectile.ribbons.mesh.count === q.ribbons &&
        effect.visuals.projectile.rings.mesh.count === q.rings &&
        effect.visuals.impact.vortex.mesh.count === q.vortex &&
        effect.particleCount >= q.blast,
      `${preset}: configured ribbons/rings/vortex/particles`,
    );
    assert(
      effect.visuals.impact.root.visible &&
        effect.visuals.impact.ground.visible &&
        effect.visuals.impact.mist.visible,
      "Impact shockwave, vortex, water rings and mist render",
    );
    measurements.push({
      preset,
      ...counters(),
      particles: effect.particleCount,
      instances: effect.instanceCount,
    });
    game.settings.setPreset(preset === "LOW" ? "MAX" : "LOW");
    assert(
      effect.visuals.projectile.ribbons.mesh.count ===
        (preset === "LOW" ? 6 : 2),
      "Live preset change affects existing wind effect",
    );
    effect.update(3, 0);
    assert(
      effect.visuals.light.intensity === 0 || effect.update(0, 0) === false,
      "Temporary light expires",
    );
    effect.dispose();
    assert(
      effect.visuals.root.parent === null &&
        effect.visuals.light.intensity === 0,
      "Cleanup removes all child VFX and resets light",
    );
  }
  for (const [distance, sky] of [
    [5, false],
    [18, false],
    [100, false],
    [40, true],
  ] as const) {
    const c = context(distance, sky),
      target = resolveWindTarget(
        c.origin,
        c.groundTarget,
        c.targetPoint,
        c.direction,
      )!;
    const effect = new TempestBreakEffect(
      c,
      resources,
      resources.pool.acquire()!,
      target,
    );
    effect.update(0.3, 0);
    assert(
      effect.target.distanceTo(effect.origin) <= 40.000001 &&
        effect.lifetime >= 3 &&
        effect.lifetime < 4,
      `${distance}m / sky ${sky}: finite capped target and 3–4 second lifetime`,
    );
    effect.dispose();
  }
  resources.dispose();
  game.settings.setPreset("MEDIUM");
  await delay(150);
  // Warm two overlapping bundles, all stages and shared-light shader variants before comparing counters.
  for (let j = 0; j < 2; j++) {
    game.abilities.update(3);
    game.abilities.cast(context());
  }
  for (let i = 0; i < 18; i++) {
    game.effects.update(0.2, 0);
    game.renderer.render();
  }
  game.effects.update(6, 0);
  await delay(100);
  game.renderer.render();
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    game.abilities.update(3);
    assert(game.abilities.cast(context()), `Wind stress cast ${i + 1}`);
    for (let j = 0; j < 8; j++) {
      game.effects.update(0.15, 0);
      game.renderer.render();
    }
    game.effects.update(6, 0);
    game.renderer.render();
    if (i === 9 || i === 19) {
      const after = counters();
      assert(
        after.children === baseline.children &&
          after.geometries === baseline.geometries &&
          after.textures === baseline.textures &&
          after.programs === baseline.programs &&
          after.calls === baseline.calls &&
          after.active === 0,
        `${i + 1} wind casts return scene / GPU / programs / calls to warmed baseline`,
      );
    }
  }
  for (let i = 0; i < 20; i++) {
    game.abilities.select(i % 2);
    game.abilities.update(3);
    assert(
      game.abilities.cast(context()),
      `Alternating ice/wind cast ${i + 1}`,
    );
    game.effects.update(0.7, 0);
    game.renderer.render();
    if (i % 2 === 1) {
      game.effects.update(6, 0);
      game.renderer.render();
    }
  }
  const alternating = counters();
  assert(
    alternating.children === baseline.children &&
      alternating.geometries === baseline.geometries &&
      alternating.textures === baseline.textures &&
      alternating.programs === baseline.programs &&
      alternating.active === 0,
    "20 alternating casts return to warmed baseline",
  );
  game.abilities.select(1);
  game.abilities.update(3);
  assert(game.abilities.cast(context()), "Rapid cast initial accepted");
  let rejected = 0;
  for (let i = 0; i < 40; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 40 && game.effects.activeCount === 1,
    "40 rapid requests rejected during cooldown",
  );
  game.effects.update(6, 0);
  game.renderer.render();
  const final = counters();
  assert(
    final.children === baseline.children &&
      final.geometries === baseline.geometries &&
      final.textures === baseline.textures &&
      final.programs === baseline.programs &&
      final.calls === baseline.calls,
    "Rapid stress returns to baseline",
  );
  report.textContent += `\n\nQUALITY ${JSON.stringify(measurements)}\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(final)}\n${failures.length ? `${failures.length} FAILURES` : "ALL PHASE 03 BROWSER CHECKS PASSED"}`;
} catch (error) {
  assert(
    false,
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
} finally {
  game.dispose();
  resources.dispose();
  const released =
    renderer.info.memory.geometries === 0 &&
    renderer.info.memory.textures === 0;
  report.textContent += `\n${released ? "PASS" : "FAIL"} Full Game disposal releases pooled geometry and textures: ${JSON.stringify(renderer.info.memory)}`;
}
