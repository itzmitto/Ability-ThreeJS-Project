import { Object3D, PointLight, Vector3 } from "three";
import type { Scene } from "three";
/** Bounded reusable analytic light inputs, independent of any spell identity. */
export class WaterLightingResponse {
  readonly positions = new Float32Array(12 * 4);
  readonly colors = new Float32Array(12 * 4);
  private count = 0;
  private limit = 12;
  private readonly p = new Vector3();
  private readonly visit = (o: Object3D): void => {
    if (
      !(o instanceof PointLight) ||
      !o.visible ||
      o.intensity <= 0 ||
      this.count >= this.limit
    )
      return;
    let parent = o.parent;
    while (parent) {
      if (!parent.visible) return;
      parent = parent.parent;
    }
    o.getWorldPosition(this.p);
    const k = this.count++ * 4;
    this.positions[k] = this.p.x;
    this.positions[k + 1] = this.p.y;
    this.positions[k + 2] = this.p.z;
    this.positions[k + 3] = o.distance || 80;
    this.colors[k] = o.color.r;
    this.colors[k + 1] = o.color.g;
    this.colors[k + 2] = o.color.b;
    this.colors[k + 3] = Math.min(300, o.intensity);
  };
  update(scene: Scene, limit: number): number {
    this.count = 0;
    this.limit = limit;
    this.positions.fill(0);
    this.colors.fill(0);
    scene.traverse(this.visit);
    return this.count;
  }
}
