import '../src/styles/game.css';
import { Vector3 } from 'three';
import { Game } from '../src/game/Game';
import { SpectralResourcePool } from '../src/abilities/spectral/SpectralResourcePool';
import { SpectralBreakEffect } from '../src/abilities/spectral/SpectralBreakEffect';
import { spectralStage } from '../src/abilities/spectral/SpectralTimeline';
const root = document.querySelector<HTMLElement>('#app')!, game = new Game(root), resources = new SpectralResourcePool(), query = new URLSearchParams(location.search);
game.abilities.select(8); game.settings.setPreset('MAX'); game.start();
let age = Number(query.get('age') ?? 2.2), range = Number(query.get('range') ?? 40), playing = false, effect: SpectralBreakEffect | undefined;
const controls = document.createElement('div'); controls.className = 'spectral-review'; controls.style.cssText = 'position:fixed;left:24px;bottom:172px;display:flex;flex-wrap:wrap;gap:5px;max-width:1080px;z-index:30';
const status = document.createElement('span'); status.id = 'stage-status'; status.style.cssText = 'font:11px monospace;color:#83e8ff;padding:7px';
const summary = () => { status.textContent = `${effect?.age.toFixed(2) ?? age}s / ${spectralStage(effect?.age ?? age)} / ${range}m / ${game.settings.preset}`; };
const context = () => { const origin = game.player.visual.getRightHandWorldPosition(), target = new Vector3(0, .05, -range); return { player: game.player, scene: game.sceneManager.scene, camera: game.camera.camera, origin, direction: target.clone().sub(origin).normalize(), groundTarget: target, targetPoint: target, playerForward: game.player.getForward().clone(), cameraForward: game.targeting.aimDirection.clone(), targeting: game.targeting, effectManager: game.effects, quality: game.settings, time: 0, water: game.world.water.interactions }; };
function stage() { effect?.dispose(); const c = context(); effect = new SpectralBreakEffect(c, resources, resources.pool.acquire()!, c.groundTarget); effect.update(age, 0); game.world.update(age, game.player.position); game.renderer.render(); summary(); }
function button(label: string, fn: () => void) { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'background:#061627e8;border:1px solid #32607a;color:#c4e8f5;border-radius:3px;padding:7px 9px'; b.onclick = () => { fn(); summary(); b.blur(); }; controls.append(b); }
for (const [label, t] of [['Charge', .4], ['Compression', .9], ['Release', 1.09], ['Growth', 1.3], ['Traveling front', 1.5], ['Sustain', 2.2], ['Turbulence', 2.8], ['Overload', 3.5], ['Impact', 4.2], ['Collapse', 5.2], ['Aftermath', 6.5], ['Fade', 8.5]] as const) button(label, () => { playing = false; age = t; stage(); });
for (const q of ['MAX', 'MEDIUM', 'LOW'] as const) button(q, () => { game.settings.setPreset(q); effect?.update(0, 0); game.renderer.render(); });
for (const d of [8, 25, 40, 85]) button(`${d}m`, () => { range = d; playing = false; stage(); });
button('Normal view', () => { game.camera.yaw = 0; game.camera.pitch = .19; game.camera.update(0, game.player.position, true); game.renderer.render(); });
button('Side view', () => { game.camera.camera.position.set(range * .8 + 8, 10, -range * .5); game.camera.camera.lookAt(0, 2, -range * .5); game.camera.camera.updateMatrixWorld(); game.renderer.render(); cameraOverride = true; });
button('Diagonal view', () => { game.camera.camera.position.set(18, 9, 9); game.camera.camera.lookAt(0, 1, -range * .35); game.camera.camera.updateMatrixWorld(); game.renderer.render(); cameraOverride = true; });
button('Low view', () => { game.camera.yaw = .18; game.camera.pitch = .025; game.camera.update(0, game.player.position, true); game.renderer.render(); });
button('Target view', () => { game.camera.camera.position.set(12, 7, -range - 9); game.camera.camera.lookAt(0, 1, -range * .7); game.camera.camera.updateMatrixWorld(); game.renderer.render(); cameraOverride = true; });
button('Play sequence', () => { age = 0; stage(); playbackRate = 1; playing = true; });
button('Slow motion', () => { age = 0; stage(); playbackRate = .3; playing = true; });
button('Animate stage', () => { playbackRate = .15; playing = true; });
button('Gameplay', () => { effect?.dispose(); effect = undefined; playing = false; controls.hidden = true; game.camera.yaw = 0; game.camera.pitch = .19; cameraOverride = false; });
let cameraOverride = false, playbackRate = 1;
// Optional camera presets retain a real side view rather than moving the caster.
const updateCamera = game.camera.update.bind(game.camera); game.camera.update = (dt, p, snap) => { if (!cameraOverride || snap) { if (snap) cameraOverride = false; updateCamera(dt, p, snap); } };
game.effects.add({ get particleCount() { return effect?.particleCount ?? 0; }, get instanceCount() { return effect?.instanceCount ?? 0; }, update: (dt, time) => { if (effect && !effect.update(playing ? dt * playbackRate : 0, time)) { effect.dispose(); effect = undefined; playing = false; } if (playing) summary(); return true; }, dispose: () => effect?.dispose() });
controls.append(status); root.append(controls); if (query.has('capture')) controls.hidden = true;
await game.player.visual.ready; stage();
window.addEventListener('pagehide', () => { game.dispose(); resources.dispose(); });
