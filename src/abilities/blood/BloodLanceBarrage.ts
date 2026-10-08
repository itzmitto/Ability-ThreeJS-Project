import { InstancedMesh, Object3D, Vector3 } from "three";
import { liquidLanceGeometry } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { LANCE_TIMES, lanceStart, lanceDestination } from "./BloodLanceScore";
import { smooth } from "./SanguineEclipseConfig";
/** Liquid weapons grow, reorient and accelerate visibly; trajectory is deterministic. */
export class BloodLanceBarrage {
  readonly material = bloodMaterial();
  readonly mesh = new InstancedMesh(liquidLanceGeometry(), this.material, 28);
  readonly impacts = new Uint8Array(28);
  private readonly start = new Vector3();
  private readonly end = new Vector3();
  private readonly direction = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly transform = new Object3D();
  constructor() {
    this.mesh.frustumCulled = false;
  }
  reset(): void {
    this.impacts.fill(0);
  }
  update(
    t: number,
    count: number,
    detail: number,
    onImpact: (index: number, point: Vector3) => void,
  ): void {
    this.mesh.visible = t > 4.5 && t < 9;
    this.mesh.count = count;
    updateBlood(this.material, t, detail, 0.15);
    for (let i = 0; i < count; i++) {
      const launch = LANCE_TIMES[i],
        progress = Math.max(0, Math.min(1, (t - launch) / 0.52)),
        growth = smooth(4.5 + i * 0.015, 5.65 + i * 0.012, t);
      lanceStart(i, Math.min(t, launch), this.start);
      lanceDestination(i, this.end);
      this.direction.subVectors(this.end, this.start).normalize();
      this.transform.quaternion.setFromUnitVectors(this.up, this.direction);
      this.transform.position
        .copy(this.start)
        .lerp(this.end, progress * progress);
      this.transform.scale.set(
        0.8 + (i % 4) * 0.12,
        (1 + progress * 0.7) * growth,
        0.8 + (i % 4) * 0.12,
      );
      if (t >= launch + 0.52) {
        this.transform.scale.setScalar(0);
        if (!this.impacts[i]) {
          this.impacts[i] = 1;
          onImpact(i, this.end);
        }
      }
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
