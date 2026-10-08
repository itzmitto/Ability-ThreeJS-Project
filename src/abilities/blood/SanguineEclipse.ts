import type { Ability, AbilityCastContext } from "../Ability";
import { SANGUINE } from "./SanguineEclipseConfig";
import { resolveBloodTarget } from "./resolveBloodTarget";
import { BloodResourceManager } from "./BloodResourceManager";
import { SanguineEclipseEffect } from "./SanguineEclipseEffect";
export class SanguineEclipse implements Ability {
  readonly id = "sanguine-eclipse";
  readonly name = "SANGUINE ECLIPSE";
  readonly subtitle = "CRIMSON DOMINION";
  readonly element = "BLOOD / HEMOMANCY";
  readonly color = "#b63250";
  readonly icon = "blood-eclipse";
  readonly cooldown = SANGUINE.cooldown;
  readonly resources = new BloodResourceManager();
  cast(context: AbilityCastContext): boolean {
    const target = resolveBloodTarget(
      context.player.position,
      context.groundTarget,
    );
    if (!target) return false;
    const v = this.resources.pool.acquire();
    if (!v) return false;
    context.effectManager.add(
      new SanguineEclipseEffect(context, this.resources, v, target),
    );
    return true;
  }
  dispose(): void {
    this.resources.dispose();
  }
}
