import { InstancedMesh, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from 'three';
import { VisualOwner, ease, hash } from '../elemental/ElementalVisuals';
import { waterShell } from './TidalWave';
import { waterMagicMaterial } from './WaterMagicMaterials';
/** Choreographed liquid crescents with a single bounded droplet/splash batch. */
export class WaterBladeBarrage {
  readonly material;
  readonly blades: Mesh[] = [];
  readonly trails: InstancedMesh;
  private readonly dummy = new Object3D();
  constructor(owner: VisualOwner) {
    this.material = owner.material(waterMagicMaterial(1)); const geometry = owner.geometry(waterShell(30, 6));
    for (let i = 0; i < 8; i++) { const m = new Mesh(geometry, this.material); m.frustumCulled = false; this.blades.push(m); owner.root.add(m); }
    this.trails = new InstancedMesh(owner.geometry(new SphereGeometry(1, 6, 4)), owner.material(new MeshBasicMaterial({ color: '#b8f4ff', transparent: true, opacity: .65, depthWrite: false })), 96); this.trails.frustumCulled = false; owner.root.add(this.trails);
  }
  update(t: number, count: number, fade: number): void {
    this.material.uniforms.uTime.value = t; this.material.uniforms.uFade.value = fade; this.trails.visible = t >= 1.85 && t < 3.8; this.trails.count = this.trails.visible ? count * 12 : 0;
    for (let i = 0; i < 8; i++) {
      const launch = 1.85 + i * .095, travel = Math.max(0, Math.min(1, (t - launch) / .42)), formation = ease((t - 1.6 - i * .04) / .25), side = i % 2 === 0 ? -1 : 1, x = side * (4.5 + Math.floor(i / 2) * .7);
      const m = this.blades[i]; m.visible = i < count && t >= 1.6 + i * .04 && travel < 1;
      m.position.set(x * (1 - travel), (3.5 + i % 3) * (1 - travel) + .5, -8 + travel * 8); m.rotation.set(.15 + travel * .5, side * .4, side * .5 + i * .1); m.scale.setScalar((.65 + (i % 3) * .15) * formation * (1 - ease((travel - .8) / .2)));
      if (i >= count) continue;
      for (let j = 0; j < 12; j++) {
        const k = i * 12 + j, d = this.dummy, delayed = (t - launch - j * .008) / .42, p = Math.max(0, Math.min(1, delayed)), age = Math.max(0, t - launch - .42), seed = hash(k + 77);
        if (age > 0) { const a = j * 2.39996, r = age * (3 + seed * 4); d.position.set(Math.cos(a) * r, Math.max(.08, .5 + age * (3 + seed * 4) - 8 * age * age), Math.sin(a) * r); }
        else d.position.set(x * (1 - p) + (seed - .5) * .8, (3.5 + i % 3) * (1 - p) + .5 + Math.sin(j) * .15, -8 + p * 8);
        const size = delayed < 0 ? 0 : (.025 + seed * .06) * (1 - ease(age / .8)) * fade; d.scale.set(size, size * (age > 0 ? 1.5 : 1), size * (age > 0 ? 1 : 3)); d.rotation.set(0, 0, j); d.updateMatrix(); this.trails.setMatrixAt(k, d.matrix);
      }
    }
    this.trails.instanceMatrix.needsUpdate = true;
  }
}
