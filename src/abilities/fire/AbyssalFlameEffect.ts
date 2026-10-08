import { Vector3 } from "three";
import type { AbilityCastContext } from "../Ability";
import type { ManagedEffect } from "../../effects/EffectManager";
import {
  ABYSSAL,
  fireQuality,
  burnStrength,
  smooth,
} from "./AbyssalFlameConfig";
import type { FireQuality } from "./AbyssalFlameConfig";
import type { FireResources, FireVisuals } from "./FireResources";
export class AbyssalFlameEffect implements ManagedEffect {
  readonly target = new Vector3();
  private readonly hand = new Vector3();
  private readonly view = new Vector3();
  private age = 0;
  private disposed = false;
  private released = false;
  private struck = false;
  private q!: FireQuality;
  private readonly unsubscribe: () => void;
  constructor(
    private readonly context: AbilityCastContext,
    private readonly resources: FireResources,
    readonly visuals: FireVisuals,
    target: Vector3,
    seed: number,
  ) {
    this.target.copy(target);
    visuals.root.position.copy(target);
    visuals.root.visible = true;
    context.scene.add(visuals.root);
    this.unsubscribe = context.quality.subscribe((c) => {
      this.q = fireQuality(c);
      visuals.flames.configure(this.q, seed);
      visuals.embers.configure(
        this.q.embers,
        Math.min(
          typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
          c.pixelRatio,
        ),
      );
    });
    this.update(0, context.time);
  }
  get particleCount(): number {
    return this.visuals.embers.count;
  }
  get instanceCount(): number {
    return (
      (this.visuals.flames.body.visible
        ? this.visuals.flames.geometry.instanceCount * 2
        : 0) + (this.visuals.smoke.mesh.visible ? this.q.smoke : 0)
    );
  }
  update(delta: number, _elapsed: number): boolean {
    if (this.disposed) return false;
    this.age += Math.max(0, delta);
    if (this.age >= ABYSSAL.lifetime) return false;
    const t = this.age,
      v = this.visuals,
      q = this.q;
    if (t < 0.65)
      this.context.player.visual
        .getRightHandWorldPosition(this.hand)
        .sub(this.target);
    if (!this.released) {
      v.trail.setOrigin(this.hand);
      if (t >= 0.18) this.released = true;
    }
    v.charge.update(t, this.hand, this.context.camera.quaternion);
    v.flames.update(t);
    v.trail.update(t, q.detail);
    v.smoke.update(t, q.smoke, q.detail);
    v.embers.update(t);
    v.heat.update(t, q.detail);
    this.view.copy(this.context.camera.position).sub(this.target);
    v.residue.update(t, q.detail, this.view);
    const burst =
      t >= ABYSSAL.eruption ? Math.exp(-(t - ABYSSAL.eruption) * 7) : 0;
    const fuel = burnStrength(t);
    const flicker = 0.78 + 0.13 * Math.sin(t * 13) + 0.09 * Math.sin(t * 21);
    if (t < 7.75) {
      if (!v.impactLight.parent) v.root.add(v.impactLight);
      if (q.detail > 0 && !v.fillLight.parent) v.root.add(v.fillLight);
      if (q.detail === 0) v.fillLight.removeFromParent();
    } else {
      v.impactLight.removeFromParent();
      v.fillLight.removeFromParent();
    }
    if (t < 0.55) {
      v.impactLight.position.copy(this.hand);
      v.impactLight.intensity = 3 * smooth(0, 0.12, t);
    } else {
      v.impactLight.position.set(0, 1.3, 0);
      v.impactLight.intensity = q.light * (burst * 0.85 + fuel * flicker * 0.2);
    }
    v.fillLight.position.copy(this.view);
    v.fillLight.position.y += 3;
    v.fillLight.intensity = q.light * (burst * 0.2 + fuel * flicker * 0.025);
    if (!this.struck && t >= ABYSSAL.eruption) {
      this.struck = true;
      this.context.cameraFeedback?.(
        0.0025 *
          Math.max(
            0.35,
            1 - this.target.distanceTo(this.context.player.position) / 70,
          ),
        0.15,
      );
    }
    return true;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.resources.pool.release(this.visuals);
  }
}
