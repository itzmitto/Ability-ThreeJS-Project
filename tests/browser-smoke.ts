import '../src/styles/game.css';
import { Game } from '../src/game/Game';

// Development-only acceptance harness. Exercises DOM input and the real render loop.
const root = document.querySelector<HTMLElement>('#app')!;
const report = document.createElement('pre');
report.id = 'acceptance-report';
report.style.cssText = 'position:fixed;left:30px;top:160px;background:#06121ef5;color:#aecbdd;padding:18px;font:11px/1.7 monospace;z-index:10;border:1px solid #456';
root.append(report);
const failures: string[] = [];
const results: string[] = [];
const assert = (condition: boolean, name: string): void => {
  (condition ? results : failures).push(name);
  report.textContent = [...results.map(item => `PASS ${item}`), ...failures.map(item => `FAIL ${item}`)].join('\n');
};
window.addEventListener('error', event => assert(false, event.message));
window.addEventListener('unhandledrejection', event => assert(false, String(event.reason)));
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const key = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true })); };
const game = new Game(root);
game.start();
const canvas = game.renderer.renderer.domElement;
try {
  await delay(650);
  assert(game.performance.stats.fps > 0, 'Render loop and FPS telemetry');
  assert(game.targeting.hasGroundTarget && Math.abs(game.targeting.getGroundTarget()!.y) < 0.0001, 'Crosshair ground intersection');
  const start = game.player.position.clone(); const cameraStart = game.camera.camera.position.clone();
  key('KeyW', true); await delay(650); key('KeyW', false); await delay(350);
  assert(game.player.position.z < start.z - 1, 'W moves forward through actual keyboard input');
  assert(game.camera.camera.position.distanceTo(cameraStart) > 1, 'Camera follows moving player');
  const diagonalStart = game.player.position.clone();
  key('KeyD', true); key('KeyW', true); await delay(500); key('KeyD', false); key('KeyW', false); await delay(350);
  assert(game.player.position.x > diagonalStart.x + 0.5 && game.player.position.z < diagonalStart.z - 0.5, 'Diagonal movement');
  const backwardStart = game.player.position.clone(); key('KeyS', true); await delay(450); key('KeyS', false); await delay(300);
  assert(game.player.position.z > backwardStart.z + 0.5, 'S moves backward');
  const leftStart = game.player.position.clone(); key('KeyA', true); await delay(450); key('KeyA', false); await delay(300);
  assert(game.player.position.x < leftStart.x - 0.5, 'A strafes left');
  const direction = game.targeting.aimDirection.clone();
  canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 2, movementX: 160, movementY: 80 })); await delay(350);
  assert(game.camera.yaw < -0.2 && game.targeting.aimDirection.distanceTo(direction) > 0.1, 'Mouse rotates camera and changes aim ray');
  for (const [index, code] of ['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyV', 'KeyX', 'KeyC', 'KeyB'].entries()) {
    key(code, true); await delay(60); key(code, false); assert(game.abilities.selectedIndex === index, `${code.slice(3)} selects slot ${index + 1}`);
  }
  const emptyIndex = game.abilities.selectedIndex; const savedAbility = game.abilities.slots[emptyIndex].abilityId; game.abilities.slots[emptyIndex].abilityId = null;
  canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); await delay(100);
  assert(game.effects.particleCount === 0 && game.abilities.selectedAbility === undefined, 'Empty mouse cast creates no effects and stays safe');
  game.abilities.slots[emptyIndex].abilityId = savedAbility;
  const triangles: number[] = [];
  for (const preset of ['LOW', 'MEDIUM', 'MAX'] as const) {
    game.settings.setPreset(preset); await delay(650);
    const config = game.settings.config;
    assert(game.world.atmosphere.count === config.particles && game.renderer.renderer.getPixelRatio() === Math.min(devicePixelRatio, config.pixelRatio) && game.renderer.renderer.shadowMap.enabled === config.shadows, `${preset}: particles, resolution and shadows applied`);
    triangles.push(game.renderer.renderer.info.render.triangles);
  }
  assert(triangles[0] < triangles[1] && triangles[1] < triangles[2], 'Quality changes real rendered geometry');
  key('KeyP', true); await delay(60); key('KeyP', false); await delay(120);
  assert(!game.hud.performance.visible, 'Performance HUD toggle');
  key('F3', true); await delay(60); key('F3', false); await delay(120);
  assert(!root.querySelector<HTMLElement>('.debug-panel')!.hidden, 'F3 debug overlay');
  canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 2, movementY: -10000 })); await delay(150);
  assert(game.targeting.getGroundTarget() === null && game.targeting.targetPoint.distanceTo(game.player.position) <= 180.001, 'Sky aim rejects ground and caps range');
  canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 2, movementY: 10000 })); await delay(150);
  assert(game.camera.pitch <= 1.12 && game.camera.pitch >= -0.35, 'Camera pitch clamp');
  const renderer = game.renderer.renderer;
  game.dispose();
  assert(!root.querySelector('canvas') && renderer.info.memory.geometries === 0, 'Disposal removes canvas and releases geometry');
  report.textContent += `\n\n${failures.length === 0 ? 'ALL BROWSER CHECKS PASSED' : `${failures.length} CHECKS FAILED`}\nTriangles LOW / MED / MAX: ${triangles.join(' / ')}`;
} catch (error) { assert(false, error instanceof Error ? error.message : String(error)); game.dispose(); }
