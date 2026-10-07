import { Plane, Vector3 } from 'three';
import type { Ray } from 'three';

/** Analytic intersection with the walkable y=0 surface; cosmetic waves don't affect gameplay. */
export class GroundRaycaster {
  private readonly plane = new Plane(new Vector3(0, 1, 0), 0);
  intersect(ray: Ray, playerOrigin: Vector3, maximum: number, result: Vector3): boolean {
    const hit = ray.intersectPlane(this.plane, result);
    return hit !== null && hit.distanceToSquared(playerOrigin) <= maximum * maximum;
  }
}
