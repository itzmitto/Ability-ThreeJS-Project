import type { Ability, AbilityCastContext } from "../Ability";
import { ABYSSAL } from "./AbyssalFlameConfig";
import { resolveFireTarget } from "./resolveFireTarget";
import { FireResources } from "./FireResources";
import { AbyssalFlameEffect } from "./AbyssalFlameEffect";
export class AbyssalFlame implements Ability {
  readonly id = "abyssal-flame";
  readonly name = "ABYSSAL FLAME";
  readonly element = "BLACK FIRE";
  readonly color = "#df365a";
  readonly icon = "♨";
  readonly cooldown = ABYSSAL.cooldown;
  private readonly resources = new FireResources();
  private seed = 82731;
  cast(c: AbilityCastContext): boolean {
    const target = resolveFireTarget(c.player.position, c.groundTarget);
    if (!target) return false;
    const v = this.resources.pool.acquire();
    if (!v) return false;
    this.seed = (this.seed + 7919) >>> 0;
    c.effectManager.add(
      new AbyssalFlameEffect(c, this.resources, v, target, this.seed),
    );
    return true;
  }
  dispose(): void {
    this.resources.dispose();
  }
}
