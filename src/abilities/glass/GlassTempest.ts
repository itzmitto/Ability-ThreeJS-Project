import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { GLASS_TEMPEST } from './GlassTempestConfig';
import { GlassTempestEffect } from './GlassTempestEffect';
export class GlassTempest implements Ability {
  readonly id='glass-tempest';readonly name='GLASS TEMPEST';readonly subtitle='DESERT SOVEREIGN';readonly element='SAND / GLASS / STORM MAGIC';readonly color='#ddbc77';readonly icon='glass-tempest';readonly cooldown=GLASS_TEMPEST.cooldown;
  cast(context:AbilityCastContext):boolean{const target=groundTarget(context,GLASS_TEMPEST.range);if(!target)return false;context.effectManager.add(new GlassTempestEffect(context,target));return true;}
}
