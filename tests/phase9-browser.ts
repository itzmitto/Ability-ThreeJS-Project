import "../src/styles/game.css";
import { Mesh, PointLight, Vector3 } from "three";
import { Game } from "../src/game/Game";
import type { AbilityCastContext } from "../src/abilities/Ability";
import { SanguineEclipseEffect } from "../src/abilities/blood/SanguineEclipseEffect";
import { BloodResourceManager } from "../src/abilities/blood/BloodResourceManager";
import { resolveBloodTarget } from "../src/abilities/blood/resolveBloodTarget";
import { sanguineStage } from "../src/abilities/blood/SanguineTimeline";
import type { QualityPreset } from "../src/quality/QualityPreset";
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.start();
const scene = game.sceneManager.scene,
  renderer = game.renderer.renderer,
  resources = new BloodResourceManager();
const report = document.createElement("pre");
report.id = "acceptance-report";
report.style.cssText =
  "position:fixed;left:24px;top:130px;max-height:72vh;max-width:94vw;overflow:auto;background:#110812f5;color:#e5c7d3;font:11px/1.4 monospace;padding:14px;z-index:30";
root.append(report);
const lines: string[] = [],
  failures: string[] = [],
  profiles: unknown[] = [];
let measuredReport = "";
const assert = (ok: boolean, name: string) => {
  lines.push((ok ? "PASS " : "FAIL ") + name);
  if (!ok) failures.push(name);
  report.textContent = lines.join("\n") + measuredReport;
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
function context(g = game, distance = 40): AbilityCastContext {
  const target = new Vector3(
    g.player.position.x,
    0,
    g.player.position.z - distance,
  );
  return {
    player: g.player,
    scene: g.sceneManager.scene,
    camera: g.camera.camera,
    origin: g.player.visual.getRightHandWorldPosition(),
    direction: g.targeting.aimDirection.clone(),
    groundTarget: target,
    targetPoint: target,
    playerForward: g.player.getForward().clone(),
    cameraForward: g.targeting.aimDirection.clone(),
    targeting: g.targeting,
    effectManager: g.effects,
    quality: g.settings,
    time: 0,
    water: g.world.water.interactions,
    cameraFeedback: g.camera.addFeedback,
  };
}
const counters = () => {
  let objects = 0,
    lights = 0;
  scene.traverse((o) => {
    objects++;
    if (o instanceof PointLight) lights++;
  });
  return {
    children: scene.children.length,
    objects,
    lights,
    subscriptions: game.settings.subscriberCount,
    active: game.effects.activeCount,
    ripples: game.world.water.interactions.activeCount,
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
  for (let attempts = 0; attempts < 40; attempts++) {
    if (game.abilities.cast(context())) return true;
    // Preserve each existing pool bound while counting successful stress casts.
    game.effects.update(0.5, 0);
    game.renderer.render();
  }
  return false;
};
const stages = () => {
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
      "ripples",
      "geometries",
      "textures",
      "programs",
    ] as const
  ).every((k) => base[k] === now[k]);
  if (!ok) profiles.push({ type: "counter mismatch", base, now });
  return ok;
};
const summary = (samples: number[]) => {
  samples.sort((a, b) => a - b);
  return {
    frames: samples.length,
    medianMs: Number(
      (samples[Math.floor(samples.length * 0.5)] ?? 0).toFixed(2),
    ),
    p95Ms: Number((samples[Math.floor(samples.length * 0.95)] ?? 0).toFixed(2)),
  };
};
try {
  await game.player.visual.ready;
  await delay(300);
  assert(
    game.player.visual.loaded && game.player.visual.animationState === "Idle",
    "Local human model and Idle",
  );
  const idle = game.world.water.interactions.emitted;
  await delay(250);
  assert(
    game.world.water.interactions.emitted === idle,
    "Idle and camera rotation do not create footsteps",
  );
  key("KeyW", true);
  await delay(450);
  assert(game.player.visual.animationState === "Walk", "WASD and Walk");
  const walking = game.world.water.interactions.emitted;
  assert(walking > idle, "Movement creates contact ripples at shoes");
  key("ShiftLeft", true);
  key("KeyD", true);
  await delay(500);
  assert(
    game.player.visual.animationState === "Run" &&
      game.world.water.interactions.emitted > walking,
    "Diagonal sprint and more contact disturbances",
  );
  game.settings.setPreset("LOW");
  await delay(100);
  game.settings.setPreset("MAX");
  await delay(120);
  key("KeyW", false);
  key("KeyD", false);
  key("ShiftLeft", false);
  await delay(1900);
  assert(
    game.player.position.y === 0 &&
      game.world.water.interactions.activeCount === 0,
    "Stable logical plane and natural step expiry after stopping",
  );
  const aim = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousemove", {
      buttons: 2,
      movementX: 35,
      movementY: 8,
      bubbles: true,
    }),
  );
  await delay(100);
  assert(
    game.targeting.hasGroundTarget &&
      aim.distanceTo(game.targeting.aimDirection) > 0.01,
    "Mouse aiming and shared ground targeting",
  );
  key("KeyB", true);
  await delay(90);
  key("KeyB", false);
  assert(
    game.abilities.selectedIndex === 7 &&
      game.abilities.selectedAbility?.id === "sanguine-eclipse",
    "B selects eighth ability",
  );
  assert(
    !!root.querySelector('[aria-label="B: SANGUINE ECLIPSE"] svg'),
    "Original blood icon and readable eighth HUD card",
  );
  renderer.domElement.dispatchEvent(
    new MouseEvent("mousedown", { button: 0, bubbles: true }),
  );
  await delay(120);
  assert(
    game.effects.activeCount === 1 && game.abilities.getCooldown(7) > 13.8,
    "Left click casts and shared fourteen-second cooldown",
  );
  assert(
    !!root.querySelector(".ability-slot.on-cooldown"),
    "Existing cooldown mask",
  );
  empty();
  key("Digit8", true);
  await delay(90);
  key("Digit8", false);
  assert(game.abilities.selectedIndex === 7, "8 aliases B");
  game.abilities.update(25);
  assert(
    !game.abilities.cast({ ...context(), groundTarget: null }) &&
      game.abilities.getCooldown(7) === 0,
    "Invalid sky target rejects without cooldown",
  );
  assert(
    Math.abs(
      resolveBloodTarget(new Vector3(), new Vector3(0, 0, -200))!.length() - 60,
    ) < 0.001,
    "Maximum range clamps to sixty metres",
  );
  for (const [i, code, id] of [
    [0, "KeyQ", "glacial-eruption"],
    [1, "KeyE", "tempest-break"],
    [2, "KeyR", "heavens-verdict"],
    [3, "KeyF", "megiddo"],
    [4, "KeyV", "abyssal-flame"],
    [5, "KeyX", "worldrend"],
    [6, "KeyC", "tempest-cataclysm"],
  ] as const) {
    key(code, true);
    await delay(70);
    key(code, false);
    assert(
      game.abilities.selectedAbility?.id === id && cast(i),
      id + " still selects and casts",
    );
    game.effects.update(i === 6 ? 9.5 : 1.4, 0);
    game.renderer.render();
    assert(game.effects.particleCount > 0, id + " renders with upgraded water");
    empty();
  }
  assert(
    game.abilities.slots.filter((s) => s.abilityId).length === 8,
    "Exactly eight real abilities",
  );
  key("F3", true);
  await delay(100);
  key("F3", false);
  assert(!!root.querySelector(".debug-panel:not([hidden])"), "Debug system");
  key("F3", true);
  await delay(100);
  key("F3", false);
  assert(!!root.querySelector(".performance-panel"), "Performance HUD");
  const subscribers = game.settings.subscriberCount;
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    const c = context(),
      v = resources.pool.acquire()!,
      e = new SanguineEclipseEffect(c, resources, v, c.groundTarget!);
    for (const age of [
      0.5, 2, 3, 4.5, 5.7, 6.9, 8.7, 9.8, 10.55, 11.5, 13.5, 15, 15.9,
    ]) {
      e.update(age - e.age, 0);
      game.renderer.render();
      let finite = true;
      v.root.traverse((o) => {
        finite &&= [...o.position.toArray(), ...o.quaternion.toArray()].every(
          Number.isFinite,
        );
        if (o instanceof Mesh)
          finite &&= Array.from(
            o.geometry.getAttribute("position").array,
          ).every(Number.isFinite);
      });
      assert(
        finite,
        preset + " " + sanguineStage(age) + " transforms/geometry finite",
      );
      if (age === 0.5) {
        const hand = game.player.visual.getRightHandWorldPosition(),
          actual = v.aura.root.getWorldPosition(new Vector3());
        assert(
          hand.distanceTo(actual) < 0.001,
          "Aura follows actual animated right hand",
        );
      }
      if (age === 3) {
        game.settings.setPreset("MAX");
        e.update(0, 0);
        assert(e.age === age, "LOW → MAX formation preserves timeline");
      }
      if (age === 6.9) {
        game.settings.setPreset("MEDIUM");
        e.update(0, 0);
        assert(
          e.age === age && v.lance.impacts[0] === 1,
          "Visible barrage, first impact and MAX → MEDIUM",
        );
      }
      if (age === 8.7) {
        game.settings.setPreset("LOW");
        e.update(0, 0);
        assert(e.age === age, "MEDIUM → LOW compression preserves timeline");
      }
      if (age === 10.55)
        assert(
          v.sheets.mesh.visible &&
            v.tide.mesh.visible &&
            game.world.water.interactions.activeCount > 0,
          "Curved splash, tidal crest and shared water sources",
        );
      if (age === 13.5) {
        game.settings.setPreset("MAX");
        e.update(0, 0);
        assert(
          !v.eclipse.mesh.visible && v.aftermath.mesh.visible && e.age === age,
          "LOW → MAX aftermath survives Eclipse removal",
        );
      }
    }
    assert(!e.update(0.2, 0), "Sixteen-second completion");
    e.dispose();
    e.dispose();
    game.renderer.render();
    assert(
      v.root.parent === null &&
        v.lights.lights.every((l) => !l.parent) &&
        game.settings.subscriberCount === subscribers,
      "Idempotent root/light/water subscription cleanup",
    );
  }
  resources.dispose();
  // Warm all quality/material/light variants and both normal-overlap blood bundles before strict comparisons.
  for (const q of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(q);
    // Both pooled formations must be visible together to initialize both GPU LOD caches.
    cast(7);
    cast(7);
    stages();
    empty();
    for (let slot = 0; slot < 8; slot++) {
      for (let lease = 0; lease < 3; lease++) {
        cast(slot);
        game.effects.update(0.1, 0);
        game.renderer.render();
      }
      stages();
      empty();
    }
    for (let repeat = 0; repeat < 2; repeat++) {
      for (let i = 0; i < 8; i++) cast(i);
      stages();
      empty();
    }
    cast(7);
    game.effects.update(14.1, 0);
    cast(7);
    stages();
    empty();
  }
  const warmLights = Array.from(
    { length: 27 },
    () => new PointLight(0xffffff, 0.001, 1),
  );
  for (const light of warmLights) {
    scene.add(light);
    game.renderer.render();
  }
  warmLights.forEach((l) => l.removeFromParent());
  game.settings.setPreset("MEDIUM");
  for (let repeat = 0; repeat < 2; repeat++) {
    // Exercise the same bounded overlapping leases as the subsequent forty-cast test.
    for (let i = 0; i < 40; i++) {
      cast(i % 8);
      game.effects.update(0.33, 0);
      game.renderer.render();
    }
    stages();
    empty();
  }
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    assert(cast(7), "Isolated blood cast " + (i + 1));
    stages();
    empty();
    if (i === 9 || i === 19)
      assert(
        stable(baseline),
        i + 1 + " isolated casts restore warmed baseline",
      );
  }
  for (const count of [20, 40]) {
    for (let i = 0; i < count; i++) {
      assert(cast(i % 8), count + " alternating cast " + (i + 1));
      game.effects.update(0.33, 0);
      game.renderer.render();
    }
    stages();
    empty();
    assert(
      stable(baseline),
      count + " alternating all-eight casts restore warmed baseline",
    );
  }
  cast(7);
  let rejected = 0;
  for (let i = 0; i < 100; i++) if (!game.abilities.cast(context())) rejected++;
  assert(
    rejected === 100 && game.effects.activeCount === 1,
    "100 rapid cooldown attempts reject without allocations",
  );
  empty();
  assert(stable(baseline), "Cooldown attempts retain stable resources");
  const water = game.world.water.interactions,
    a = {},
    b = {};
  water.addRipple(
    {
      position: game.player.position,
      strength: 0.1,
      duration: 2,
      waveSpeed: 1,
    },
    a,
  );
  water.addRipple(
    {
      position: game.player.position,
      strength: 0.1,
      duration: 2,
      waveSpeed: 1,
    },
    b,
  );
  water.removeOwner(a);
  assert(
    water.activeCount === 1,
    "One water owner removal preserves another source",
  );
  for (let i = 0; i < 300; i++)
    water.addRipple(
      {
        position: game.player.position,
        strength: 0.1,
        duration: 2,
        waveSpeed: 1,
      },
      b,
    );
  assert(
    water.activeCount <= water.capacity,
    "300 water disturbances stay bounded",
  );
  water.removeOwner(b);
  assert(water.activeCount === 0, "Water stress sources release independently");
  cast(7);
  key("KeyW", true);
  key("ShiftLeft", true);
  await delay(500);
  game.settings.setPreset("MAX");
  game.effects.update(9.6, 0);
  game.renderer.render();
  await delay(100);
  game.settings.setPreset("LOW");
  game.effects.update(3.3, 0);
  game.renderer.render();
  key("KeyW", false);
  key("ShiftLeft", false);
  empty();
  await delay(1900);
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(
    stable(baseline),
    "Sprint during execution, live water/ability quality and cleanup",
  );
  for (const preset of ["LOW", "MEDIUM", "MAX"] as QualityPreset[]) {
    game.settings.setPreset(preset);
    cast(7);
    const start = performance.now(),
      samples = new Map<string, number[]>();
    let previous = start,
      peakCalls = 0,
      peakTriangles = 0,
      peakParticles = 0,
      peakInstances = 0;
    while (performance.now() - start < 16500) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const now = performance.now(),
        age = (now - start) / 1000,
        stage = sanguineStage(age);
      if (!samples.has(stage)) samples.set(stage, []);
      samples.get(stage)!.push(now - previous);
      previous = now;
      peakCalls = Math.max(peakCalls, renderer.info.render.calls);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      peakParticles = Math.max(peakParticles, game.effects.particleCount);
      peakInstances = Math.max(peakInstances, game.effects.instanceCount);
    }
    assert(game.effects.activeCount === 0, preset + " real-time spell expiry");
    profiles.push({
      preset,
      viewport: [innerWidth, innerHeight],
      peakCalls,
      peakTriangles,
      peakParticles,
      peakInstances,
      stages: Array.from(samples, ([stage, frames]) => ({
        stage,
        ...summary(frames),
      })),
      resources: counters(),
    });
  }
  game.settings.setPreset("MEDIUM");
  game.renderer.render();
  assert(
    stable(baseline),
    "All real-time profiles restore warmed resource baseline",
  );
  measuredReport =
    "\nPROFILES " +
    JSON.stringify(profiles) +
    "\nBASELINE " +
    JSON.stringify(baseline) +
    "\nFINAL " +
    JSON.stringify(counters()) +
    "\n" +
    (failures.length
      ? failures.length + " CHECKS FAILED"
      : "ALL PHASE 09 BROWSER CHECKS PASSED");
} catch (error) {
  assert(false, error instanceof Error ? error.message : String(error));
} finally {
  resources.dispose();
  game.dispose();
  assert(
    renderer.info.memory.geometries === 0 &&
      renderer.info.memory.textures === 0 &&
      game.settings.subscriberCount === 0,
    "Primary game releases water mirror, GPU resources and subscriptions",
  );
}
for (const age of [4.5, 10.3, 14.8]) {
  const g = new Game(root);
  await g.player.visual.ready;
  g.camera.update(0, g.player.position, true);
  g.abilities.select(7);
  g.abilities.cast(context(g));
  g.effects.update(age, 0);
  g.world.update(age, g.player.position);
  g.renderer.render();
  const r = g.renderer.renderer;
  g.dispose();
  assert(
    r.info.memory.geometries === 0 &&
      r.info.memory.textures === 0 &&
      g.settings.subscriberCount === 0,
    "Game disposal during " +
      sanguineStage(age) +
      " releases water and blood resources",
  );
}
