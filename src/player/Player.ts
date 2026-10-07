import { Group, Vector3 } from 'three';
import type { Scene } from 'three';
import { PlayerVisual } from './PlayerVisual';

export class Player {
  readonly object = new Group();
  readonly velocity = new Vector3();
  readonly visual = new PlayerVisual();
  private readonly forward = new Vector3();
  constructor(scene: Scene) { this.object.add(this.visual.root); scene.add(this.object); }
  get position(): Vector3 { return this.object.position; }
  getForward(): Vector3 { return this.forward.set(0, 0, -1).applyQuaternion(this.object.quaternion); }
  dispose(): void { this.visual.dispose(); this.object.removeFromParent(); }
}
