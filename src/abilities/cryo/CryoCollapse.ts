import type {Ability,AbilityCastContext} from '../Ability';
import {groundTarget} from '../elemental/ElementalVisuals';
import {CRYO} from './CryoCollapseConfig';
import {CryoCollapseEffect} from './CryoCollapseEffect';
export class CryoCollapse implements Ability{
  readonly id='cryo-collapse';readonly name='CRYO COLLAPSE';readonly subtitle='ABSOLUTE ZERO';readonly element='ICE / FROST / CRYOMANCY';readonly color='#b6efff';readonly icon='cryo-collapse';readonly cooldown=CRYO.cooldown;
  cast(context:AbilityCastContext):boolean{if(![context.origin.x,context.origin.y,context.origin.z].every(Number.isFinite))return false;const target=groundTarget(context,CRYO.range);if(!target)return false;context.effectManager.add(new CryoCollapseEffect(context,target));return true;}
}
