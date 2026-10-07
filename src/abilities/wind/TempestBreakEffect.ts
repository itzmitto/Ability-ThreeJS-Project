import { Quaternion, Vector3 } from "three";
import type { AbilityCastContext } from "../Ability";
import type { ManagedEffect } from "../../effects/EffectManager";
import type { WindResources, WindVisuals } from "./WindResources";
import { resolveWindTarget } from "./resolveWindTarget";
import { clamp01, fade, TEMPEST } from "./windConfig";
import { windQuality } from "./windConfig";

/** One sequenced lifecycle. EffectManager owns expiry; the ability owns the bounded GPU cache. */
export class TempestBreakEffect implements ManagedEffect {
  readonly origin = new Vector3();
  readonly target = new Vector3();
  readonly position = new Vector3();
  readonly direction = new Vector3();
  readonly visuals: WindVisuals;
  private readonly axis = new Vector3(0, 0, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly inverse = new Quaternion();
  private readonly waterRotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  private readonly unsubscribe: () => void;
  private age = 0;
  private released = false;
  private impacted = false;
  private disposed = false;
  private lightStrength = 0;
  private detail = 1;
  private travel = 0;
  private readonly grounded: boolean;
  constructor(
    private readonly context: AbilityCastContext,
    private readonly resources: WindResources,
    visuals: WindVisuals,
    target: Vector3,
  ) {
    this.visuals = visuals;
    this.origin.copy(context.origin);
    this.target.copy(target);
    this.direction.subVectors(this.target, this.origin).normalize();
    this.travel = this.origin.distanceTo(this.target) / TEMPEST.speed;
    this.grounded =
      context.groundTarget !== null &&
      [
        context.groundTarget.x,
        context.groundTarget.y,
        context.groundTarget.z,
      ].every(Number.isFinite);
    visuals.root.visible = true;
    context.scene.add(visuals.root);
    this.unsubscribe = context.quality.subscribe((config) => {
      const q = windQuality(config);
      visuals.projectile.setQuality(q);
      visuals.impact.setQuality(q);
      visuals.wake.setDetail(q.detail);
      visuals.particles.setQuality(
        q,
        Math.min(
          typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
          config.pixelRatio,
        ),
      );
      this.lightStrength = q.light;
      this.detail = q.detail;
    });
    this.update(0, context.time);
  }
  get impactTime(): number {
    return TEMPEST.charge + this.travel + TEMPEST.compression;
  }
  get lifetime(): number {
    return Math.max(3, this.impactTime + TEMPEST.residual);
  }
  get particleCount(): number {
    return this.visuals.particles.count;
  }
  get instanceCount(): number {
    return (
      this.visuals.projectile.instanceCount +
      this.visuals.impact.instanceCount +
      (this.visuals.trail.mesh.visible ? this.visuals.trail.mesh.count : 0)
    );
  }
  update(delta: number, _elapsed: number): boolean {
    if (this.disposed) return false;
    this.age += Math.max(0, delta);
    const v = this.visuals;
    if (!this.released) {
      this.context.player.visual.getRightHandWorldPosition(this.origin);
      if (this.age >= TEMPEST.charge) {
        // Capture the live animated hand on release, then hold a stable straight trajectory.
        if (
          !resolveWindTarget(
            this.origin,
            this.context.groundTarget,
            this.context.targetPoint,
            this.context.direction,
            this.target,
          )
        )
          return false;
        this.direction.subVectors(this.target, this.origin).normalize();
        this.travel = this.origin.distanceTo(this.target) / TEMPEST.speed;
        this.released = true;
        this.context.cameraFeedback?.(0.00065, 0.06);
      }
    }
    if (this.age >= this.lifetime) return false;
    const flightAge = Math.max(0, this.age - TEMPEST.charge);
    const progress = clamp01(flightAge / Math.max(0.001, this.travel));
    const compression = clamp01(
      (flightAge - this.travel) / TEMPEST.compression,
    );
    const impactAge = this.age - this.impactTime;
    if (!this.released) this.position.copy(this.origin);
    else this.position.lerpVectors(this.origin, this.target, progress);
    v.projectile.root.position.copy(this.position);
    v.projectile.root.quaternion.setFromUnitVectors(this.axis, this.direction);
    // Core faces the camera; the surrounding spirals stay aligned with actual travel.
    this.inverse.copy(v.projectile.root.quaternion).invert();
    v.projectile.core.quaternion
      .copy(this.inverse)
      .multiply(this.context.camera.quaternion);
    const strength = !this.released
      ? fade(0, 0.18, this.age)
      : 1 - fade(0, 0.045, impactAge);
    v.projectile.update(
      this.age,
      strength,
      !this.released,
      compression,
      progress * this.travel * TEMPEST.speed,
    );
    v.trail.mesh.position.copy(this.position);
    v.trail.mesh.quaternion.copy(v.projectile.root.quaternion);
    v.trail.update(
      this.age,
      this.released ? (1 - fade(-0.03, 0.8, impactAge)) * 0.65 : 0,
      Math.max(0.1, progress * this.travel * TEMPEST.speed),
      this.detail,
    );
    v.wake.mesh.position.set(this.position.x, 0.055, this.position.z);
    v.wake.mesh.quaternion
      .setFromAxisAngle(
        this.up,
        Math.atan2(-this.direction.x, -this.direction.z),
      )
      .multiply(this.waterRotation);
    const nearWater = 1 - fade(1.4, 4.5, this.position.y);
    v.wake.update(
      this.age,
      this.released ? nearWater * (1 - fade(-0.03, 0.55, impactAge)) : 0,
    );
    v.impact.root.position.copy(this.target);
    if (this.grounded) v.impact.root.position.y = 0;
    v.impact.ground.quaternion.copy(
      this.grounded ? this.waterRotation : this.context.camera.quaternion,
    );
    v.impact.update(impactAge, this.grounded);
    const particleStrength = this.released
      ? 1 - fade(0, 0.7, impactAge)
      : strength;
    v.particles.update(
      this.age,
      this.position,
      this.direction,
      !this.released,
      particleStrength,
      impactAge,
      v.impact.root.position,
    );
    v.light.position.copy(impactAge >= 0 ? this.target : this.position);
    v.light.intensity =
      this.lightStrength *
      (impactAge >= 0
        ? Math.exp(-impactAge * 9)
        : !this.released
          ? fade(0, 0.25, this.age) * 0.4
          : 0.15);
    if (impactAge > 0.6) v.light.intensity = 0;
    if (!this.impacted && impactAge >= 0) {
      this.impacted = true;
      const distance = this.context.player.position.distanceTo(this.target);
      this.context.cameraFeedback?.(
        0.002 * Math.max(0.2, 1 - distance / 55),
        0.14,
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
