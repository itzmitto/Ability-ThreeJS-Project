import '../src/styles/game.css';
import { Mesh, PointLight, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { SpectralBreakEffect } from '../src/abilities/spectral/SpectralBreakEffect';
import { SpectralResourcePool } from '../src/abilities/spectral/SpectralResourcePool';
import { resolveSpectralTarget } from '../src/abilities/spectral/resolveSpectralTarget';
import { spectralStage } from '../src/abilities/spectral/SpectralTimeline';
import type { QualityPreset } from '../src/quality/QualityPreset';
const root = document.querySelector<HTMLElement>('#app')!, report = document.createElement('pre'); report.id = 'acceptance-report'; report.style.cssText = 'position:fixed;left:16px;top:145px;max-height:54vh;max-width:94vw;overflow:auto;background:#041524f2;color:#b7eafa;font:11px/1.4 monospace;padding:14px;z-index:30'; root.append(report);
const lines: string[] = [], failures: string[] = [], profiles: unknown[] = []; let measured = '';
const assert = (ok: boolean, label: string) => { lines.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) failures.push(label); report.textContent = lines.join('\n') + measured; };
window.addEventListener('error', e => assert(false, e.message)); window.addEventListener('unhandledrejection', e => assert(false, String(e.reason)));
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
function context(g: Game, distance = 40): AbilityCastContext { const target = new Vector3(g.player.position.x, 0, g.player.position.z - distance); return { player: g.player, scene: g.sceneManager.scene, camera: g.camera.camera, origin: g.player.visual.getRightHandWorldPosition(), direction: g.targeting.aimDirection.clone(), groundTarget: target, targetPoint: target, playerForward: g.player.getForward().clone(), cameraForward: g.targeting.aimDirection.clone(), targeting: g.targeting, effectManager: g.effects, quality: g.settings, time: 0, water: g.world.water.interactions, cameraFeedback: g.camera.addFeedback }; }
const key = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
function counters(g: Game) { let objects = 0, lights = 0; g.sceneManager.scene.traverse(o => { objects++; if (o instanceof PointLight) lights++; }); const r = g.renderer.renderer; return { children: g.sceneManager.scene.children.length, objects, lights, subscriptions: g.settings.subscriberCount, active: g.effects.activeCount, ripples: g.world.water.interactions.activeCount, geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length ?? 0, calls: r.info.render.calls }; }
function finish(g: Game) { g.effects.update(30, 0); g.world.water.interactions.update(100); g.renderer.render(); }
function cast(g: Game, slot: number) { g.abilities.select(slot); g.abilities.update(30); return g.abilities.cast(context(g)); }
function stages(g: Game) { let previous = 0; for (const t of [.5, 1.3, 2.2, 4.2, 5.2, 6.5, 9.1, 13, 18.5]) { g.effects.update(t - previous, t); g.world.update(t, g.player.position); g.renderer.render(); previous = t; } finish(g); }
const summary = (values: number[]) => { values.sort((a, b) => a - b); return { frames: values.length, medianMs: Number((values[Math.floor(values.length * .5)] ?? 0).toFixed(2)), p95Ms: Number((values[Math.floor(values.length * .95)] ?? 0).toFixed(2)) }; };
let game: Game | undefined;
try {
  game = new Game(root); game.start(); await game.player.visual.ready; await delay(250);
  assert(game.player.visual.loaded && game.player.visual.animationState === 'Idle', 'Local Rocketbox model and Idle');
  key('KeyN', true); await delay(100); key('KeyN', false); assert(game.abilities.selectedIndex === 8, 'N selects ninth spell');
  assert(!!root.querySelector('[aria-label="N: SPECTRAL BREAK"] svg'), 'Original spectral SVG icon');
  game.renderer.renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); await delay(160);
  assert(game.effects.activeCount === 1 && game.abilities.getCooldown(8) > 9.7, 'Left click casts, charge runs and ten-second cooldown');
  key('Digit9', true); await delay(90); key('Digit9', false); assert(game.abilities.selectedIndex === 8, '9 aliases N');
  key('KeyW', true); await delay(400); assert(game.player.visual.animationState === 'Walk', 'Walking during charge'); key('ShiftLeft', true); await delay(500); assert(game.player.visual.animationState === 'Run', 'Sprint during release');
  game.settings.setPreset('MAX'); key('KeyW', false); key('ShiftLeft', false);
  for (let turn = 0; turn < 12; turn++) { game.renderer.renderer.domElement.dispatchEvent(new MouseEvent('mousemove', { buttons: 2, movementX: turn % 2 ? 80 : -75, movementY: turn % 2 ? 15 : -14, bubbles: true })); await delay(16); } await delay(50); assert(Number.isFinite(game.camera.yaw) && game.effects.activeCount === 1, 'Camera moves during sustained beam');
  key('F3', true); await delay(100); key('F3', false); assert(!!root.querySelector('.debug-panel:not([hidden])'), 'F3 debug'); key('KeyP', true); await delay(100); key('KeyP', false); assert(!!root.querySelector('.performance-panel'), 'Telemetry preserved');
  game.dispose();
  game = new Game(root); await game.player.visual.ready; game.camera.update(0, game.player.position, true); const g = game;
  assert(g.abilities.slots.filter(s => s.abilityId).length === 9, 'Exactly nine registered spells');
  assert(Math.abs(resolveSpectralTarget(new Vector3(), null, new Vector3(0, 1, -1))!.length() - 85) < 1e-6, 'Forward sky aiming and 85 m clamp');
  const pool = new SpectralResourcePool(); const subscribers = g.settings.subscriberCount;
  for (const preset of ['MAX', 'MEDIUM', 'LOW'] as const) {    
g.settings.setPreset(preset); const c = context(g), v = pool.pool.acquire()!, e = new SpectralBreakEffect(c, pool, v, resolveSpectralTarget(c.origin, c.groundTarget, c.direction)!);
    for (const age of [.4, .9, 1.09, 1.3, 1.6, 2.2, 2.8, 3.5, 4.2, 5.2, 6.5, 8.5]) {      
e.update(age - e.age, age); g.world.update(age, g.player.position); g.renderer.render(); let finite = true; v.root.traverse(o => { finite &&= [...o.position.toArray(), ...o.quaternion.toArray()].every(Number.isFinite); if (o instanceof Mesh) finite &&= Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite); }); assert(finite, `${preset} ${spectralStage(age)} finite geometry/transforms`);
      if (age === .4) assert(v.charge.root.position.distanceTo(g.player.visual.getRightHandWorldPosition()) < 1e-6, 'Charge anchored to actual animated hand');
      if (age === .9 || age === 2.2 || age === 4.2 || age === 6.5) { const target = e.target.clone(); g.settings.setPreset(age === .9 || age === 6.5 ? 'MAX' : age === 2.2 ? 'MEDIUM' : 'LOW'); e.update(0, age); assert(e.age === age && e.target.equals(target), 'Live quality preserves age and target'); }
    }
    assert(!e.update(.6, 9.1), 'Nine-second completion'); e.dispose(); e.dispose(); assert(g.settings.subscriberCount === subscribers && v.lights.lights.every(l => !l.parent) && v.root.parent === null, 'Idempotent root/light/subscription cleanup');
  }
  pool.dispose(); finish(g);
  // Warm every production spell, tier and lifetime before checking retained GPU caches.
  for (const q of ['LOW', 'MEDIUM', 'MAX'] as const) { g.settings.setPreset(q); for (let i = 0; i < 9; i++) { assert(cast(g, i), 'Warm ' + g.abilities.selectedAbility?.id + ' ' + q); stages(g); await delay(0); } }
  g.settings.setPreset('MEDIUM'); for (let i = 0; i < 9; i++) { cast(g, i); stages(g); }
  // Representative concurrent light variants are also part of the retained cache baseline.
  for (let warm = 0; warm < 2; warm++) { cast(g, 7); cast(g, 4); cast(g, 8); stages(g); }
  g.world.water.spray.emit(g.player.position, 0, 2); g.world.water.spray.update(0); g.renderer.render(); g.world.water.spray.update(1); finish(g);
  const baseline = counters(g);
  const stable = (label: string) => { const now = counters(g); const ok = (['children', 'objects', 'lights', 'subscriptions', 'active', 'ripples', 'geometries', 'textures', 'programs'] as const).every(k => now[k] === baseline[k]); if (!ok) profiles.push({ label, baseline, now }); assert(ok, label); };
  for (let i = 0; i < 20; i++) { assert(cast(g, 8), 'Isolated spectral cast ' + (i + 1)); stages(g); await delay(0); } stable('20 isolated casts restore warmed cache baseline');
  for (const count of [20, 40]) { for (let i = 0; i < count; i++) { assert(cast(g, i % 9), count + ' alternating cast ' + (i + 1) + ' ' + g.abilities.selectedAbility?.id); stages(g); await delay(0); } stable(count + ' alternating all-nine casts restore warmed cache baseline'); }
  assert(cast(g, 8), 'Cooldown stress initial cast'); let blocked = 0; for (let i = 0; i < 100; i++)if (!g.abilities.cast(context(g))) blocked++; assert(blocked === 100 && g.effects.activeCount === 1, '100 cooldown attempts reject without allocation'); stages(g); stable('Cooldown stress restores baseline');
  // Concurrent blood, fire and spectral: release owns only its own disturbances.
  cast(g, 7); cast(g, 4); cast(g, 8); g.effects.update(4.2, 4.2); g.world.update(4.2, g.player.position); g.renderer.render(); assert(g.effects.activeCount === 3, 'Blood, fire and spectral coexist'); finish(g); assert(g.effects.activeCount === 0 && g.world.water.interactions.activeCount === 0, 'Concurrent spells expire independently'); stable('Repeated concurrent casts retain warmed resources');
  const owner = {}, water = g.world.water.interactions; water.addRipple({ position: new Vector3(20, 0, 0), strength: .1, duration: 30, waveSpeed: 1 }, owner); const c = context(g), r = new SpectralResourcePool(), v = r.pool.acquire()!, e = new SpectralBreakEffect(c, r, v, resolveSpectralTarget(c.origin, c.groundTarget, c.direction)!); e.update(4.2, 4.2); e.dispose(); assert(water.activeCount === 1, 'Spectral disposal preserves other water owner'); water.removeOwner(owner); r.dispose();
  // Real browser RAF profiles, no simulation speedup. Measure idle and every phase at each preset.
  g.start(); await delay(250);
  for (const preset of ['LOW', 'MEDIUM', 'MAX'] as QualityPreset[]) {    
g.settings.setPreset(preset); finish(g); await delay(150); const sample = new Map<string, number[]>(); let previous = performance.now(); for (let i = 0; i < 30; i++) { await new Promise<void>(r => requestAnimationFrame(() => r())); const now = performance.now(); if (!sample.has('IDLE')) sample.set('IDLE', []); sample.get('IDLE')!.push(now - previous); previous = now; }
    assert(cast(g, 8), preset + ' real-time cast'); const start = performance.now(); previous = start; let peakCalls = 0, peakTriangles = 0, peakParticles = 0, peakInstances = 0;
    while (performance.now() - start < 9500) { await new Promise<void>(r => requestAnimationFrame(() => r())); const now = performance.now(), stage = spectralStage((now - start) / 1000); if (!sample.has(stage)) sample.set(stage, []); sample.get(stage)!.push(now - previous); previous = now; const info = g.renderer.renderer.info; peakCalls = Math.max(peakCalls, info.render.calls); peakTriangles = Math.max(peakTriangles, info.render.triangles); peakParticles = Math.max(peakParticles, g.effects.particleCount); peakInstances = Math.max(peakInstances, g.effects.instanceCount); }
    assert(g.effects.activeCount === 0, preset + ' real-time expiry'); profiles.push({ preset, viewport: [innerWidth, innerHeight], renderSize: [g.renderer.renderer.domElement.width, g.renderer.renderer.domElement.height], peakCalls, peakTriangles, peakParticles, peakInstances, stages: Array.from(sample, ([stage, frames]) => ({ stage, ...summary(frames) })), resources: counters(g) });
  }
  g.settings.setPreset('MEDIUM'); finish(g); stable('All realtime profiles return warmed cache baseline');
  measured = '\nPROFILES ' + JSON.stringify(profiles) + '\nBASELINE ' + JSON.stringify(baseline) + '\nFINAL ' + JSON.stringify(counters(g));
  g.dispose(); assert(g.renderer.renderer.info.memory.geometries === 0 && g.renderer.renderer.info.memory.textures === 0 && g.settings.subscriberCount === 0, 'Full game disposal releases GPU geometry/textures/subscriptions');
  for (const age of [.5, 2.2, 4.2, 6.5]) { const active = new Game(root); await active.player.visual.ready; assert(active.player.visual.loaded, 'Active-disposal model loads for ' + spectralStage(age)); active.camera.update(0, active.player.position, true); cast(active, 8); active.effects.update(age, age); active.world.update(age, active.player.position); active.renderer.render(); active.dispose(); assert(active.renderer.renderer.info.memory.geometries === 0 && active.renderer.renderer.info.memory.textures === 0 && active.settings.subscriberCount === 0, 'Active game disposal during ' + spectralStage(age)); }
} catch (error) { assert(false, error instanceof Error ? error.message : String(error)); game?.dispose(); }
measured += '\n' + (failures.length ? failures.length + ' CHECKS FAILED' : 'ALL PHASE 10 BROWSER CHECKS PASSED'); report.textContent = lines.join('\n') + measured;
const download = document.createElement('button'); download.textContent = 'Download report'; download.style.cssText = 'position:fixed;top:110px;left:16px;z-index:40'; download.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([report.textContent ?? ''], { type: 'text/plain' })); a.download = 'phase10-browser-report.txt'; a.click(); URL.revokeObjectURL(a.href); }; root.append(download);
