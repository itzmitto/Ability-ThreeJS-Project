import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { WindResources } from "../src/abilities/wind/WindResources";
import { TempestBreakEffect } from "../src/abilities/wind/TempestBreakEffect";
import { resolveWindTarget } from "../src/abilities/wind/resolveWindTarget";

// Development-only authored timeline viewer, never included in production.
const root = document.querySelector<HTMLElement>("#app")!;
const game = new Game(root);
game.abilities.select(1);
game.start();
const resources = new WindResources();
let effect: TempestBreakEffect | undefined;
let stageName = new URLSearchParams(location.search).get("stage") ?? "impact";
let range = 14;
let playing = false;
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
status.style.cssText = "color:#c3dfe4;font:11px monospace;";
const stage = (): void => {
  effect?.dispose();
  const ground = new Vector3(0, 0, -range),
    origin = game.player.visual.getRightHandWorldPosition(),
    direction = new Vector3(0, -0.05, -1);
  const target = resolveWindTarget(origin, ground, ground, direction)!;
  effect = new TempestBreakEffect(
    {
      player: game.player,
      scene: game.sceneManager.scene,
      camera: game.camera.camera,
      origin,
      direction,
      groundTarget: ground,
      targetPoint: ground,
      playerForward: game.player.getForward().clone(),
      cameraForward: direction,
      targeting: game.targeting,
      effectManager: game.effects,
      quality: game.settings,
      time: 0,
    },
    resources,
    resources.pool.acquire()!,
    target,
  );
  const time = playing
    ? 0
    : stageName === "charge"
      ? 0.21
      : stageName === "flight"
        ? 0.28 + (effect.impactTime - 0.365) * 0.55
        : stageName === "compression"
          ? effect.impactTime - 0.035
          : stageName === "impact"
            ? effect.impactTime + 0.16
            : stageName === "vortex"
              ? effect.impactTime + 0.48
              : effect.impactTime + 1.4;
  effect.update(time, time);
  status.textContent = `${stageName} / ${range}m / ${game.settings.preset}`;
};
const controls = document.createElement("div");
controls.style.cssText =
  "position:fixed;left:30px;top:130px;display:flex;flex-wrap:wrap;gap:5px;max-width:900px;z-index:30";
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
for (const name of [
  "charge",
  "flight",
  "compression",
  "impact",
  "vortex",
  "residual",
])
  button(name, () => (stageName = name));
for (const distance of [5, 14, 40])
  button(`${distance}m`, () => (range = distance));
for (const q of ["LOW", "MEDIUM", "MAX"] as const)
  button(q, () => game.settings.setPreset(q));
for (const yaw of [0, 0.5, -0.5])
  button(`angle ${yaw}`, () => (game.camera.yaw = yaw));
button("Play sequence", () => {
  playing = true;
});
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
