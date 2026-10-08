import { IcosahedronGeometry, InstancedMesh, Object3D } from "three";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import type { SanguineTimeline } from "./SanguineTimeline";
/** Connected asymmetric surface lobes give the Eclipse a changing cohesive silhouette. */
export class BloodEclipseSurface {
  readonly material = bloodMaterial();
  readonly mesh = new InstancedMesh(
    new IcosahedronGeometry(1, 3),
    this.material,
    12,
  );
  private readonly transform = new Object3D();
  constructor() {
    this.mesh.frustumCulled = false;
  }
  update(tl: SanguineTimeline, detail: number): void {
    const t = tl.age,
      size = tl.eclipse * (1 - tl.compression * 0.62);
    this.mesh.visible = tl.eclipse > 0.001;
    this.mesh.count = detail === 0 ? 4 : detail === 1 ? 8 : 12;
    updateBlood(this.material, t, detail, 0.12 + tl.compression * 0.4);
    for (let i = 0; i < this.mesh.count; i++) {
      const a = i * 2.399963 + t * 0.09,
        y = Math.sin(i * 1.73) * 0.75,
        r = Math.sqrt(1 - y * y),
        radius = 5.2 + 0.3 * Math.sin(t * 0.47 + i);
      this.transform.position.set(
        Math.cos(a) * r * radius * size,
        12.5 + y * radius * size,
        Math.sin(a) * r * radius * size - 16,
      );
      this.transform.scale.set(
        (1.8 + 0.45 * Math.sin(i + t * 0.41)) * size,
        (1.65 + 0.35 * Math.sin(i * 2 + t * 0.37)) * size,
        (1.7 + 0.4 * Math.cos(i + t * 0.31)) * size,
      );
      this.transform.rotation.set(
        i * 0.7,
        t * 0.2 + i,
        Math.sin(t * 0.3 + i) * 0.2,
      );
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
