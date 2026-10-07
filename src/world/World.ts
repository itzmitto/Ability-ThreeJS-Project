import type { Scene, Vector3 } from 'three';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import { DarkWater } from './DarkWater';
import { Atmosphere } from './Atmosphere';
import { Environment } from './Environment';

export class World {
  readonly water: DarkWater;
  readonly atmosphere: Atmosphere;
  readonly environment: Environment;
  constructor(scene: Scene, quality: GraphicsSettings) {
    this.water = new DarkWater(scene, quality);
    this.atmosphere = new Atmosphere(scene, quality);
    this.environment = new Environment(scene, quality);
  }
  update(time: number, position: Vector3): void { this.water.update(time, position); this.atmosphere.update(time, position); this.environment.update(time, position); }
  dispose(): void { this.water.dispose(); this.atmosphere.dispose(); this.environment.dispose(); }
}
