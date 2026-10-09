import { Group, Mesh } from 'three';
import type { BufferGeometry, ShaderMaterial } from 'three';
import { ease, hash } from '../elemental/ElementalVisuals';
export class EarthMeteor {
  readonly root = new Group();
  private readonly chunks: Mesh[] = [];
  constructor(private readonly geometries: BufferGeometry[], material: ShaderMaterial, private readonly detailed: BufferGeometry[]) {
    for (let i = 0; i < 13; i++) { const m = new Mesh(geometries[i % geometries.length], material); const a = i * 2.39996, r = i === 0 ? 0 : 2.6 + hash(i) * .8; m.position.set(Math.cos(a) * r, (hash(i + 8) - .5) * 4, Math.sin(a) * r); m.scale.set(2 + hash(i + 17), 1.8 + hash(i + 77) * 1.3, 2 + hash(i + 38)); m.rotation.set(i * .6, i * 1.7, i * .2); this.chunks.push(m); this.root.add(m); }
  }
  update(t: number, fade: number, highDetail: boolean): void {
    const formation = ease((t - 1.8) / 1.2), fall = Math.pow(Math.max(0, Math.min(1, (t - 3.7) / .6)), 2.5);
    this.root.visible = t >= 1.8 && t < 4.4; this.root.position.y = 14 * (1 - fall); this.root.scale.setScalar(Math.max(.001, formation) * fade); this.root.rotation.set(.09 * t, t * .18, .07 * Math.sin(t));
    for (let i = 0; i < this.chunks.length; i++) { const m = this.chunks[i]; m.geometry = (highDetail ? this.detailed : this.geometries)[i % this.geometries.length]; const a = i * 2.39996, r = (i === 0 ? 0 : 2.6 + hash(i) * .8) + (1 - formation) * 5; m.position.x = Math.cos(a) * r; m.position.z = Math.sin(a) * r; }
  }
}
