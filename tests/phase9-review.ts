import "../src/styles/game.css";
import { Vector3 } from "three";
import { Game } from "../src/game/Game";
import { BloodResourceManager } from "../src/abilities/blood/BloodResourceManager";
import { SanguineEclipseEffect } from "../src/abilities/blood/SanguineEclipseEffect";
const root = document.querySelector<HTMLElement>("#app")!,
  game = new Game(root),
  resources = new BloodResourceManager(),
  query = new URLSearchParams(location.search);
game.abilities.select(7);
game.start();
let age = Number(query.get("age") ?? 4.5),
  range = Number(query.get("range") ?? 40),
  playing = false,
  effect: SanguineEclipseEffect | undefined;
game.effects.add({
  get particleCount() {
    return effect?.particleCount ?? 0;
  },
  get instanceCount() {
    return effect?.instanceCount ?? 0;
  },
  update: (dt, time) => {
    if (effect && !effect.update(playing ? dt : 0, time)) {
      effect.dispose();
      effect = undefined;
      playing = false;
    }
    return true;
  },
  dispose: () => effect?.dispose(),
});
const controls = document.createElement("div");
controls.style.cssText =
  "position:fixed;left:30px;bottom:170px;display:flex;flex-wrap:wrap;gap:5px;max-width:1100px;z-index:30";
const status = document.createElement("span");
status.style.cssText = "font:11px monospace;color:#e0bac8";
status.id = "stage-status";
const stage = () => {
  effect?.dispose();
  const target = new Vector3(0, 0, -range);
  effect = new SanguineEclipseEffect(
    {
      player: game.player,
      scene: game.sceneManager.scene,
      camera: game.camera.camera,
      origin: game.player.visual.getRightHandWorldPosition(),
      direction: game.targeting.aimDirection.clone(),
      targetPoint: target,
      groundTarget: target,
      playerForward: game.player.getForward().clone(),
      cameraForward: game.targeting.aimDirection.clone(),
      targeting: game.targeting,
      effectManager: game.effects,
      quality: game.settings,
      time: 0,
      water: game.world.water.interactions,
    },
    resources,
    resources.pool.acquire()!,
    target,
  );
  effect.update(playing ? 0 : age, 0);
  game.renderer.render();
  status.textContent = `${age}s / ${range}m / ${game.settings.preset}`;
};
const button = (text: string, action: () => void) => {
  const b = document.createElement("button");
  b.textContent = text;
  b.onclick = () => {
    playing = false;
    action();
    if (!text.endsWith("view")) stage();
    else game.renderer.render();
    b.blur();
  };
  controls.append(b);
};
for (const [name, t] of [
  ["hand", 0.5],
  ["ascension", 2],
  ["formation", 3],
  ["eclipse", 4.5],
  ["weapons", 5.7],
  ["barrage", 6.9],
  ["compression", 8.7],
  ["execution", 9.8],
  ["impact", 10.55],
  ["tidal wave", 11.5],
  ["dissolve", 13.5],
  ["aftermath", 15],
  ["fade", 15.9],
] as const)
  button(name, () => (age = t));
for (const d of [5, 25, 40, 60]) button(`${d}m`, () => (range = d));
for (const preset of ["LOW", "MEDIUM", "MAX"] as const)
  button(`${preset} spell`, () => game.settings.setPreset(preset));
button("normal view", () => {
  game.player.position.set(0, 0, 0);
  game.camera.yaw = 0;
  game.camera.pitch = 0.33;
  game.camera.update(0, game.player.position, true);
});
button("side view", () => {
  game.player.position.set(range * 0.6, 0, 0);
  game.camera.yaw = Math.atan(0.6);
  game.camera.pitch = 0.1;
  game.camera.update(0, game.player.position, true);
});
button("low view", () => {
  game.camera.pitch = 0.02;
  game.camera.update(0, game.player.position, true);
});
button("Play sequence", () => (playing = true));
controls.append(status);
controls.hidden = query.has("capture");
root.append(controls);
await game.player.visual.ready;
stage();
window.addEventListener("pagehide", () => {
  effect?.dispose();
  game.dispose();
  resources.dispose();
});
