import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { StormResourcePool } from "../src/abilities/stormDragon/StormResourcePool";
import { TempestCataclysmEffect } from "../src/abilities/stormDragon/TempestCataclysmEffect";

// Development-only deterministic timeline and live playback; omitted from production.
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.abilities.select(6);
game.start();
const resources = new StormResourcePool();
let effect: TempestCataclysmEffect | undefined;
let dragonOnly = false;
let age = Number(new URLSearchParams(location.search).get("age") ?? 6),
  range = Number(new URLSearchParams(location.search).get("range") ?? 40),
  playing = false;

game.effects.add({
  get particleCount() {
    return effect?.particleCount ?? 0;
  },
  get instanceCount() {
    return effect?.instanceCount ?? 0;
  },
  update: (delta, elapsed) => {
    if (effect && !effect.update(playing ? delta : 0, elapsed)) {
      effect.dispose();
      effect = undefined;
      playing = false;
    }
    if (effect && dragonOnly) {
      const v = effect.visuals;
      v.root.children.forEach((o) => {
        if (o !== v.dragon.root) o.visible = false;
      });
      v.dragon.root.visible = true;
      v.charge.root.visible = false;
      v.aura.mesh.visible = false;
      v.lighting.reset();
      v.dragon.materials.update(age, 0, 0, 1);
      v.dragon.materials.eye.uniforms.uGlow.value = 0;
    }
    return true;
  },
  dispose: () => effect?.dispose(),
});
const status = document.createElement("span");
status.style.cssText = "color:#c1d8ff;font:11px monospace;";
status.id = "stage-status";
const stage = (): void => {
  effect?.dispose();
  // Keep the test cast aligned with the camera, as normal crosshair casting would be.
  const target = new Vector3(
    -Math.sin(game.camera.yaw) * range,
    0,
    -Math.cos(game.camera.yaw) * range,
  );
  effect = new TempestCataclysmEffect(
    {
      player: game.player,
      scene: game.sceneManager.scene,
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
    },
    resources,
    resources.pool.acquire()!,
    target,
  );
  effect.update(playing ? 0 : age, 0);
  game.renderer.render();
  status.textContent = `${age.toFixed(3)}s / ${range}m / ${game.settings.preset}`;
};
const controls = document.createElement("div");
controls.style.cssText =
  "position:fixed;left:30px;bottom:170px;display:flex;flex-wrap:wrap;gap:5px;max-width:1100px;z-index:30";
const button = (label: string, action: () => void): void => {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => {
    playing = false;
    action();
    if (!label.endsWith(" view")) stage();
    else {
      effect?.update(0, 0);
      game.renderer.render();
    }
    b.blur();
  };
  controls.append(b);
};
for (const [label, time] of [
  ["aura", 0.5],
  ["clouds", 2],
  ["silhouette", 3.5],
  ["emergence", 4.5],
  ["wingbeat", 6],
  ["charge", 8],
  ["breath", 9.5],
  ["impact", 10.5],
  ["thunderfall", 12],
  ["surge", 12.8],
  ["dissolve", 14],
  ["aftermath", 16],
  ["fade", 17.8],
] as const)
  button(label, () => (age = time));
button("Dragon only", () => (dragonOnly = true));
button("Full VFX", () => (dragonOnly = false));
button("anatomy view", () => {
  game.player.position.set(30, 0, -55);
  game.camera.yaw = 0.95;
  game.camera.pitch = -0.15;
  game.camera.update(0, game.player.position, true);
});
button("under dragon view", () => {
  if (!effect) return;
  effect.visuals.dragon.root.getWorldPosition(game.player.position);
  game.player.position.y = 0;
  game.camera.pitch = -0.35;
  game.camera.update(0, game.player.position, true);
});
for (const distance of [5, 25, 45, 70])
  button(`${distance}m`, () => (range = distance));
for (const q of ["LOW", "MEDIUM", "MAX"] as const)
  button(`${q} spell`, () => game.settings.setPreset(q));
for (const yaw of [0, 0.7, -0.7, 2.4])
  button(`angle ${yaw}`, () => {
    game.camera.yaw = yaw;
    game.camera.update(0, game.player.position, true);
  });
button("side view", () => {
  game.player.position.x = range * 0.6;
  game.camera.yaw = Math.atan(0.6);
  game.camera.update(0, game.player.position, true);
});
button("angled view", () => {
  game.player.position.x = -range * 0.3;
  game.camera.yaw = -Math.atan(0.3);
  game.camera.update(0, game.player.position, true);
});
button("low view", () => {
  game.camera.pitch = 0.1;
  game.camera.update(0, game.player.position, true);
});
button("normal view", () => {
  game.player.position.set(0, 0, 0);
  game.camera.yaw = 0;
  game.camera.pitch = 0.33;
  game.camera.update(0, game.player.position, true);
});

button("Play sequence", () => (playing = true));
controls.append(status);
controls.hidden = new URLSearchParams(location.search).has("capture");
root.append(controls);
await game.player.visual.ready;
stage();
window.addEventListener("pagehide", () => {
  effect?.dispose();
  game.dispose();
  resources.dispose();
});
