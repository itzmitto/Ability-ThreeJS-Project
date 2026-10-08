import type { Scene, Vector3 } from 'three';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import { DarkWater } from './DarkWater';
import { Atmosphere } from './Atmosphere';
import { Environment } from './Environment';
import type { Player } from '../player/Player';

export class World {
  readonly water: DarkWater;
  readonly atmosphere: Atmosphere;
  readonly environment: Environment;
  constructor(scene: Scene, quality: GraphicsSettings) {
    this.water = new DarkWater(scene, quality);
    this.atmosphere = new Atmosphere(scene, quality);
    this.environment = new Environment(scene, quality);
  }
  update(time: number, position: Vector3, player?:Player): void { this.water.update(time, position, player); this.atmosphere.update(time, position); this.environment.update(time, position); }
  dispose(): void { this.water.dispose(); this.atmosphere.dispose(); this.environment.dispose(); }
}
