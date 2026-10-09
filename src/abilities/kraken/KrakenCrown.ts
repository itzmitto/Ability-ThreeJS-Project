import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { KRAKEN } from './KrakenConfig';
import { KrakenCrownEffect } from './KrakenCrownEffect';
export class KrakenCrown implements Ability {
  readonly id='kraken-crown';readonly name='KRAKEN CROWN';readonly subtitle='ABYSSAL ONSLAUGHT';readonly element='ABYSSAL / DEEP SEA';readonly color='#5baeb3';readonly icon='kraken-crown';readonly cooldown=KRAKEN.cooldown;
  cast(context:AbilityCastContext):boolean {
    if(![context.origin.x,context.origin.y,context.origin.z].every(Number.isFinite))return false;
    const target=groundTarget(context,KRAKEN.range);if(!target)return false;
    context.effectManager.add(new KrakenCrownEffect(context,target));return true;
  }
}
