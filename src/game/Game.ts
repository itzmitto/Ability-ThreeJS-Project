import { Vector3 } from 'three';
import { SceneManager } from './SceneManager';
import { RendererManager } from './RendererManager';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import { PerformanceManager } from './PerformanceManager';
import { GraphicsSettings } from '../quality/GraphicsSettings';
import { World } from '../world/World';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { TargetingSystem } from '../targeting/TargetingSystem';
import { AbilityManager } from '../abilities/AbilityManager';
import type { AbilityCastContext } from '../abilities/Ability';
import { EffectManager } from '../effects/EffectManager';
import { HUD } from '../ui/HUD';
import { GlacialEruption } from '../abilities/ice/GlacialEruption';

/** Composition root only: systems own their logic, resources, and subscriptions. */
export class Game {
  readonly settings = new GraphicsSettings();
  readonly sceneManager = new SceneManager();
  readonly player = new Player(this.sceneManager.scene);
  readonly abilities = new AbilityManager();
  readonly effects = new EffectManager();
  readonly performance = new PerformanceManager();
  readonly renderer: RendererManager;
  readonly input: InputManager;
  readonly camera: CameraController;
  readonly world: World;
  readonly targeting: TargetingSystem;
  readonly hud: HUD;
  private readonly playerController: PlayerController;
  private elapsed = 0;
  private previousTime = 0;
  private raf = 0;
  private running = false;
  private uiElapsed = 0;
  constructor(root: HTMLElement) {
    const canvas = document.createElement('canvas');
    this.input = new InputManager(canvas);
    this.camera = new CameraController(this.input, this.settings, this.player.position);
    this.renderer = new RendererManager(root, this.sceneManager.scene, this.camera.camera, this.settings, canvas);
    this.playerController = new PlayerController(this.player, this.input);
    this.world = new World(this.sceneManager.scene, this.settings);
    this.targeting = new TargetingSystem(this.sceneManager.scene);
    const glacial = new GlacialEruption();
    this.abilities.registry.register(glacial);
    this.abilities.assignSlot(0, glacial.id);
    this.hud = new HUD(root, this.abilities, this.settings, this.targeting);
    document.addEventListener('visibilitychange', this.visibilityChanged);
  }
  start(): void { if (this.running) return; this.running = true; this.previousTime = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  private frame = (now: number): void => {
    if (!this.running) return;
    const rawDelta = (now - this.previousTime) / 1000;
    const delta = Math.min(rawDelta, 0.05);
    this.previousTime = now; this.elapsed += delta;
    this.playerController.update(delta, this.camera.yaw);
    this.camera.update(delta, this.player.position);
    this.targeting.update(this.camera.camera, this.player.position);
    this.abilities.update(delta);
    this.abilities.handleInput(this.input, this.makeCastContext);
    this.effects.update(delta, this.elapsed);
    this.world.update(this.elapsed, this.player.position);
    if (this.input.wasPressed('F3')) this.hud.toggleDebug();
    if (this.input.wasPressed('KeyP')) { this.hud.performance.toggle(); this.hud.graphics.syncPerformance(this.hud.performance.visible); }
    if (this.input.wasPressed('KeyT')) { this.targeting.markerEnabled = !this.targeting.markerEnabled; this.hud.graphics.syncGroundMarker(this.targeting.markerEnabled); }
    this.uiElapsed += delta;
    if (this.uiElapsed >= 0.1) {
      this.hud.update(this.input.pointerLocked);
      this.hud.updateDebug(this.player, this.camera, this.targeting);
      this.uiElapsed = 0;
    }
    this.renderer.render();
    if (this.performance.sample(rawDelta, this.renderer.renderer, this.world.atmosphere.count + this.effects.particleCount, this.effects.instanceCount)) this.hud.performance.update(this.performance.stats);
    this.input.endFrame();
    this.raf = requestAnimationFrame(this.frame);
  };
  private makeCastContext = (): AbilityCastContext => ({
    player: this.player, scene: this.sceneManager.scene, camera: this.camera.camera,
    origin: this.player.visual.getRightHandWorldPosition(),
    direction: this.targeting.aimDirection.clone(), playerForward: this.player.getForward().clone(),
    cameraForward: this.camera.camera.getWorldDirection(new Vector3()), targetPoint: this.targeting.targetPoint.clone(),
    groundTarget: this.targeting.getGroundTarget()?.clone() ?? null,
    targeting: this.targeting, effectManager: this.effects, quality: this.settings, time: this.elapsed,
    cameraFeedback: this.camera.addFeedback,
  });
  private visibilityChanged = (): void => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden && this.running) { this.previousTime = performance.now(); this.performance.reset(); this.raf = requestAnimationFrame(this.frame); }
  };
  dispose(): void {
    this.running = false; cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    this.hud.dispose(); this.effects.dispose(); this.abilities.dispose(); this.targeting.dispose();
    this.player.dispose(); this.world.dispose(); this.camera.dispose(); this.input.dispose();
    this.renderer.dispose(); this.settings.dispose(); this.sceneManager.dispose();
  }
}
