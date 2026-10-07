import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { InputManager } from './InputManager';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import { GAME_CONFIG } from './config';

export class CameraController {
  readonly camera = new PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 3500);
  yaw = 0;
  pitch: number = GAME_CONFIG.camera.pitch;
  private readonly focus = new Vector3();
  private readonly offset = new Vector3();
  private distance: number = GAME_CONFIG.camera.distance;
  constructor(private readonly input: InputManager, private readonly quality: GraphicsSettings, position: Vector3) {
    this.focus.copy(position).y += GAME_CONFIG.camera.height;
    this.update(0, position, true);
    window.addEventListener('resize', this.resize);
  }
  update(delta: number, position: Vector3, snap = false): void {
    const config = GAME_CONFIG.camera;
    this.yaw -= this.input.mouseX * config.sensitivity * this.quality.mouseSensitivity;
    this.pitch = MathUtils.clamp(this.pitch + this.input.mouseY * config.sensitivity * this.quality.mouseSensitivity, config.minPitch, config.maxPitch);
    const blend = snap ? 1 : 1 - Math.exp(-config.damping * delta);
    this.offset.copy(position).y += config.height;
    this.focus.lerp(this.offset, blend);
    this.distance = MathUtils.lerp(this.distance, this.input.aiming ? config.aimDistance : config.distance, blend);
    this.offset.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.offset.multiplyScalar(this.distance).add(this.focus);
    this.offset.y = Math.max(0.3, this.offset.y);
    this.camera.position.lerp(this.offset, blend);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
  }
  private resize = (): void => { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); };
  dispose(): void { window.removeEventListener('resize', this.resize); }
}
