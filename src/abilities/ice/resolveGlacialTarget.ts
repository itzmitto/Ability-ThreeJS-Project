import { Vector3 } from 'three';
import { GLACIAL_CONFIG } from './iceConfig';

export function resolveGlacialTarget(player: Readonly<Vector3>, ground: Readonly<Vector3> | null): Vector3 | null {
  if (!ground || ![ground.x, ground.y, ground.z, player.x, player.z].every(Number.isFinite)) return null;
  const target = new Vector3(ground.x - player.x, 0, ground.z - player.z);
  if (target.lengthSq() > GLACIAL_CONFIG.range ** 2) target.setLength(GLACIAL_CONFIG.range);
  target.x += player.x; target.z += player.z; return target;
}
