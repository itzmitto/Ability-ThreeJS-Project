import type { Ability,AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { GRAVITY_CRUSH } from './GravityCrushConfig';
import { GravityCrushEffect } from './GravityCrushEffect';
export class GravityCrush implements Ability {
  readonly id='gravity-crush';readonly name='GRAVITY CRUSH';readonly subtitle='PLANETARY COLLAPSE';readonly element='GRAVITY / COSMIC FORCE';readonly color='#a18ae4';readonly icon='gravity-crush';readonly cooldown=GRAVITY_CRUSH.cooldown;
  cast(context:AbilityCastContext):boolean{const target=groundTarget(context,GRAVITY_CRUSH.range);if(!target)return false;context.effectManager.add(new GravityCrushEffect(context,target));return true;}
}
