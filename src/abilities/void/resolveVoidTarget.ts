import { Vector3 } from "three";
import { WORLDREND } from "./WorldrendConfig";
export function resolveVoidTarget(
  player: Vector3,
  ground: Vector3 | null,
  out = new Vector3(),
): Vector3 | null {
  if (
    !ground ||
    ![player.x, player.y, player.z, ground.x, ground.y, ground.z].every(
      Number.isFinite,
    )
  )
    return null;
  out.set(ground.x - player.x, 0, ground.z - player.z);
  if (out.lengthSq() > WORLDREND.range ** 2) out.setLength(WORLDREND.range);
  out.add(player);
  out.y = 0;
  return out;
}
