import { MathUtils, Vector3 } from 'three';
import type { InputManager } from '../game/InputManager';
import { GAME_CONFIG } from '../game/config';
import type { Player } from './Player';

export class PlayerController {
  private readonly desired = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private gaitTime = 0;
  constructor(private readonly player: Player, private readonly input: Pick<InputManager, 'isHeld'>) {}
  update(delta: number, cameraYaw: number): void {
    const x = Number(this.input.isHeld('KeyD')) - Number(this.input.isHeld('KeyA'));
    const z = Number(this.input.isHeld('KeyS')) - Number(this.input.isHeld('KeyW'));
    this.desired.set(x, 0, z).normalize();
    const moving = this.desired.lengthSq() > 0;
    const sprint = this.input.isHeld('ShiftLeft') || this.input.isHeld('ShiftRight');
    const config = GAME_CONFIG.player;
    this.desired.applyAxisAngle(this.up, cameraYaw).multiplyScalar(sprint ? config.sprintSpeed : config.walkSpeed);
    // Exact integration of exponential acceleration keeps displacement stable across frame rates.
    const rate = moving ? config.acceleration : config.deceleration;
    const decay = Math.exp(-rate * delta);
    this.player.position.addScaledVector(this.desired, delta);
    this.player.position.addScaledVector(this.player.velocity, (1 - decay) / rate);
    this.player.position.addScaledVector(this.desired, -(1 - decay) / rate);
    this.player.velocity.lerp(this.desired, 1 - decay);
    if (moving) {
      const angle = Math.atan2(-this.desired.x, -this.desired.z);
      const difference = Math.atan2(Math.sin(angle - this.player.object.rotation.y), Math.cos(angle - this.player.object.rotation.y));
      this.player.object.rotation.y += difference * (1 - Math.exp(-config.turnSpeed * delta));
    }
    const speed = this.player.velocity.length();
    this.gaitTime += speed * delta * 1.65;
    this.player.visual.update(this.gaitTime, speed, delta, sprint);
    this.player.position.x = MathUtils.clamp(this.player.position.x, -2400, 2400);
    this.player.position.z = MathUtils.clamp(this.player.position.z, -2400, 2400);
  }
}
