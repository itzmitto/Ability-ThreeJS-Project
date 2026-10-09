// IceAbility's travel → impact → fade lifecycle, integrated with the existing EffectManager.
// Copyright (c) 2026 mohamedachrefelouafi — MIT; public/licenses/LinearAbilityExtThreeJS.txt.
import { Group, PointLight, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { FrostLanceField } from './FrostLanceField';
import { FrostLanceParticles } from './FrostLanceParticles';
import { FrostLanceWater } from './FrostLanceWater';
import { FROST_LANCE as c, frostQuality, saturate } from './FrostLanceConfig';
export class FrostLanceEffect implements ManagedEffect {
    readonly root = new Group();
    readonly field: FrostLanceField;
    readonly particles = new FrostLanceParticles();
    readonly water: FrostLanceWater;
    readonly frontPosition = new Vector3();
    readonly side = new Vector3();
    readonly light = new PointLight(c.lightColor, c.lightIntensity, c.lightRadius, 2);
    age = 0;
    front = 0;
    impactAt = -1;
    private frostDistance = 0;
    private readonly scratch = new Vector3();
    private readonly breachPoint = new Vector3();
    private unsubscribe: () => void;
    private readonly onBreach = (r: Parameters<FrostLanceField['position']>[0], radius: number) => {
        this.field.position(r, this.breachPoint).setY(.08);
        this.particles.breach(this.age, this.breachPoint, radius);
    };
    private disposed = false;
    private destroyed = false;
    constructor(private context: AbilityCastContext, readonly origin: Vector3, readonly direction: Vector3, public length: number, private readonly onDispose: () => void) {
        this.side.crossVectors(direction, new Vector3(0, 1, 0)).normalize();
        this.field = new FrostLanceField(origin, direction, this.side, length);
        this.water = new FrostLanceWater(context.water);
        this.root.name = 'Frost Lance · original linear eruption';
        this.root.add(this.field.root, this.particles.root, this.water.root, this.light);
        context.scene.add(this.root);
        this.unsubscribe = context.quality.subscribe(q => { const budget = frostQuality(q); this.field.setQuality(budget.spikes, q.shadows, budget.detail); this.particles.setQuality(budget); this.light.visible = budget.light; });
    }
    get active(): boolean { return !this.disposed; }
    activate(context: AbilityCastContext, origin: Vector3, direction: Vector3, length: number): void {
        this.context = context;
        this.origin.copy(origin);
        this.direction.copy(direction);
        this.length = this.field.length = length;
        this.side.crossVectors(this.direction, this.scratch.set(0, 1, 0)).normalize();
        this.age = this.front = this.frostDistance = 0;
        this.impactAt = -1;
        this.frontPosition.copy(this.origin);
        this.disposed = false;
        this.field.reset();
        this.particles.reset();
        this.water.reset();
        context.scene.add(this.root);
        this.unsubscribe = context.quality.subscribe(q => { const budget = frostQuality(q); this.field.setQuality(budget.spikes, q.shadows, budget.detail); this.particles.setQuality(budget); this.light.visible = budget.light; });
    }
    get instanceCount(): number { return this.field.root.visible ? this.field.activeCount : 0; }
    get particleCount(): number { return this.particles.count; }
    update(dt: number): boolean {
        if (this.disposed || !Number.isFinite(dt) || dt < 0)
            return false;
        this.age += dt;
        if (this.age > 16)
            return false; // Large resume/test jumps never create catch-up emitter storms.
        if (this.impactAt < 0) {
            const easeIn = 1 - Math.pow(1 - saturate(this.age / .08), 2);
            this.front = Math.min(this.length, this.front + c.speed * easeIn * dt);
            const u = this.front / this.length;
            this.frontPosition.copy(this.origin).addScaledVector(this.direction, this.front);
            this.field.trigger(this.age, u, false);
            this.context.cameraFeedback?.(c.rumble * .02, .045);
            this.particles.front(this.age, Math.min(dt, .1), this.scratch.copy(this.frontPosition).setY(.18), this.field.halfWidth(u));
            // Donor distance-driven rime loop, with finite positive step and bounded catch-up work.
            const step = 1 / Math.max(.1, c.frostRate);
            for (let n = 0; n < 24 && this.front - this.frostDistance >= step; n++) {
                this.frostDistance += step;
                const s = saturate(this.frostDistance / this.length), width = this.field.halfWidth(s);
                this.scratch.copy(this.origin).addScaledVector(this.direction, s * this.length).addScaledVector(this.side, (Math.random() * 1.4 - .7) * width);
                this.water.patch(this.age, this.scratch, width * c.frostSpread * (.6 + Math.random() * .55));
            }
            if (this.front >= this.length) {
                this.impactAt = this.age;
                this.field.trigger(this.age, 1, true);
                this.scratch.copy(this.frontPosition).setY(.4);
                this.water.impact(this.age, this.scratch);
                this.particles.impact(this.age, this.scratch, this.field.halfWidth(1));
                this.context.cameraFeedback?.(c.impactShake * .02, .18);
            }
        }
        const impactAge = this.impactAt < 0 ? 0 : this.age - this.impactAt;
        const retract = this.impactAt < 0 ? 0 : saturate((impactAge - c.lifetime - c.shatterDelay) / c.sinkTime);
        this.field.root.visible = retract < 1;
        if (this.field.root.visible)
            this.field.update(this.age, retract, this.onBreach);
        this.field.ice.uniforms.uTime.value = this.context.time + this.age;
        if (this.impactAt >= 0 && retract < .6) {
            this.scratch.copy(this.origin).addScaledVector(this.direction, this.length * (.25 + Math.random() * .75)).setY(.35);
            this.particles.standing(this.age, Math.min(dt, .1), this.scratch, this.field.halfWidth(1));
        }
        this.particles.update(this.age);
        this.water.update(this.age);
        this.light.position.copy(this.frontPosition).setY(.65);
        const scale = this.impactAt < 0 ? 1 : impactAge < c.lifetime ? 1 - Math.pow(impactAge / c.lifetime, 2) * .45 : (1 - retract) * .35;
        const boost = this.impactAt < 0 ? 0 : c.lightIntensity * 1.6 * Math.exp(-impactAge * 4.5);
        this.light.intensity = c.lightIntensity * scale * (.9 + .1 * Math.sin(this.age * 9.3) * Math.sin(this.age * 3.7)) + boost;
        return this.impactAt < 0 || retract < 1 || this.particles.count > 0 || this.age < this.water.expiry;
    }
    /** Normal expiry releases only scene membership, subscriptions and owned water sources. */
    dispose(): void { if (this.disposed)
        return; this.disposed = true; this.unsubscribe(); this.root.removeFromParent(); this.water.reset(); this.onDispose(); }
    /** Ability/application teardown destroys the two bounded cached GPU bundles. */
    destroy(): void { if (this.destroyed)
        return; this.destroyed = true; this.dispose(); this.field.dispose(); this.particles.dispose(); this.water.dispose(); this.light.dispose(); this.root.clear(); }
}
