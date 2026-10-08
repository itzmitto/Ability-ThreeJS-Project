import { Group, PointLight } from "three";
import { ObjectPool } from "../../effects/ObjectPool";
import { FlamePillarField } from "./FlamePillarField";
import { ScorchResidue } from "./ScorchResidue";
import { IgnitionTrail } from "./IgnitionTrail";
import { SmokeSystem } from "./SmokeSystem";
import { EmberSystem } from "./EmberSystem";
import { HeatDistortion } from "./HeatDistortion";
import { BlackFireCharge } from "./BlackFireCharge";
export class FireVisuals {
  readonly root = new Group();
  readonly flames = new FlamePillarField();
  readonly residue = new ScorchResidue();
  readonly trail = new IgnitionTrail();
  readonly smoke = new SmokeSystem();
  readonly embers = new EmberSystem();
  readonly heat = new HeatDistortion();
  readonly charge = new BlackFireCharge();
  readonly impactLight = new PointLight("#ff163c", 0, 50, 2);
  readonly fillLight = new PointLight("#a61b51", 0, 45, 2);
  constructor() {
    this.root.name = "ABYSSAL FLAME";
    this.root.add(
      this.flames.body,
      this.flames.edges,
      this.residue.mesh,
      this.residue.dark,
      this.trail.mesh,
      this.smoke.mesh,
      this.heat.mesh,
      this.charge.root,
    );
    for (const e of this.embers.emitters) this.root.add(e.points);
  }
  reset(): void {
    this.root.removeFromParent();
    this.root.visible = false;
    this.impactLight.intensity = this.fillLight.intensity = 0;
    this.impactLight.removeFromParent();
    this.fillLight.removeFromParent();
  }
  dispose(): void {
    this.reset();
    this.flames.dispose();
    this.residue.dispose();
    this.trail.dispose();
    this.smoke.dispose();
    this.embers.dispose();
    this.heat.dispose();
    this.charge.dispose();
    this.impactLight.dispose();
    this.fillLight.dispose();
    this.root.clear();
  }
}
export class FireResources {
  readonly pool = new ObjectPool(
    () => new FireVisuals(),
    (v) => v.reset(),
    (v) => v.dispose(),
    2,
  );
  dispose(): void {
    this.pool.dispose();
  }
}
