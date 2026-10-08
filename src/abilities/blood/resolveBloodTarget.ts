import { Vector3 } from "three";
import { SANGUINE } from "./SanguineEclipseConfig";
export function resolveBloodTarget(
  origin: Readonly<Vector3>,
  hit: Readonly<Vector3> | null,
): Vector3 | null {
  if (
    !hit ||
    ![origin.x, origin.y, origin.z, hit.x, hit.y, hit.z].every(Number.isFinite)
  )
    return null;
  const dx = hit.x - origin.x,
    dz = hit.z - origin.z,
    length = Math.hypot(dx, dz),
    scale = length > SANGUINE.range ? SANGUINE.range / length : 1;
  return new Vector3(origin.x + dx * scale, 0, origin.z + dz * scale);
}
