import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { VoidResources } from "../src/abilities/void/VoidResources";
import { WorldrendEffect } from "../src/abilities/void/WorldrendEffect";

// Development-only deterministic timeline and live playback; omitted from production.
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.abilities.select(5);
game.start();
const resources = new VoidResources();
let effect: WorldrendEffect | undefined;
let age = Number(new URLSearchParams(location.search).get("age") ?? 3.8),
  range = Number(new URLSearchParams(location.search).get("range") ?? 18),
  playing = false,
  seed = 32751;
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
  effect = new WorldrendEffect(
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
    seed,
  );
  effect.update(playing ? 0 : age, 0);
  game.renderer.render();
  status.textContent = `${age.toFixed(3)}s / ${range}m / ${game.settings.preset}`;
};
const controls = document.createElement("div");
controls.style.cssText =
  "position:fixed;left:30px;top:130px;display:flex;flex-wrap:wrap;gap:5px;max-width:1100px;z-index:30";
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
  ["charge", 0.22],
  ["target", 0.52],
  ["fractures", 1.1],
  ["opening", 1.8],
  ["stable", 3.8],
  ["expansion", 2.65],
  ["surge", 4.4],
  ["collapse", 6.7],
  ["implosion", 7.55],
  ["shock", 7.9],
  ["repair", 9.1],
  ["dust", 10.5],
] as const)
  button(label, () => (age = time));
for (const distance of [5, 15, 30, 55])
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
  game.player.position.x = 0;
  game.camera.yaw = 0;
  game.camera.pitch = 0.33;
  game.camera.update(0, game.player.position, true);
});
button("New seed", () => (seed += 7919));
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
