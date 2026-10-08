import { Vector3 } from "three";
import { ABYSSAL } from "./AbyssalFlameConfig";
export function resolveFireTarget(
  player: Readonly<Vector3>,
  ground: Readonly<Vector3> | null,
  out = new Vector3(),
): Vector3 | null {
  if (
    !ground ||
    ![player.x, player.y, player.z, ground.x, ground.y, ground.z].every(
      Number.isFinite,
    )
  )
    return null;
  out
    .set(ground.x - player.x, 0, ground.z - player.z)
    .clampLength(0, ABYSSAL.range)
    .add(player);
  out.y = 0;
  return out;
}
