import { Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { QualityConfig } from '../../quality/QualityPreset';
import type { EffectManager } from '../../effects/EffectManager';
export const bendingTier = (q: Readonly<QualityConfig>): number => Math.max(0, Math.min(2, q.waterDetail - 1));
export const ease = (v: number): number => { const t = Math.max(0, Math.min(1, v)); return t*t*(3-2*t); };
export const seed = (i: number): number => { const x = Math.sin(i*127.1+31.7)*43758.5453; return x-Math.floor(x); };
/** Only these new effects share this admission bound; the existing effect manager is unchanged. */
const leases = new WeakMap<EffectManager, number>();
export function acquireBending(manager: EffectManager): (() => void) | null {
  const n = leases.get(manager) ?? 0; if (n >= 3) return null;
  leases.set(manager, n+1); let alive = true;
  return () => { if (alive) { alive = false; leases.set(manager, Math.max(0, (leases.get(manager) ?? 1)-1)); } };
}
export function bendingTarget(c: AbilityCastContext, range: number): Vector3 | null {
  if (![c.origin.x,c.origin.y,c.origin.z].every(Number.isFinite)) return null;
  const p = c.player.position, source = c.groundTarget ?? c.targetPoint;
  const target = new Vector3();
  if (source && [source.x,source.y,source.z].every(Number.isFinite)) target.copy(source);
  else { if (!c.cameraForward.toArray().every(Number.isFinite) || c.cameraForward.lengthSq()<1e-8) return null; target.copy(p).addScaledVector(c.cameraForward.clone().normalize(), range); }
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
  if (d < .35) return null;
  if (d>range) { target.x=p.x+dx*range/d; target.z=p.z+dz*range/d; }
  target.y=c.water?.getSurfaceHeight(target.x,target.z) ?? target.y;
  return target;
}
