import "../src/styles/game.css";
import { Game } from "../src/game/Game";
import { LegacyDarkWater } from "./LegacyDarkWater";
import { Vector2 } from "three";
const game = new Game(document.querySelector<HTMLElement>("#app")!);
await game.player.visual.ready;
game.camera.update(0, game.player.position, true);
const report = document.createElement("pre");
report.id = "water-report";
report.style.cssText =
  "position:fixed;left:30px;top:140px;color:#bbd0e7;font:11px monospace;z-index:30";
document.body.append(report);
const records: unknown[] = [];
const query = new URLSearchParams(location.search);
const legacy = query.has("legacy")
  ? new LegacyDarkWater(game.sceneManager.scene, game.settings)
  : undefined;
if (legacy) {
  game.world.water.mesh.visible = false;
  game.renderer.beforeRender = undefined;
}
game.player.visual.update(0, 0, 1.1);
const resolutions = query.has("benchmark")
  ? [
      [1280, 720],
      [1920, 1080],
      [2560, 1440],
    ]
  : [[1280, 720]];
const drawingSize = new Vector2();
let time = 12;
for (const [width, height] of resolutions) {
  for (const preset of ["LOW", "MEDIUM", "MAX"] as const) {
    game.settings.setPreset(preset);
    game.renderer.renderer.setSize(width, height, false);
    game.renderer.composer.setSize(width, height);
    let last = performance.now();
    const frames: number[] = [];
    const reflection: number[] = [];
    let peakCalls = 0,
      peakTriangles = 0;
    for (let i = 0; i < 160; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const now = performance.now();
      if (i > 10) frames.push(now - last);
      last = now;
      game.world.update(time, game.player.position);
      legacy?.update(time, game.player.position);
      game.renderer.render();
      peakCalls = Math.max(peakCalls, game.renderer.renderer.info.render.calls);
      peakTriangles = Math.max(
        peakTriangles,
        game.renderer.renderer.info.render.triangles,
      );
      if (!legacy && preset !== "LOW")
        reflection.push(game.world.water.reflection.lastCpuMs);
    }
    frames.sort((a, b) => a - b);
    const info = game.renderer.renderer.info;
    records.push({
      preset,
      viewport: [innerWidth, innerHeight],
      renderSize: game.renderer.renderer
        .getDrawingBufferSize(drawingSize)
        .toArray(),
      legacy: !!legacy,
      peakCalls,
      peakTriangles,
      reflectionSubmitMedianMs: summaryReflection(reflection),
      medianMs: frames[Math.floor(frames.length * 0.5)],
      p95Ms: frames[Math.floor(frames.length * 0.95)],
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length,
    });
    report.textContent = JSON.stringify(records, null, 2);
  }
}
if (query.has("capture")) report.hidden = true;
game.settings.setPreset("MAX");
game.renderer.renderer.setSize(innerWidth, innerHeight, false);
game.renderer.composer.setSize(innerWidth, innerHeight);
game.world.update(time, game.player.position);
legacy?.update(time, game.player.position);
game.renderer.render();
window.addEventListener("pagehide", () => {
  legacy?.dispose();
  game.dispose();
});
function summaryReflection(samples: number[]): number | null {
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return Number(samples[Math.floor(samples.length * 0.5)].toFixed(3));
}
