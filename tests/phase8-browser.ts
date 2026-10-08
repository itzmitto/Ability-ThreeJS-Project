import "../src/styles/game.css";
import { PointLight, Vector3, Mesh } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { StormResourcePool } from "../src/abilities/stormDragon/StormResourcePool";
import { TempestCataclysmEffect } from "../src/abilities/stormDragon/TempestCataclysmEffect";
import { resolveStormTarget } from "../src/abilities/stormDragon/resolveStormTarget";
import type { QualityPreset } from "../src/quality/QualityPreset";
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.start();
const report = document.createElement("pre");
report.id = "acceptance-report";
report.style.cssText =
  "position:fixed;left:24px;top:130px;max-height:72vh;max-width:94vw;overflow:auto;background:#071120f5;color:#bcd3f6;font:11px/1.4 monospace;padding:14px;z-index:30";
root.append(report);
const results: string[] = [],
  failures: string[] = [],
  profiles: unknown[] = [];
const assert = (ok: boolean, name: string): void => {
  (ok ? results : failures).push(name);
  report.textContent = [
    ...results.map((s) => "PASS " + s),
    ...failures.map((s) => "FAIL " + s),
  ].join("\n");
};
window.addEventListener("error", (e) => assert(false, e.message));
window.addEventListener("unhandledrejection", (e) =>
  assert(false, String(e.reason)),
);
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const key = (code: string, down: boolean) =>
  window.dispatchEvent(
    new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
  );
const scene = game.sceneManager.scene,
  renderer = game.renderer.renderer,
  resources = new StormResourcePool();
const context = (distance = 45): AbilityCastContext => {
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
  let lights = 0,
    objects = 0;
  scene.traverse((o) => {
    objects++;
    if ((o as PointLight).isPointLight) lights++;
  });
  return {
    children: scene.children.length,
    objects,
    lights,
    subscriptions: game.settings.subscriberCount,
    active: game.effects.activeCount,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
    calls: renderer.info.render.calls,
  };
};
const empty = () => {
  game.effects.update(18.5, 0);
  game.renderer.render();
};
const cast = (slot: number) => {
  game.abilities.select(slot);
  game.abilities.update(25.1);
  return game.abilities.cast(context());
};
const renderStages = () => {
  for (let i = 0; i < 37; i++) {
    game.effects.update(0.5, 0);
    game.renderer.render();
  }
};
const stable = (base: ReturnType<typeof counters>) => {
  const now = counters();
  const ok = (
    [
      "children",
      "objects",
      "lights",
      "subscriptions",
      "active",
      "geometries",
      "textures",
      "programs",
    ] as const
  ).every((k) => now[k] === base[k]);
  if (!ok) profiles.push({ stage: "counter mismatch", base, now });
  return ok;
};
const stats = (samples: number[]) => {
  const a = samples.slice().sort((a, b) => a - b);
  return {
    frames: a.length,
    medianMs: Number((a[Math.floor(a.length * 0.5)] ?? 0).toFixed(2)),
    p95Ms: Number((a[Math.floor(a.length * 0.95)] ?? 0).toFixed(2)),
  };
};
try {
  await game.player.visual.ready;
  await delay(300);
  assert(
    game.player.visual.loaded && game.player.visual.animationState === "Idle",
    "Local Rocketbox / Idle",
  );
  key("KeyW", true);
  await delay(420);
  assert(game.player.visual.animationState === "Walk", "WASD / Walk");
  key("ShiftLeft", true);
  await delay(420);
  assert(game.player.visual.animationState === "Run", "Shift / Run");
  key("KeyW", false);
  key("ShiftLeft", false);
  await delay(650);
  const aim = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      buttons: 2,
      movementX: 45,
      movementY: 8,
    }),
  );
  await delay(100);
  assert(
    game.targeting.hasGroundTarget &&
      game.targeting.aimDirection.distanceTo(aim) > 0.02,
    "Existing mouse aim and ground targeting",
  );
  key("KeyC", true);
  await delay(90);
  key("KeyC", false);
  assert(
    game.abilities.selectedIndex === 6 &&
      game.abilities.selectedAbility?.id === "tempest-cataclysm",
    "C selects seventh spell",
  );
  assert(
    !!root.querySelector('[aria-label="C: TEMPEST CATACLYSM"] svg'),
    "Original dragon icon and seventh HUD card",
  );
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { button: 0, bubbles: true }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === 1 && game.abilities.getCooldown(6) > 24.8,
    "Left click and 25-second shared cooldown",
  );
  await delay(180);
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "HUD cooldown mask",
  );
  empty();
  key("Digit7", true);
  await delay(90);
  key("Digit7", false);
  assert(game.abilities.selectedIndex === 6, "7 aliases C");
  game.abilities.update(26);
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.abilities.getCooldown(6) === 0,
    "Invalid sky cast rejects without cooldown",
  );
  for (const [i, code, id] of [
    [0, "KeyQ", "glacial-eruption"],
    [1, "KeyE", "tempest-break"],
    [2, "KeyR", "heavens-verdict"],
    [3, "KeyF", "megiddo"],
    [4, "KeyV", "abyssal-flame"],
    [5, "KeyX", "worldrend"],
  ] as const) {
    key(code, true);
    await delay(80);
    key(code, false);
    assert(
      game.abilities.selectedAbility?.id === id && cast(i),
      id + " still selects and casts",
    );
    game.effects.update(1.4, 0);
    game.renderer.render();
    assert(
      game.effects.particleCount > 0 && game.effects.instanceCount > 0,
      id + " layers render",
    );
    empty();
  }
  assert(
    game.abilities.slots.filter((s) => s.abilityId).length === 8,
    "Exactly eight real abilities",
  );
  key("F3", true);
  await delay(100);
  key("F3", false);
  assert(!!root.querySelector(".debug-panel:not([hidden])"), "F3 debug");
  key("F3", true);
  await delay(90);
  key("F3", false);
  assert(
    !!root.querySelector(".performance-panel"),
    "Performance HUD retained",
  );
  const subs = game.settings.subscriberCount;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    const c = context(),
      v = resources.pool.acquire()!,
      e = new TempestCataclysmEffect(c, resources, v, c.groundTarget!);
    let finite = true;
    for (const age of [0.5, 2, 3.5, 4.5, 6, 8, 9.5, 10.5, 12, 14, 16, 17.8]) {
      e.update(age - e.age, 0);
      game.camera.yaw += 0.012;
      game.camera.update(0, game.player.position, true);
      game.renderer.render();
      v.root.traverse((o) => {
        if (
          ![...o.position.toArray(), ...o.quaternion.toArray()].every(
            Number.isFinite,
          )
        )
          finite = false;
        if (o instanceof Mesh) {
          const p = o.geometry.getAttribute("position");
          if (!Array.from(p.array).every(Number.isFinite)) finite = false;
        }
      });
      if (age === 3.5) {
        game.settings.setPreset("MAX");
        e.update(0, 0);
        assert(e.age === 3.5, "LOW → MAX emergence does not reset time");
      }
      if (age === 6) {
        game.settings.setPreset("MEDIUM");
        e.update(0, 0);
        assert(
          e.timeline.state === "HOVERING",
          "Flight → hover without teleport",
        );
      }
      if (age === 8) {
        game.settings.setPreset("LOW");
        e.update(0, 0);
        assert(
          v.dragon.head.jaw.rotation.x > 0.4,
          "LOW charging retains jaw anatomy",
        );
      }
      if (age === 9.5) {
        game.settings.setPreset(preset);
        e.update(0, 0);
        assert(
          v.beam.root.position.distanceTo(e.mouth) < 1e-7 &&
            Math.abs(v.beam.direction.length() - 1) < 1e-7,
          "Breath attached to animated mouth / normalized direction",
        );
        assert(
          v.beam.root.visible && v.impact.root.visible && v.water.mesh.visible,
          "Six-layer breath, water eruption and dome render",
        );
      }
      if (age === 12) {
        assert(v.tornadoes.mesh.visible, "Tornadoes visible in all presets");
      }
      if (age === 16) {
        game.settings.setPreset("MAX");
        e.update(0, 0);
        assert(
          !v.dragon.root.visible && v.clouds.mesh.visible,
          "Dragon dissolves before lingering storm",
        );
      }
    }
    assert(finite, preset + " transforms and geometry remain finite");
    assert(!e.update(0.3, 0), "18-second completion");
    e.dispose();
    e.dispose();
    assert(
      !v.root.parent &&
        v.lighting.lights.every((l) => !l.parent) &&
        game.settings.subscriberCount === subs,
      "Root / lights / quality subscription released once",
    );
  }
  assert(
    Math.abs(
      resolveStormTarget(
        game.player.position,
        new Vector3(0, 0, -1000),
      )!.distanceTo(game.player.position) - 70,
    ) < 0.001,
    "70-metre range clamp",
  );
  game.player.position.set(0, 0, 0);
  game.camera.yaw = 0;
  game.camera.pitch = 0.33;
  game.camera.update(0, game.player.position, true);
  game.world.update(0, game.player.position);
  // Warm finite pools and light variants before measuring retention, including every preset.
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    for (let round = 0; round < 2; round++) {
      for (let slot = 0; slot < 7; slot++) cast(slot);
      renderStages();
      empty();
    }
  }
  for (let count = 0; count <= 27; count++) {
    const lights: PointLight[] = [];
    for (let i = 0; i < count; i++) {
      const l = new PointLight("#8f71ff", 0.1, 1);
      scene.add(l);
      lights.push(l);
    }
    game.renderer.render();
    for (const l of lights) {
      l.removeFromParent();
      l.dispose();
    }
  }
  game.settings.setPreset("MEDIUM");
  await delay(120);
  // Settle preset-sensitive cached geometry (Worldrend's inactive bundle retains the last topology).
  for (let slot = 0; slot < 7; slot++) cast(slot);
  renderStages();
  empty();
  // Also warm the short overlap pattern used below; it can expire old effects before every layer uploads.
  for (let slot = 0; slot < 7; slot++) {
    cast(slot);
    game.effects.update(0.33, 0);
    game.renderer.render();
  }
  empty();
  game.renderer.render();
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    assert(cast(6), "Isolated dragon cast " + (i + 1));
    renderStages();
    empty();
    if (i === 9 || i === 19)
      assert(
        stable(baseline),
        i + 1 + " isolated casts restore warmed counters",
      );
  }
  for (const total of [20, 40]) {
    for (let i = 0; i < total; i++) {
      assert(cast(i % 7), total + " alternating cast " + (i + 1));
      game.effects.update(0.33, 0);
      game.renderer.render();
      if (i % 7 === 6) empty();
    }
    empty();
    assert(
      stable(baseline),
      total + " alternating all-seven casts restore warmed counters",
    );
  }
  cast(6);
  let rejected = 0;
  for (let i = 0; i < 100; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 100 && game.effects.activeCount === 1,
    "100 cooldown-rejected requests stay bounded",
  );
  key("KeyD", true);
  await delay(200);
  key("KeyD", false);
  game.effects.update(9.5, 0);
  game.settings.setPreset("LOW");
  game.renderer.render();
  game.settings.setPreset("MAX");
  game.renderer.render();
  empty();
  game.player.position.set(0, 0, 0);
  game.camera.yaw = 0;
  game.camera.update(0, game.player.position, true);
  game.world.update(0, game.player.position);
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(
    stable(baseline),
    "Moving cast, active breath quality changes and cleanup",
  );
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    cast(6);
    renderStages();
    empty();
    await delay(100);
    cast(6);
    const samples: number[][] = Array.from({ length: 7 }, () => []),
      start = performance.now();
    let previous = start,
      peakCalls = 0,
      peakTriangles = 0,
      peakParticles = 0,
      peakInstances = 0,
      raf = 0;
    const boundaries = [2.2, 4.5, 7, 8.8, 10.4, 14, 18.5];
    const monitor = (now: number) => {
      const age = (now - start) / 1000,
        index = boundaries.findIndex((b) => age < b);
      if (index >= 0) samples[index].push(now - previous);
      previous = now;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      peakParticles = Math.max(peakParticles, game.effects.particleCount);
      peakInstances = Math.max(peakInstances, game.effects.instanceCount);
      raf = requestAnimationFrame(monitor);
    };
    raf = requestAnimationFrame(monitor);
    await delay(18500);
    cancelAnimationFrame(raf);
    profiles.push({
      preset,
      viewport: [innerWidth, innerHeight],
      peakCalls,
      peakTriangles,
      peakParticles,
      peakInstances,
      stages: samples.map((a, i) => ({
        stage: [
          "gathering",
          "emergence",
          "flight",
          "charge",
          "breath",
          "cataclysm",
          "aftermath",
        ][i],
        ...stats(a),
      })),
      resources: counters(),
    });
    assert(game.effects.activeCount === 0, preset + " real-time expiry");
  }
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(stable(baseline), "All real-time profiles restore warmed baseline");
  const final = counters();
  cast(6);
  game.effects.update(9.5, 0);
  game.settings.setPreset("MAX");
  game.effects.dispose();
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(
    stable(baseline),
    "Active ultimate disposal restores scene and GPU cache",
  );
  report.textContent +=
    "\n\nPROFILES " +
    JSON.stringify(profiles) +
    "\nBASELINE " +
    JSON.stringify(baseline) +
    "\nFINAL " +
    JSON.stringify(final) +
    "\n" +
    (failures.length
      ? failures.length + " FAILURES"
      : "ALL PHASE 08 BROWSER CHECKS PASSED");
} catch (e) {
  assert(false, e instanceof Error ? (e.stack ?? e.message) : String(e));
} finally {
  const activeDisposal = cast(6);
  game.effects.update(9.5, 0);
  game.settings.setPreset("MAX");
  game.renderer.render();
  report.textContent +=
    "\n" +
    (activeDisposal && game.effects.activeCount === 1 ? "PASS" : "FAIL") +
    " Full game disposal begins during active dragon breath";
  game.dispose();
  resources.dispose();
  report.textContent +=
    "\n" +
    (renderer.info.memory.geometries === 0 &&
    renderer.info.memory.textures === 0 &&
    game.settings.subscriberCount === 0
      ? "PASS"
      : "FAIL") +
    " Full disposal " +
    JSON.stringify(renderer.info.memory) +
    " subscriptions " +
    game.settings.subscriberCount;
}
