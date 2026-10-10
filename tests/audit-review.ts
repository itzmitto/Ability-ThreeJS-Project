import '../src/styles/game.css';
import { Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
const root = document.querySelector<HTMLElement>('#app')!, game = new Game(root), query = new URLSearchParams(location.search);
let index = Number(query.get('slot') ?? 22), age = Number(query.get('age') ?? 3), range = Number(query.get('range') ?? 28), playing = false, clock = 0, previous = performance.now();
const panel = document.createElement('div');
panel.id = 'review-controls';
panel.style.cssText = 'position:fixed;left:24px;top:110px;display:flex;flex-wrap:wrap;gap:5px;max-width:90vw;z-index:40;color:#bbd3e5;font:12px monospace';
const select = document.createElement('select');
select.setAttribute('aria-label', 'Review ability');
game.abilities.slots.forEach((s, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = game.abilities.registry.get(s.abilityId)?.name ?? 'EMPTY'; select.append(option); });
select.value = String(index);
panel.append(select);
const status = document.createElement('span');
status.id = 'review-status';
const context = (): AbilityCastContext => { const target = new Vector3(0, 0, -range); return { player: game.player, scene: game.sceneManager.scene, camera: game.camera.camera, origin: game.player.visual.getRightHandWorldPosition(), direction: target.clone().sub(game.player.visual.getRightHandWorldPosition()).normalize(), targetPoint: target, groundTarget: target, playerForward: game.player.getForward().clone(), cameraForward: game.targeting.aimDirection.clone(), targeting: game.targeting, effectManager: game.effects, quality: game.settings, time: clock, water: game.world.water.interactions, cameraFeedback: game.camera.addFeedback }; };
const stage = () => { game.effects.update(120, clock); game.abilities.update(120); game.abilities.select(index); game.abilities.cast(context()); for (let t = 0; t < age;) {
    const dt = Math.min(.025, age - t);
    game.player.visual.update(0, 0, dt);
    game.effects.update(dt, clock + t);
    t += dt;
} game.hud.update(false); status.textContent = `${game.abilities.selectedAbility?.name} · ${age.toFixed(2)}s · ${range}m`; };
select.onchange = () => { index = Number(select.value); playing = false; stage(); select.blur(); };
const button = (name: string, action: () => void) => { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { action(); b.blur(); }; panel.append(b); };
for (const t of [.2, .6, 1.5, 2.8, 4.2, 5.8, 7.9, 9.8, 10.5, 13.5, 15.8])
    button(`${t}s`, () => { age = t; playing = false; stage(); });
button('Play', () => { age = 0; stage(); playing = true; });
button('Normal camera', () => { game.camera.yaw = 0; game.camera.pitch = .33; game.camera.update(0, game.player.position, true); });
button('Low camera', () => { game.camera.yaw = 0; game.camera.pitch = .02; game.camera.update(0, game.player.position, true); });
button('Side camera', () => { game.camera.yaw = .5; game.camera.pitch = .13; game.player.position.x = range * .35; game.camera.update(0, game.player.position, true); });
button('Close range', () => { range = 10; game.player.position.set(0, 0, 0); stage(); });
button('Medium range', () => { range = 28; game.player.position.set(0, 0, 0); stage(); });
button('Far range', () => { range = 55; game.player.position.set(0, 0, 0); stage(); });
button('Hide review controls', () => panel.hidden = true);
panel.append(status);
root.append(panel);
panel.hidden = query.has('capture');
await game.player.visual.ready;
game.settings.setPreset((query.get('quality') ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'MAX');
if (query.has('low'))
    game.camera.pitch = .02;
game.camera.update(0, game.player.position, true);
stage();
if (query.has('side')) {
    game.player.position.x = range * .6;
    game.camera.yaw = Math.atan(.6);
    game.camera.pitch = .1;
    game.camera.update(0, game.player.position, true);
}
let raf = 0;
const frame = (now: number) => { const dt = Math.min(.05, (now - previous) / 1000); previous = now; clock += dt; game.player.visual.update(0, 0, playing ? dt : 0); if (playing) {
    age += dt;
    game.effects.update(dt, clock);
    status.textContent = `${game.abilities.selectedAbility?.name} · ${age.toFixed(2)}s`;
    if (!game.effects.activeCount)
        playing = false;
} game.world.update(clock, game.player.position); game.renderer.render(); raf = requestAnimationFrame(frame); };
raf = requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); game.dispose(); });
