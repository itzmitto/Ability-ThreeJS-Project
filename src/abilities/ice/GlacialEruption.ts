import type { Ability, AbilityCastContext } from '../Ability';
import { GLACIAL_CONFIG } from './iceConfig';
import { IceResources } from './IceResources';
import { GlacialEruptionEffect } from './GlacialEruptionEffect';
import { resolveGlacialTarget } from './resolveGlacialTarget';

export class GlacialEruption implements Ability {
  readonly id = 'glacial-eruption';
  readonly name = 'GLACIAL ERUPTION';
  readonly element = 'ICE';
  readonly color = '#9cecff';
  readonly icon = '❄';
  readonly cooldown = GLACIAL_CONFIG.cooldown; readonly range = GLACIAL_CONFIG.range;
  private readonly resources = new IceResources();
  private seed = 8127;
  cast(context: AbilityCastContext): boolean {
    const target = resolveGlacialTarget(context.player.position, context.groundTarget);
    if (!target) return false;
    context.effectManager.add(new GlacialEruptionEffect(context, target, this.resources, ++this.seed));
    return true;
  }
  dispose(): void { this.resources.dispose(); }
}
