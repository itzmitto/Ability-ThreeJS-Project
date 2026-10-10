import { DynamicDrawUsage, Group, InstancedMesh, Mesh, Object3D, PointLight, Quaternion, Vector3 } from 'three';
import type { ManagedEffect } from '../../effects/EffectManager';
import type { AbilityCastContext } from '../Ability';
import { COMET_CAST, cometEase, cometQuality, cometSeed, type CometConfig, type CometQuality } from './EmberCometConfig';
import type { CometResources } from './EmberCometGeometry';
import { createCometCoreMaterial, createCometRockMaterial } from './EmberCometMaterials';
import { EmberCometTrail } from './EmberCometTrail';
import { EmberCometParticles } from './EmberCometParticles';
import { EmberCometImpact } from './EmberCometImpact';

const FORWARD = new Vector3(0, 0, 1);
export class EmberCometEffect implements ManagedEffect {
  readonly root = new Group(); readonly projectile = new Group(); readonly core: Mesh; readonly shell: InstancedMesh[];
  readonly particles: EmberCometParticles; readonly trail: EmberCometTrail; readonly impact: EmberCometImpact;
  readonly light = new PointLight('#ff8a25', 0, 12, 2);
  readonly position = new Vector3(); readonly origin = new Vector3(); readonly target = new Vector3(); readonly direction = new Vector3();
  readonly orientation = new Quaternion(); readonly rock = createCometRockMaterial();
  private readonly previous = new Vector3(); private readonly hand = new Vector3(); private readonly radial = new Vector3(); private readonly dummy = new Object3D();
  private context: AbilityCastContext; private quality: CometQuality; private unsubscribe?: () => void; private destroyed = false;
  private age = 0; private travel = 0; private distance = 0; private launchTime = -1; private impactTime = -1;
  active = false; phase: 'charge' | 'formation' | 'flight' | 'impact' | 'aftermath' | 'complete' = 'complete';
  constructor(ctx: AbilityCastContext, private readonly resources: CometResources, private readonly config: Readonly<CometConfig>) {
    this.context = ctx; this.quality = cometQuality(ctx.quality.config, config);
    this.core = new Mesh(resources.cores[this.quality.detail], createCometCoreMaterial()); this.core.frustumCulled = false; this.projectile.add(this.core);
    this.shell = [0, 1, 2].map(i => { const m = new InstancedMesh(resources.plates[this.quality.detail][i], this.rock.material, 4); m.frustumCulled = false; m.instanceMatrix.setUsage(DynamicDrawUsage); this.projectile.add(m); return m; });
    this.particles = new EmberCometParticles(resources); this.trail = new EmberCometTrail(resources); this.impact = new EmberCometImpact(resources);
    this.root.name = 'Ember Comet · pooled projectile'; this.projectile.name = 'Comet projectile'; this.root.add(this.projectile, this.particles.root, this.trail.root, this.impact.root, this.light);
  }
  activate(ctx: AbilityCastContext, target: Vector3): void {
    this.context = ctx; this.target.copy(target); this.origin.copy(ctx.origin); this.position.copy(ctx.origin); this.previous.copy(ctx.origin);
    this.age = this.travel = 0; this.launchTime = this.impactTime = -1; this.active = true; this.phase = 'charge'; this.particles.reset(); this.impact.root.visible = false;
    this.projectile.visible = true; this.trail.root.visible = false; ctx.scene.add(this.root);
    this.unsubscribe = ctx.quality.subscribe(q => {
      this.quality = cometQuality(q, this.config); this.core.geometry = this.resources.cores[this.quality.detail];
      this.shell.forEach((m, i) => m.geometry = this.resources.plates[this.quality.detail][i]); this.particles.setQuality(this.quality); this.light.visible = this.quality.light;
    }); this.update(0);
  }
  private updateShell(charge: number): void {
    const count = this.quality.shell;
    this.shell.forEach(m => m.count = 0);
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996 + this.age * .65, z = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - z * z);
      this.radial.set(Math.cos(a) * r, Math.sin(a) * r, z);
      const settle = cometEase((charge - .25 - cometSeed(i + 9) * .1) / .6), distance = 1 + (1 - settle) * .8;
      this.dummy.position.copy(this.radial).multiplyScalar(distance - 1); this.dummy.quaternion.setFromUnitVectors(FORWARD, this.radial);
      this.dummy.scale.setScalar(.3 + settle * .7); this.dummy.updateMatrix(); const mesh = this.shell[i % 3]; mesh.setMatrixAt(mesh.count++, this.dummy.matrix);
    }
    this.shell.forEach(m => m.instanceMatrix.needsUpdate = true);
  }
  private hit(): void {
    this.impactTime = this.age; this.phase = 'impact'; this.projectile.visible = false;
    this.target.copy(this.position); this.target.y = this.context.water?.getSurfaceHeight(this.target.x, this.target.z) ?? this.target.y;
    this.particles.impact(this.age, this.target, this.direction, this.quality, this.config);
    for (let i = 0; i < 3; i++) this.context.water?.addRipple({ position: this.target, strength: this.config.waterRippleStrength / (1 + i * .6), duration: 1.8,
      waveSpeed: 4 + i * 2, wavelength: .6 + i * .15, radius: .2 + i * .35, displacementScale: .55 }, this);
    this.context.cameraFeedback?.(.012, .12);
  }
  update(dt: number): boolean {
    if (!this.active || !Number.isFinite(dt) || dt < 0) return this.active;
    if (dt > 5) return false; this.age += dt;
    const c = this.config, q = this.quality, charge = Math.min(1, this.age / COMET_CAST.release);
    if (this.launchTime < 0) {
      this.phase = this.age < .25 ? 'charge' : 'formation'; this.context.player.visual.getRightHandWorldPosition(this.hand);
      this.position.copy(this.hand); this.direction.subVectors(this.target, this.position).normalize(); this.orientation.setFromUnitVectors(FORWARD, this.direction);
      this.particles.emitFlight(this.age, dt, this.position, this.position, this.direction, q, c, true);
      if (this.age >= COMET_CAST.release) {
        this.launchTime = COMET_CAST.release; this.origin.copy(this.position);
        this.target.y = this.context.water?.getSurfaceHeight(this.target.x, this.target.z) ?? this.target.y;
        this.direction.subVectors(this.target, this.origin); this.distance = Math.min(COMET_CAST.range, this.direction.length());
        if (!Number.isFinite(this.distance) || this.distance < .15) return false;
        this.direction.normalize(); this.target.copy(this.origin).addScaledVector(this.direction, this.distance); this.orientation.setFromUnitVectors(FORWARD, this.direction);
        this.context.cameraFeedback?.(.004, .055); this.phase = 'flight';
      }
    }
    if (this.launchTime >= 0 && this.impactTime < 0) {
      this.previous.copy(this.position); this.travel = Math.min(this.distance, (this.age - this.launchTime) * c.flightSpeed);
      this.position.copy(this.origin).addScaledVector(this.direction, this.travel);
      this.particles.emitFlight(this.age, dt, this.position, this.previous, this.direction, q, c);
      const waterY = this.context.water?.getSurfaceHeight(this.position.x, this.position.z) ?? this.target.y;
      if (this.travel >= this.distance || (this.travel > 1 && this.position.y <= waterY + .04)) this.hit();
    }
    this.projectile.position.copy(this.position); this.projectile.quaternion.copy(this.orientation);
    this.projectile.scale.setScalar(c.projectileRadius * (.15 + charge * .85)); this.core.scale.setScalar(.65); this.updateShell(charge);
    const material = this.core.material as ReturnType<typeof createCometCoreMaterial>;
    material.uniforms.uTime.value = this.age; material.uniforms.uGlow.value = c.coreGlow; material.uniforms.uDetail.value = q.detail;
    this.rock.uniforms.uCometTime.value = this.age; this.rock.uniforms.uCrackGlow.value = c.shellCrackGlow * (.4 + charge * .6); this.rock.uniforms.uHeat.value = 1; this.rock.uniforms.uDetail.value = q.detail;
    const impactAge = this.impactTime < 0 ? -1 : this.age - this.impactTime;
    if (impactAge >= 0) { this.phase = impactAge < .7 ? 'impact' : 'aftermath'; this.target.y = this.context.water?.getSurfaceHeight(this.target.x, this.target.z) ?? this.target.y; }
    if (this.launchTime < 0) this.trail.charge(this.age, this.position, this.orientation, charge);
    else this.trail.update(this.age, this.position, this.orientation, this.travel, impactAge < 0 ? 1 : Math.max(0, 1 - impactAge / .18), q, c);
    this.impact.update(impactAge, this.age, this.target, q, c);
    // Bounded screen-size scale follows the viewport and central pixel-ratio preset.
    const pixels = typeof window === 'undefined' ? 450 : Math.min(1000, window.innerHeight * .65 * this.context.quality.config.pixelRatio);
    this.particles.update(this.age, pixels, q, c);
    this.light.position.copy(impactAge < 0 ? this.position : this.target);
    if (impactAge >= 0) this.light.position.y += .8;
    else { this.light.position.addScaledVector(this.direction, -1.2); this.light.position.y += 1; }
    this.light.intensity = impactAge < 0 ? (this.launchTime < 0 ? charge * 1.8 : 2.8) : c.impactFlash * 10 * Math.exp(-impactAge * 7);
    this.root.userData.phase = this.phase;
    return impactAge < COMET_CAST.residual;
  }
  get particleCount(): number { return this.particles.particleCount; }
  get instanceCount(): number { return this.particles.instanceCount + (this.projectile.visible ? this.quality.shell + 1 : 0); }
  dispose(): void {
    if (!this.active) return; this.active = false; this.phase = 'complete'; this.unsubscribe?.(); this.unsubscribe = undefined;
    this.context.water?.removeOwner(this); this.root.removeFromParent(); this.light.intensity = 0; this.particles.reset();
  }
  destroy(): void {
    if (this.destroyed) return; this.destroyed = true; this.dispose();
    (this.core.material as ReturnType<typeof createCometCoreMaterial>).dispose(); this.rock.material.dispose(); this.shell.forEach(m => m.dispose());
    this.trail.dispose(); this.impact.dispose(); this.particles.dispose(); this.light.dispose(); this.root.clear();
  }
}
