import type { Ability, AbilityCastContext } from "../Ability";
import { TEMPEST } from "./windConfig";
import { resolveWindTarget } from "./resolveWindTarget";
import { WindResources } from "./WindResources";
import { TempestBreakEffect } from "./TempestBreakEffect";

export class TempestBreak implements Ability {
  readonly id = "tempest-break";
  readonly name = "TEMPEST BREAK";
  readonly element = "AIR";
  readonly color = "#c3dfe4";
  readonly icon = "≋";
  readonly cooldown = TEMPEST.cooldown;
  private readonly resources = new WindResources();
  cast(context: AbilityCastContext): boolean {
    const target = resolveWindTarget(
      context.origin,
      context.groundTarget,
      context.targetPoint,
      context.direction,
    );
    if (!target) return false;
    const visuals = this.resources.pool.acquire();
    if (!visuals) return false;
    context.effectManager.add(
      new TempestBreakEffect(context, this.resources, visuals, target),
    );
    return true;
  }
  dispose(): void {
    this.resources.dispose();
  }
}
