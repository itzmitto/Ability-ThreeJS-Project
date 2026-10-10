import type {Ability,AbilityCastContext} from '../Ability';
import {groundTarget} from '../elemental/ElementalVisuals';
import {CHRONO_FRACTURE} from './ChronoFractureConfig';
import {ChronoFractureEffect} from './ChronoFractureEffect';
export class ChronoFracture implements Ability{
  readonly id='chrono-fracture';readonly name='CHRONO FRACTURE';readonly subtitle='HOUR OF RUIN';readonly element='TIME / CHRONOMANCY';readonly color='#d5d6ae';readonly icon='chrono-fracture';readonly cooldown = CHRONO_FRACTURE.cooldown; readonly range = CHRONO_FRACTURE.range;
  cast(context:AbilityCastContext):boolean{if(![context.origin.x,context.origin.y,context.origin.z].every(Number.isFinite))return false;const target=groundTarget(context,CHRONO_FRACTURE.range);if(!target)return false;context.effectManager.add(new ChronoFractureEffect(context,target));return true;}
}
