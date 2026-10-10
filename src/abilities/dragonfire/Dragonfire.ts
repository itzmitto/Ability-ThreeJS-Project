import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { DRAGONFIRE } from './DragonfireConfig';
import { DragonfireEffect } from './DragonfireEffect';
export class Dragonfire implements Ability {
  readonly id='dragonfire';readonly name='DRAGONFIRE';readonly subtitle='SCORCHING TORRENT';readonly element='FIRE';readonly color='#ef8a36';readonly icon='dragonfire';readonly cooldown = DRAGONFIRE.cooldown; readonly range = DRAGONFIRE.range;
  cast(context:AbilityCastContext):boolean {
    if(![context.origin.x,context.origin.y,context.origin.z].every(Number.isFinite))return false;
    const target=groundTarget(context,DRAGONFIRE.range);if(!target)return false;
    context.effectManager.add(new DragonfireEffect(context,target));return true;
  }
}
