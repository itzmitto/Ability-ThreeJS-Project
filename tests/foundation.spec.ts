import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Ray, Scene, Vector3 } from 'three';
import { Player } from '../src/player/Player';
import { PlayerController } from '../src/player/PlayerController';
import { GroundRaycaster } from '../src/targeting/GroundRaycaster';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { Ability, AbilityCastContext } from '../src/abilities/Ability';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { EffectManager } from '../src/effects/EffectManager';
import { ObjectPool } from '../src/effects/ObjectPool';

test('movement is camera relative, diagonals normalize, and integration is frame-rate independent', () => {
  const simulate = (fps: number, held: string[], yaw = 0) => {
    const player = new Player(new Scene());
    const controller = new PlayerController(player, { isHeld: code => held.includes(code) });
    for (let i = 0; i < fps * 2; i++) controller.update(1 / fps, yaw);
    const position = player.position.clone(); player.dispose(); return position;
  };
  const straight = simulate(60, ['KeyW']);
  expect(straight.z).toBeLessThan(-8);
  expect(simulate(30, ['KeyW']).distanceTo(straight)).toBeLessThan(0.00001);
  expect(simulate(144, ['KeyW']).distanceTo(straight)).toBeLessThan(0.00001);
  expect(simulate(60, ['KeyW', 'KeyD']).length()).toBeCloseTo(straight.length(), 8);
  const rotated = simulate(60, ['KeyW'], Math.PI / 2);
  expect(rotated.x).toBeCloseTo(straight.z, 8);
  expect(Math.abs(rotated.z)).toBeLessThan(0.00001);
  expect(simulate(60, ['KeyW', 'ShiftLeft']).length()).toBeGreaterThan(straight.length());
});

test('deceleration settles without drift and natural turn takes the shortest path', () => {
  const player = new Player(new Scene());
  let moving = true;
  const controller = new PlayerController(player, { isHeld: code => moving && code === 'KeyW' });
  player.object.rotation.y = Math.PI * 2 - 0.1;
  controller.update(1 / 60, 0);
  expect(player.object.rotation.y).toBeGreaterThan(Math.PI * 2 - 0.1);
  for (let i = 0; i < 60; i++) controller.update(1 / 60, 0);
  moving = false;
  for (let i = 0; i < 120; i++) controller.update(1 / 60, 0);
  expect(player.velocity.length()).toBeLessThan(0.00001);
  player.dispose();
});

test('ground ray rejects sky and out-of-range hits', () => {
  const ground = new GroundRaycaster();
  const out = new Vector3(); const origin = new Vector3();
  expect(ground.intersect(new Ray(new Vector3(0, 2, 5), new Vector3(0, -0.2, -1).normalize()), origin, 180, out)).toBe(true);
  expect(out.y).toBe(0);
  expect(ground.intersect(new Ray(new Vector3(0, 2, 5), new Vector3(0, 1, 0)), origin, 180, out)).toBe(false);
  expect(ground.intersect(new Ray(new Vector3(0, 2, 5), new Vector3(0, -0.001, -1).normalize()), origin, 180, out)).toBe(false);
});

test('camera targeting returns a capped forward point for sky aim', () => {
  const scene = new Scene(); const targeting = new TargetingSystem(scene);
  const camera = new PerspectiveCamera(52, 16 / 9, 0.1, 3000);
  camera.position.set(0, 3, 6); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
  const playerPosition = new Vector3();
  targeting.update(camera, playerPosition);
  expect(targeting.getGroundTarget()?.y).toBe(0);
  camera.lookAt(0, 20, -30); camera.updateMatrixWorld(); targeting.update(camera, playerPosition);
  expect(targeting.getGroundTarget()).toBeNull();
  expect(targeting.getTargetPoint().distanceTo(playerPosition)).toBeCloseTo(180, 6);
  expect(targeting.getAimDirection().length()).toBeCloseTo(1, 8);
  targeting.dispose();
});

test('empty casting is safe; future abilities select and respect cooldowns', () => {
  const manager = new AbilityManager(); const scene = new Scene(); const player = new Player(scene);
  const targeting = new TargetingSystem(scene); const effects = new EffectManager(); const quality = new GraphicsSettings();
  const context: AbilityCastContext = { player, scene, camera: new PerspectiveCamera(), origin: new Vector3(), direction: new Vector3(0, 0, -1), playerForward: new Vector3(), cameraForward: new Vector3(), targetPoint: new Vector3(), groundTarget: null, targeting, effectManager: effects, quality, time: 0 };
  expect(manager.cast(context)).toBe(false);
  let casts = 0; let selected = 0; let deselected = 0;
  const ability: Ability = { id: 'test-only', name: 'test', element: 'test', color: '#ffffff', cooldown: 2, select: () => selected++, deselect: () => deselected++, cast: () => { casts++; } };
  manager.registry.register(ability); manager.assignSlot(1, ability.id); manager.select(1);
  expect(selected).toBe(1); expect(manager.cast(context)).toBe(true); expect(manager.cast(context)).toBe(false);
  manager.update(1); expect(manager.getCooldown(1)).toBe(1);
  manager.update(1); expect(manager.cast(context)).toBe(true); expect(casts).toBe(2);
  manager.select(5); expect(deselected).toBe(1); expect(manager.cast(context)).toBe(false);
  manager.dispose(); targeting.dispose(); effects.dispose(); quality.dispose(); player.dispose();
});

test('graphics changes notify consumers and effect/pool lifecycles dispose once', () => {
  const quality = new GraphicsSettings(); let notifications = 0;
  const unsubscribe = quality.subscribe(() => notifications++);
  quality.setPreset('LOW'); const low = quality.config;
  quality.setPreset('MAX'); const max = quality.config;
  expect(notifications).toBe(3); expect(max.particles).toBeGreaterThan(low.particles);
  expect(max.waterDetail).toBeGreaterThan(low.waterDetail); expect(max.pixelRatio).toBeGreaterThan(low.pixelRatio);
  expect(low.bloom).toBe(0); expect(low.shadows).toBe(false);
  unsubscribe(); quality.dispose();
  const manager = new EffectManager(); let disposed = 0; let updates = 0;
  for (let i = 0; i < 3; i++) manager.add({ particleCount: 10, instanceCount: 2, update: () => { updates++; return false; }, dispose: () => disposed++ });
  expect(manager.particleCount).toBe(30); expect(manager.instanceCount).toBe(6);
  manager.update(1 / 60, 1); expect(updates).toBe(3); expect(disposed).toBe(3); expect(manager.particleCount).toBe(0);
  manager.dispose(); expect(disposed).toBe(3);
  let resets = 0; let destroyed = 0;
  const pool = new ObjectPool(() => ({ value: 0 }), value => { value.value = 0; resets++; }, () => destroyed++, 1);
  const item = pool.acquire()!; expect(pool.acquire()).toBeNull(); pool.release(item); pool.release(item);
  expect(resets).toBe(1); expect(pool.acquire()).toBe(item); pool.dispose(); expect(destroyed).toBe(1);
});
