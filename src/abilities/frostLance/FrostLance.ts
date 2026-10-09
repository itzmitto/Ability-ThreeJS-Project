import { Vector3 } from 'three';
import type { Ability, AbilityCastContext } from '../Ability';
import { FROST_LANCE, MAX_ACTIVE_CASTS } from './FrostLanceConfig';
import { FrostLanceEffect } from './FrostLanceEffect';
/** Ground-anchored line, as in the donor Ability.spawn; hand origin remains available to other spells. */
export function frostLanceTarget(context: AbilityCastContext): {
    origin: Vector3;
    direction: Vector3;
    length: number;
} | null {
    const p = context.player.position, target = context.groundTarget;
    if (!target || ![p.x, p.z, target.x, target.y, target.z].every(Number.isFinite))
        return null;
    const origin = new Vector3(p.x, 0, p.z), direction = new Vector3(target.x - p.x, 0, target.z - p.z);
    const distance = direction.length();
    if (!Number.isFinite(distance) || distance < FROST_LANCE.minRange)
        return null;
    const length = Math.min(FROST_LANCE.range, distance);
    return { origin, direction: direction.normalize(), length };
}
export class FrostLance implements Ability {
    readonly id = 'frost-lance';
    readonly name = 'FROST LANCE';
    readonly subtitle = 'ORIGINAL GLACIAL ERUPTION';
    readonly element = 'ICE / GLACIAL CRYSTAL';
    readonly color = '#a9e4ff';
    readonly icon = 'frost-lance';
    readonly cooldown = FROST_LANCE.cooldown;
    private active = new Set<FrostLanceEffect>();
    private readonly pool: FrostLanceEffect[] = [];
    get activeCount(): number { return this.active.size; }
    cast(context: AbilityCastContext): boolean {
        const target = frostLanceTarget(context);
        if (!target || this.active.size >= MAX_ACTIVE_CASTS)
            return false;
        let effect = this.pool.find(e => !e.active);
        if (effect)
            effect.activate(context, target.origin, target.direction, target.length);
        else {
            const created = new FrostLanceEffect(context, target.origin, target.direction, target.length, () => this.active.delete(created));
            this.pool.push(created);
            effect = created;
        }
        this.active.add(effect);
        context.effectManager.add(effect);
        return true;
    }
    dispose(): void { for (const effect of this.pool)
        effect.destroy(); this.pool.length = 0; this.active.clear(); }
}
