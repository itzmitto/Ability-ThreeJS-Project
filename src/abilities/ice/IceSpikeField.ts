import { DynamicDrawUsage, Group, InstancedMesh, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import { IceMaterial } from './IceMaterial';
import { seededRandom, smooth } from './iceConfig';

interface Spike { x: number; z: number; width: number; height: number; leanX: number; leanZ: number; yaw: number; delay: number; }
export class IceSpikeField {
  readonly mesh: InstancedMesh;
  readonly ice = new IceMaterial();
  private readonly spikes: Spike[] = [];
  private readonly transform = new Object3D();
  constructor(parent: Group, geometry: BufferGeometry, seed: number) {
    this.mesh = new InstancedMesh(geometry, this.ice.material, 16);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage); this.mesh.frustumCulled = false;
    this.mesh.name = 'Glacial crystal field'; parent.add(this.mesh);
    const random = seededRandom(seed);
    this.spikes.push({ x: 0.05, z: -0.08, width: 1.22, height: 6.1, leanX: 0.12, leanZ: -0.10, yaw: random() * 6, delay: 0.45 });
    for (let i = 1; i < 16; i++) {
      const angle = i * 2.39996 + random() * 0.65; const radius = i < 9 ? 0.9 + random() * 1.25 : 1.8 + random() * 1.25;
      this.spikes.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, width: 0.38 + random() * 0.53, height: 1.9 + random() * 2.8,
        leanX: Math.sin(angle) * (0.16 + random() * 0.3), leanZ: -Math.cos(angle) * (0.16 + random() * 0.3), yaw: random() * 6.28, delay: 0.48 + i * 0.012 + random() * 0.055 });
    }
  }
  setQuality(count: number, detail: number): void { this.mesh.count = count; this.ice.uniforms.uIceDetail.value = detail; }
  update(time: number): void {
    const fade = 1 - smooth(3.5, 4.9, time); const melt = smooth(3.6, 4.95, time);
    this.mesh.visible = time >= 0.44 && time < 4.95; this.ice.update(fade, Math.exp(-Math.max(0, time - 0.6) * 6));
    for (let i = 0; i < this.mesh.count; i++) {
      const spike = this.spikes[i]; const t = Math.max(0, Math.min(1, (time - spike.delay) / 0.28));
      const back = 1 + 2.3 * Math.pow(t - 1, 3) + 1.3 * Math.pow(t - 1, 2);
      this.transform.position.set(spike.x, -0.24 * (1 - t) - melt * spike.height * 0.12, spike.z);
      this.transform.rotation.set(spike.leanX, spike.yaw, spike.leanZ);
      this.transform.scale.set(spike.width, Math.max(0.0001, back) * spike.height * (1 - melt * 0.32), spike.width * 0.78);
      this.transform.updateMatrix(); this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void { this.mesh.removeFromParent(); this.mesh.dispose(); this.ice.dispose(); }
}
