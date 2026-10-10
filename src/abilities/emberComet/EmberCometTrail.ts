import { Group, Mesh, Quaternion, Vector3 } from 'three';
import type { CometResources } from './EmberCometGeometry';
import type { CometConfig, CometQuality } from './EmberCometConfig';
import { createCometFlameMaterial } from './EmberCometMaterials';

/** Four cached volumetric tapered tongues, aligned to the actual flight quaternion. */
export class EmberCometTrail {
  readonly root = new Group();
  readonly tongues: Mesh[] = [];
  constructor(resources: CometResources) {
    for (let i = 0; i < 4; i++) {
      const material = createCometFlameMaterial(); material.uniforms.uLayer.value = i;
      const mesh = new Mesh(resources.tail, material); mesh.renderOrder = 3; mesh.frustumCulled = false;
      this.root.add(mesh); this.tongues.push(mesh);
    }
  }
  update(t: number, position: Vector3, orientation: Quaternion, travel: number, fade: number, q: CometQuality, c: Readonly<CometConfig>): void {
    this.root.position.copy(position); this.root.quaternion.copy(orientation); this.root.visible = travel > .05 && fade > .005;
    for (let i = 0; i < this.tongues.length; i++) {
      const mesh = this.tongues[i], material = mesh.material as ReturnType<typeof createCometFlameMaterial>;
      mesh.visible = i < q.tailLayers;
      const width = c.trailWidth * (1 - i * .12);
      mesh.scale.set(width, width, Math.min(c.trailLength * (q.detail === 0 ? .65 : 1), travel) * (1 - i * .12));
      mesh.rotation.z = t * (i % 2 ? -1 : 1) * 1.2 + i * 1.7;
      material.uniforms.uTime.value = t; material.uniforms.uAlpha.value = fade * (i ? .6 : .95); material.uniforms.uDetail.value = q.detail; material.uniforms.uChargeMode.value = 0;
    }
  }
  charge(t: number, position: Vector3, orientation: Quaternion, progress: number): void {
    this.root.position.copy(position); this.root.quaternion.copy(orientation); this.root.visible = true;
    this.tongues.forEach((mesh, i) => {
      mesh.visible = i < 2; mesh.scale.setScalar(.35 + progress * .45); mesh.rotation.z = 0;
      const material = mesh.material as ReturnType<typeof createCometFlameMaterial>;
      material.uniforms.uChargeMode.value = 1; material.uniforms.uTime.value = t; material.uniforms.uAlpha.value = .5 * progress;
    });
  }
  dispose(): void { this.tongues.forEach(m => (m.material as ReturnType<typeof createCometFlameMaterial>).dispose()); this.root.clear(); }
}
