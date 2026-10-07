import '../src/styles/game.css';
import { Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { GlacialEruptionEffect } from '../src/abilities/ice/GlacialEruptionEffect';
import { IceResources } from '../src/abilities/ice/IceResources';

const root = document.querySelector<HTMLElement>('#app')!;
const report = document.createElement('pre'); report.id = 'acceptance-report';
report.style.cssText = 'position:fixed;left:25px;top:140px;max-height:70vh;overflow:auto;background:#06121ef5;color:#aecbdd;padding:18px;font:11px/1.5 monospace;z-index:30'; root.append(report);
const results: string[] = []; const failures: string[] = [];
const assert = (condition: boolean, name: string): void => { (condition ? results : failures).push(name); report.textContent = [...results.map(item => `PASS ${item}`), ...failures.map(item => `FAIL ${item}`)].join('\n'); };
window.addEventListener('error', event => assert(false, event.message));
window.addEventListener('unhandledrejection', event => assert(false, String(event.reason)));
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const key = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true })); };
const game = new Game(root); game.start();
const resources = new IceResources();
const scene = game.sceneManager.scene; const renderer = game.renderer.renderer;
const context = (): AbilityCastContext => ({ player: game.player, scene, camera: game.camera.camera,
  origin: game.player.visual.getRightHandWorldPosition(), direction: game.targeting.aimDirection.clone(), targetPoint: game.targeting.targetPoint.clone(), groundTarget: game.targeting.getGroundTarget()?.clone() ?? null,
  playerForward: game.player.getForward().clone(), cameraForward: game.targeting.aimDirection.clone(), targeting: game.targeting, effectManager: game.effects, quality: game.settings, time: 0, cameraFeedback: game.camera.addFeedback });
const counters = () => ({ children: scene.children.length, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0, calls: renderer.info.render.calls });
try {
  await game.player.visual.ready; await delay(600);
  assert(game.player.visual.loaded && game.player.visual.loadError === null, 'Local GLB loads, with no remote runtime model');
  assert(game.player.visual.animationState === 'Idle', 'Idle animation');
  const hand = game.player.visual.getRightHandWorldPosition(); const chest = game.player.visual.getChestWorldPosition();
  assert(hand.distanceTo(chest) > 0.2 && hand.y > 0.5 && hand.y < 1.7, 'Real hand and chest bone attachments');
  key('KeyW', true); await delay(500); assert(game.player.visual.animationState === 'Walk', 'W movement uses Walk animation');
  key('ShiftLeft', true); await delay(500); assert(game.player.visual.animationState === 'Run' && game.player.velocity.length() > 7, 'Shift sprint uses Run animation');
  key('KeyW', false); key('ShiftLeft', false); await delay(650);
  assert(game.player.visual.animationState === 'Idle' && game.player.velocity.length() < 0.1, 'Deceleration returns to Idle');
  const beforeDirection = game.targeting.aimDirection.clone();
  renderer.domElement.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 2, movementX: 60, movementY: 10 })); await delay(250);
  assert(game.targeting.aimDirection.distanceTo(beforeDirection) > 0.05 && game.targeting.hasGroundTarget, 'Camera orbit and shared ground targeting');
  key('KeyF', true); await delay(80); key('KeyF', false);
  assert(game.abilities.selectedAbility === undefined && !game.abilities.cast(context()), 'Other slots remain safely empty');
  key('KeyQ', true); await delay(80); key('KeyQ', false);
  assert(game.abilities.selectedAbility?.id === 'glacial-eruption', 'Q still selects Glacial Eruption');
  const beforeCast = game.effects.activeCount;
  renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); await delay(120);
  assert(game.effects.activeCount === beforeCast + 1, 'Left mouse casts through existing input manager');
  assert(game.abilities.getCooldown(0) > 2 && !game.abilities.cast(context()), '2.5 second cooldown rejects recast');
  await delay(850);
  assert(game.effects.particleCount > 0 && game.effects.instanceCount > 0, 'Eruption emits snow, instanced crystals, mist and shards');
  assert(!!root.querySelector('.ability-slot.on-cooldown'), 'HUD shows cooldown progress');
  await delay(4500);
  assert(game.effects.activeCount === 0 && !scene.getObjectByName('Glacial Eruption'), 'Real-time effect expires and removes its root');
  for (const quality of ['LOW', 'MEDIUM', 'MAX'] as const) {
    game.settings.setPreset(quality); await delay(100);
    const effect = new GlacialEruptionEffect(context(), new Vector3(game.player.position.x, 0, game.player.position.z - 10), resources, 1831);
    effect.update(0.65, 0.65); game.renderer.render();
    const matrix = effect.spikes.mesh.instanceMatrix.array; const growing = matrix[5];
    effect.update(0.5, 1.15); game.renderer.render();
    assert(effect.spikes.mesh.instanceMatrix.array[5] !== growing, `${quality}: crystals grow and settle, rather than teleporting`);
    const spikes = quality === 'LOW' ? 6 : quality === 'MEDIUM' ? 10 : 16;
    const shards = quality === 'LOW' ? 20 : quality === 'MEDIUM' ? 42 : 84;
    const snow = quality === 'LOW' ? 80 : quality === 'MEDIUM' ? 210 : 420;
    assert(effect.spikes.mesh.count === spikes && effect.shards.mesh.count === shards && effect.snow.count === snow, `${quality}: ${spikes} crystals / ${shards} shards / ${snow} snow`);
    game.settings.setPreset(quality === 'LOW' ? 'MAX' : 'LOW');
    assert(effect.snow.count === (quality === 'LOW' ? 420 : 80), 'Live quality change affects an already active spell');
    assert(effect.root.children.some(object => object.type === 'PointLight'), 'Temporary point light exists during eruption');
    effect.update(2.5, 3.65);
    assert(!effect.shards.mesh.visible && !effect.mist.mesh.visible && !effect.root.children.some(object => object.type === 'PointLight'), 'Shards, mist and point light stop after burst');
    assert(!effect.update(2, 5.65), 'Five second lifetime ends'); effect.dispose();
    await delay(100);
  }
  game.settings.setPreset('MEDIUM'); await delay(200);
  // Warm every shared geometry and shader variant before comparing memory counters.
  game.abilities.update(3); assert(game.abilities.cast(context()), 'Warm-up cast');
  game.effects.update(1.15, 0); game.renderer.render(); game.effects.update(5.1, 0); game.abilities.update(3); await delay(100);
  const baseline = counters();
  for (let i = 0; i < 20; i++) {
    game.abilities.update(2.6); assert(game.abilities.cast(context()), `Repeated cast ${i + 1}`);
    game.effects.update(0.75, 0); game.renderer.render();
    game.effects.update(5.1, 0); await delay(20);
    if (i === 9 || i === 19) {
      const after = counters();
      assert(after.children === baseline.children && after.geometries === baseline.geometries && after.textures === baseline.textures && game.effects.activeCount === 0, `${i + 1} casts return scene and GPU memory to baseline`);
    }
  }
  game.abilities.update(3); const accepted = game.abilities.cast(context()); let rejected = 0;
  for (let i = 0; i < 40; i++) if (!game.abilities.cast(context())) rejected++;
  assert(accepted && rejected === 40 && game.effects.activeCount === 1, '40 rapid requests are rejected during cooldown');
  game.effects.update(5.1, 0); await delay(100);
  assert(counters().children === baseline.children && counters().geometries === baseline.geometries && counters().textures === baseline.textures, 'Rapid cast stress returns to baseline');
  report.textContent += `\n\nBASELINE ${JSON.stringify(baseline)}\nFINAL ${JSON.stringify(counters())}\n${failures.length ? `${failures.length} FAILURES` : 'ALL PHASE 02 BROWSER CHECKS PASSED'}`;
} catch (error) { assert(false, error instanceof Error ? error.stack ?? error.message : String(error)); }
finally { game.dispose(); resources.dispose(); }
