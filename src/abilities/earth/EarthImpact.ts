import { InstancedMesh, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, AdditiveBlending } from 'three';
import type { BufferGeometry, ShaderMaterial } from 'three';
import { ElementParticles, SurfacePulse, VisualOwner, ease, hash } from '../elemental/ElementalVisuals';
import type { AbilityCastContext } from '../Ability';
export class EarthImpact {
  readonly debris: InstancedMesh;
  readonly dust: ElementParticles;
  readonly sparks: ElementParticles;
  readonly splash: ElementParticles;
  readonly pulse: SurfacePulse;
  readonly flash: Mesh;
  private readonly dummy = new Object3D();
  constructor(owner: VisualOwner, geometry: BufferGeometry, rock: ShaderMaterial) {
    this.debris = new InstancedMesh(geometry, rock, 120); this.debris.frustumCulled = false; owner.root.add(this.debris);
    this.splash = new ElementParticles(owner, 80, true); this.dust = new ElementParticles(owner, 450, false, true); this.sparks = new ElementParticles(owner, 100, false); this.pulse = new SurfacePulse(owner, false);
    this.flash = new Mesh(owner.geometry(new SphereGeometry(1, 24, 12)), owner.material(new MeshBasicMaterial({ color: '#ffd788', transparent: true, depthWrite: false, blending: AdditiveBlending }))); owner.root.add(this.flash);
  }
  update(t: number, fragments: number, dust: number, fade: number, camera: AbilityCastContext['camera']): void {
    const age = t - 4.3, d = this.dummy; this.debris.count = fragments; this.debris.visible = t >= 1.8;
    for (let i = 0; i < fragments; i++) {
      const a = i * 2.39996, s = hash(i + 17), speed = 4 + s * 12, delay = hash(i + 31) * .16, flight = Math.max(0, age - delay);
      const landing = (7 + s * 9) / 5.5, travel = Math.min(flight, landing);
      const y = (7 + s * 9) * travel - 5.5 * travel * travel;
      const bounceAge = Math.max(0, flight - landing), bounce = Math.max(0, Math.sin(bounceAge * 9)) * Math.exp(-bounceAge * 4) * .7;
      d.position.set(Math.cos(a) * (1 + speed * travel), Math.max(.05, y) + bounce - ease((t - 6.5) / 1.5) * 2, Math.sin(a) * (1 + speed * travel));
      if (t < 3.7) { const orbit = a + t * .6; const r = 5.5 + s * 2; d.position.set(Math.cos(orbit) * r, 11 + Math.sin(t + i) * 2, Math.sin(orbit) * r); }
      else if (age < 0) { const drop = (t - 3.7) / .6; const r = 2 + s * 3; d.position.set(Math.cos(a) * r, 14 * (1 - drop * drop) - hash(i + 99) * drop * 4, Math.sin(a) * r); }
      d.rotation.set(travel * (2 + s), i + travel * 1.7, travel * 3); const size = (.12 + s * .7) * fade * (age < 0 ? .35 : 1); d.scale.set(size, size * .7, size * 1.2); d.updateMatrix(); this.debris.setMatrixAt(i, d.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
    this.splash.update(t, Math.min(80, fragments), 4.3, fade * (t < 1.5 ? .7 : t < 4.3 ? .15 : 1), camera);
    this.dust.update(t, dust, 4.3, fade * ease((t - .3) / .8), camera); this.sparks.update(t, Math.round(fragments * .65), 4.3, fade, camera);
    this.pulse.update(Math.max(0, age), age < 0 ? ease((t - 3.5) / .8) * .32 : (1 - ease(age / 3.7)) * fade, age < 0 ? 8 : 5 + age * 12);
    this.flash.visible = age >= 0 && age < .45; this.flash.position.y = .7; this.flash.scale.set(4 + Math.max(0, age) * 12, (1 + Math.max(0, age) * 4) * .6, 4 + Math.max(0, age) * 12); (this.flash.material as MeshBasicMaterial).opacity = Math.max(0, 1 - age / .45) * .8;
  }
}
