import { DynamicDrawUsage, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import type { BufferGeometry, Group } from 'three';
import { seededRandom, smooth } from './iceConfig';

interface Shard { x: number; z: number; vx: number; vz: number; vy: number; size: number; spin: number; delay: number; }
export class IceShardEmitter {
  readonly mesh: InstancedMesh;
  private readonly material = new MeshStandardMaterial({ color: '#8cd7e9', metalness: 0.15, roughness: 0.22, emissive: '#143647', emissiveIntensity: 0.8, flatShading: true });
  private readonly transform = new Object3D();
  private readonly shards: Shard[] = [];
  constructor(parent: Group, geometry: BufferGeometry, seed: number) {
    this.mesh = new InstancedMesh(geometry, this.material, 84); this.mesh.instanceMatrix.setUsage(DynamicDrawUsage); this.mesh.frustumCulled = false;
    parent.add(this.mesh); const random = seededRandom(seed + 117);
    for (let i = 0; i < 84; i++) {
      const angle = random() * Math.PI * 2;
      this.shards.push({ x: Math.cos(angle) * random(), z: Math.sin(angle) * random(), vx: Math.cos(angle) * (2 + random() * 5), vz: Math.sin(angle) * (2 + random() * 5), vy: 2.4 + random() * 5.4, size: 0.07 + random() * 0.15, spin: (random() - 0.5) * 12, delay: 0.52 + random() * 0.18 });
    }
  }
  setQuality(count: number): void { this.mesh.count = count; }
  update(time: number): void {
    this.mesh.visible = time >= 0.5 && time < 2.6;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.mesh.count; i++) {
      const shard = this.shards[i]; const age = Math.max(0, time - shard.delay);
      const fade = (1 - smooth(0.8, 1.9, age)) * smooth(0, 0.04, age);
      this.transform.position.set(shard.x + shard.vx * age / (1 + age * 0.4), Math.max(0.025, 0.25 + shard.vy * age - 5 * age * age), shard.z + shard.vz * age / (1 + age * 0.4));
      this.transform.rotation.set(age * shard.spin, shard.spin + age * 2, age * shard.spin * 0.6);
      this.transform.scale.set(shard.size * fade, shard.size * 2.4 * fade, shard.size * 0.8 * fade);
      this.transform.updateMatrix(); this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void { this.mesh.removeFromParent(); this.mesh.dispose(); this.material.dispose(); }
}
