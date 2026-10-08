import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { FireResources } from "../src/abilities/fire/FireResources";
import { AbyssalFlameEffect } from "../src/abilities/fire/AbyssalFlameEffect";

// Development-only deterministic timeline and live playback; omitted from production.
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root);
game.abilities.select(4);
game.start();
const resources = new FireResources();
let effect: AbyssalFlameEffect | undefined;
let age = Number(new URLSearchParams(location.search).get("age") ?? 0.82),
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
    if (playing && effect && !effect.update(delta, elapsed)) {
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
  effect = new AbyssalFlameEffect(
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
    stage();
    b.blur();
  };
  controls.append(b);
};
for (const [label, time] of [
  ["charge", 0.22],
  ["kindle", 0.52],
  ["trace", 0.32],
  ["inferno", 2.2],
  ["strike", 0.82],
  ["secondary", 1.12],
  ["burn", 4.4],
  ["collapse", 6.1],
  ["embers", 7.9],
] as const)
  button(label, () => (age = time));
for (const distance of [5, 12, 25, 42])
  button(`${distance}m`, () => (range = distance));
for (const q of ["LOW", "MEDIUM", "MAX"] as const)
  button(`${q} spell`, () => game.settings.setPreset(q));
for (const yaw of [0, 0.7, -0.7, 2.4])
  button(`angle ${yaw}`, () => {
    game.camera.yaw = yaw;
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
