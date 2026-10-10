import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { EARTHBREAKER } from './EarthbreakerConfig';
import { EarthbreakerEffect } from './EarthbreakerEffect';
export class Earthbreaker implements Ability {
  readonly id = 'earthbreaker'; readonly name = 'EARTHBREAKER'; readonly subtitle = 'TITANFALL'; readonly element = 'EARTH / OBSIDIAN'; readonly color = '#e8af4b'; readonly icon = 'earthbreaker'; readonly cooldown = EARTHBREAKER.cooldown; readonly range = EARTHBREAKER.range;
  cast(context: AbilityCastContext): boolean { const target = groundTarget(context, EARTHBREAKER.range); if (!target) return false; context.effectManager.add(new EarthbreakerEffect(context, target)); return true; }
}
