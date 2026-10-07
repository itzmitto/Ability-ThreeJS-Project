import { Vector3 } from "three";
import { TEMPEST } from "./windConfig";

const finite = (v: Readonly<Vector3>): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
/** Uses the existing crosshair hit. Sky aiming safely falls back to camera direction. */
export function resolveWindTarget(
  origin: Readonly<Vector3>,
  ground: Readonly<Vector3> | null,
  target: Readonly<Vector3>,
  direction: Readonly<Vector3>,
  result = new Vector3(),
): Vector3 | null {
  if (!finite(origin)) return null;
  if (ground && finite(ground))
    result.copy(ground).y = Math.max(0.6, ground.y + 0.6);
  else if (finite(direction) && direction.lengthSq() > 0.00001)
    result
      .copy(direction)
      .normalize()
      .multiplyScalar(TEMPEST.range)
      .add(origin);
  else if (finite(target)) result.copy(target);
  else return null;
  result.sub(origin);
  if (result.lengthSq() < 0.01) return null;
  result.clampLength(0.1, TEMPEST.range).add(origin);
  return finite(result) ? result : null;
}
