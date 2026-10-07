import '../src/styles/game.css';
import { Vector3 } from 'three';
import { Game } from '../src/game/Game';
import { GlacialEruptionEffect } from '../src/abilities/ice/GlacialEruptionEffect';
import { IceResources } from '../src/abilities/ice/IceResources';
import type { QualityPreset } from '../src/quality/QualityPreset';

// Development-only static timeline viewer, omitted from the production entry.
const root = document.querySelector<HTMLElement>('#app')!;
const game = new Game(root); game.start();
const resources = new IceResources(); let effect: GlacialEruptionEffect | undefined;
game.effects.add({ get particleCount() { return effect?.particleCount ?? 0; }, get instanceCount() { return effect?.instanceCount ?? 0; }, update: () => true, dispose: () => effect?.dispose() });
let age = 1.15;
const controls = document.createElement('div'); controls.style.cssText = 'position:fixed;left:40px;top:160px;display:flex;gap:6px;z-index:30';
const stage = (): void => {
  effect?.dispose();
  const target = new Vector3(0, 0, -10);
  effect = new GlacialEruptionEffect({ player: game.player, scene: game.sceneManager.scene, camera: game.camera.camera,
    origin: game.player.visual.getRightHandWorldPosition(), direction: game.targeting.aimDirection.clone(), targetPoint: target.clone(), groundTarget: target.clone(),
    playerForward: game.player.getForward().clone(), cameraForward: game.targeting.aimDirection.clone(), targeting: game.targeting,
    effectManager: game.effects, quality: game.settings, time: 0 }, target, resources, 9832);
  effect.update(age, age);
};
for (const time of [0.15, 0.38, 0.65, 1.15, 2.8, 4.1]) {
  const button = document.createElement('button'); button.textContent = `${time}s`;
  button.onclick = () => { age = time; stage(); button.blur(); }; controls.append(button);
}
for (const quality of ['LOW', 'MEDIUM', 'MAX'] as QualityPreset[]) {
  const button = document.createElement('button'); button.textContent = `${quality} spell`;
  button.onclick = () => { game.settings.setPreset(quality); stage(); button.blur(); }; controls.append(button);
}
controls.hidden = new URLSearchParams(location.search).has('capture');
root.append(controls); await game.player.visual.ready; stage();
window.addEventListener('pagehide', () => { effect?.dispose(); game.dispose(); resources.dispose(); });
