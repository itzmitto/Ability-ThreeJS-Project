import { Group, PointLight } from "three";
import { ObjectPool } from "../../effects/ObjectPool";
import { WindProjectile } from "./WindProjectile";
import { WaterWake } from "./WaterWake";
import { WindParticleSystem } from "./WindParticleSystem";
import { WindImpact } from "./WindImpact";
import { WindTrail } from "./WindTrail";

/** Whole VFX bundles retain GPU buffers and shader materials between casts, bounded to three concurrent leases. */
export class WindVisuals {
  readonly root = new Group();
  readonly projectile = new WindProjectile();
  readonly wake = new WaterWake();
  readonly particles = new WindParticleSystem();
  readonly impact = new WindImpact();
  readonly light = new PointLight("#bfdde4", 0, 9, 2);
  readonly trail = new WindTrail();
  constructor() {
    this.root.name = "Tempest Break";
    this.light.castShadow = false;
    this.root.add(
      this.projectile.root,
      this.trail.mesh,
      this.wake.mesh,
      this.particles.flight,
      this.particles.blast,
      this.impact.root,
      this.light,
    );
  }
  reset(): void {
    this.root.removeFromParent();
    this.light.intensity = 0;
    this.root.visible = false;
  }
  dispose(): void {
    this.reset();
    this.projectile.dispose();
    this.trail.dispose();
    this.wake.dispose();
    this.particles.dispose();
    this.impact.dispose();
    this.light.dispose();
    this.root.clear();
  }
}
export class WindResources {
  readonly pool = new ObjectPool(
    () => new WindVisuals(),
    (visual) => visual.reset(),
    (visual) => visual.dispose(),
    3,
  );
  dispose(): void {
    this.pool.dispose();
  }
}
