import type { Ability,AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { WORLDROOT } from './WorldrootConfig';
import { WorldrootEffect } from './WorldrootEffect';
export class Worldroot implements Ability {
  readonly id='worldroot';readonly name='WORLDROOT';readonly subtitle='VERDANT CATACLYSM';readonly element='NATURE / ROOT / THORN / LIFE MAGIC';readonly color='#86bb72';readonly icon='worldroot';readonly cooldown = WORLDROOT.cooldown; readonly range = WORLDROOT.range;
  cast(context:AbilityCastContext):boolean{const target=groundTarget(context,WORLDROOT.range);if(!target)return false;context.effectManager.add(new WorldrootEffect(context,target));return true;}
}
