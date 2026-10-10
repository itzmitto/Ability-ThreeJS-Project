import { Vector3 } from 'three';
import type { Ability, AbilityCastContext } from '../Ability';
import { COMET_CAST, COMET_DEFAULTS, validateCometConfig, type CometConfig } from './EmberCometConfig';
import { createCometResources, disposeCometResources, type CometResources } from './EmberCometGeometry';
import { EmberCometEffect } from './EmberCometEffect';

export function emberCometTarget(ctx: AbilityCastContext): Vector3 | null {
  if (!ctx.origin.toArray().every(Number.isFinite)) return null;
  const target = new Vector3(), source = ctx.groundTarget ?? ctx.targetPoint;
  if (source && source.toArray().every(Number.isFinite)) target.copy(source);
  else {
    const d = ctx.cameraForward; if (!d.toArray().every(Number.isFinite) || d.lengthSq() < 1e-8) return null;
    target.copy(ctx.origin).addScaledVector(d.clone().normalize(), COMET_CAST.range);
  }
  target.y = ctx.water?.getSurfaceHeight(target.x, target.z) ?? target.y;
  const d = target.clone().sub(ctx.origin), distance = d.length();
  if (!Number.isFinite(distance) || distance < .25) return null;
  if (distance > COMET_CAST.range) target.copy(ctx.origin).addScaledVector(d.normalize(), COMET_CAST.range);
  return target;
}
export class EmberComet implements Ability {
  readonly id = 'ember-comet'; readonly name = 'EMBER COMET'; readonly subtitle = 'INFERNAL CORE'; readonly element = 'FIRE / MAGMA';
  readonly icon = 'ember-comet'; readonly color = '#ffad45'; readonly cooldown = COMET_CAST.cooldown; readonly range = COMET_CAST.range;
  readonly tags = ['ember', 'comet', 'fire', 'infernal', 'magma', 'projectile'];
  private readonly controls = { ...COMET_DEFAULTS }; private resources?: CometResources; private readonly pool: EmberCometEffect[] = [];
  get config(): Readonly<CometConfig> { return this.controls; }
  get activeCount(): number { return this.pool.filter(e => e.active).length; }
  configure(patch: Partial<CometConfig>): void { if (this.activeCount) throw new Error('Ember Comet tuning applies between casts'); Object.assign(this.controls, validateCometConfig(patch, this.controls)); }
  cast(ctx: AbilityCastContext): boolean {
    const target = emberCometTarget(ctx); if (!target || this.activeCount >= COMET_CAST.maximumActive) return false;
    this.resources ??= createCometResources(); let effect = this.pool.find(e => !e.active);
    if (!effect) { effect = new EmberCometEffect(ctx, this.resources, this.controls); this.pool.push(effect); }
    ctx.player.visual.beginRightHandCast(.55, .65); effect.activate(ctx, target); ctx.effectManager.add(effect); return true;
  }
  dispose(): void { this.pool.forEach(e => e.destroy()); this.pool.length = 0; if (this.resources) disposeCometResources(this.resources); this.resources = undefined; }
}
