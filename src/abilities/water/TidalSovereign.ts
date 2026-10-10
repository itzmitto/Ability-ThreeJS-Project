import type { Ability, AbilityCastContext } from '../Ability';
import { groundTarget } from '../elemental/ElementalVisuals';
import { TIDAL } from './TidalSovereignConfig';
import { TidalSovereignEffect } from './TidalSovereignEffect';
export class TidalSovereign implements Ability {
  readonly id = 'tidal-sovereign'; readonly name = 'TIDAL SOVEREIGN'; readonly subtitle = "LEVIATHAN'S WRATH"; readonly element = 'WATER / OCEAN MAGIC'; readonly color = '#58d8ec'; readonly icon = 'tidal-sovereign'; readonly cooldown = TIDAL.cooldown; readonly range = TIDAL.range;
  cast(context: AbilityCastContext): boolean { const target = groundTarget(context, TIDAL.range); if (!target) return false; context.effectManager.add(new TidalSovereignEffect(context, target)); return true; }
}
