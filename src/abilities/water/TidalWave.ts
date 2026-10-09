import { Mesh } from 'three';
import type { BufferGeometry } from 'three';
import type { QualityPreset } from '../../quality/QualityPreset';
import { VisualOwner, gridGeometry, ease } from '../elemental/ElementalVisuals';
import { waterMagicMaterial } from './WaterMagicMaterials';
import { TIDAL_QUALITY } from './TidalSovereignConfig';
/** Connected front/back sheets close the shell around a genuine rolling cross-section. */
export function waterShell(width: number, height: number): BufferGeometry {
  const g = gridGeometry(width, height, 2), indices = Array.from(g.getIndex()!.array), stride = width + 1, offset = stride * (height + 1);
  const connect = (a: number, b: number): void => { indices.push(a, a + offset, b, b, a + offset, b + offset); };
  for (let x = 0; x < width; x++) { connect(x, x + 1); connect(height * stride + x, height * stride + x + 1); }
  for (let y = 0; y < height; y++) { connect(y * stride, (y + 1) * stride); connect(y * stride + width, (y + 1) * stride + width); }
  g.setIndex(indices); return g;
}
export class TidalWave {
  readonly material;
  readonly mesh: Mesh;
  private readonly geometries: Record<QualityPreset, BufferGeometry>;
  constructor(owner: VisualOwner) {
    this.material = owner.material(waterMagicMaterial(0));
    this.geometries = { LOW: owner.geometry(waterShell(24, 20)), MEDIUM: owner.geometry(waterShell(48, 36)), MAX: owner.geometry(waterShell(80, 56)) };
    this.mesh = new Mesh(this.geometries.MEDIUM, this.material); this.mesh.frustumCulled = false; owner.root.add(this.mesh);
  }
  update(t: number, preset: QualityPreset, fade: number): void {
    const u = this.material.uniforms; this.mesh.geometry = this.geometries[preset]; this.mesh.visible = t >= .3 && t < 4.35;
    u.uTime.value = t; u.uRise.value = ease((t - .3) / 1.5); u.uCurl.value = ease((t - 1.15) / 1.8); u.uCrash.value = Math.pow(ease((t - 2.65) / 1.15), 1.8); u.uFade.value = fade * (1 - ease((t - 3.65) / .7)); u.uDetail.value = TIDAL_QUALITY[preset].detail;
  }
}
