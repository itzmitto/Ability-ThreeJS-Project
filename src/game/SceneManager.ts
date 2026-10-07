import { Color, FogExp2, Scene } from 'three';
import { GAME_CONFIG } from './config';

export class SceneManager {
  readonly scene = new Scene();
  constructor() {
    this.scene.background = new Color('#03060d');
    this.scene.fog = new FogExp2('#040913', GAME_CONFIG.world.fogDensity);
  }
  dispose(): void { this.scene.clear(); }
}
