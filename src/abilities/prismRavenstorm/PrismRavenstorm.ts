import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { PRISM_RAVENSTORM } from './PrismRavenstormConfig';
import { PrismRavenstormEffect } from './PrismRavenstormEffect';
export class PrismRavenstorm implements Ability {
  readonly id='prism-ravenstorm';readonly name='PRISM RAVENSTORM';readonly subtitle='CHROMATIC ONSLAUGHT';readonly element='CRYSTAL / PRISM / RAINBOW BARRAGE';readonly color='#c5bae9';readonly icon='prism-ravenstorm';readonly cooldown = PRISM_RAVENSTORM.cooldown; readonly range = PRISM_RAVENSTORM.range;
  cast(context:AbilityCastContext):boolean {
    if(![context.origin.x,context.origin.y,context.origin.z].every(Number.isFinite))return false;
    const target=groundTarget(context,PRISM_RAVENSTORM.range);if(!target)return false;
    context.effectManager.add(new PrismRavenstormEffect(context,target));return true;
  }
}
