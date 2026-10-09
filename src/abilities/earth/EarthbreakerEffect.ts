import { Group, Mesh, PointLight, TorusGeometry, MeshBasicMaterial, Vector3, AdditiveBlending } from 'three';
import type { ManagedEffect } from '../../effects/EffectManager';
import type { AbilityCastContext } from '../Ability';
import { VisualOwner, ease, hash } from '../elemental/ElementalVisuals';
import { EARTHBREAKER, EARTH_QUALITY } from './EarthbreakerConfig';
import { earthGeometry } from './EarthGeometry';
import { earthMaterial } from './EarthMaterials';
import { EarthMeteor } from './EarthMeteor';
import { EarthImpact } from './EarthImpact';
export class EarthbreakerEffect implements ManagedEffect {
  private age = 0;
  private disposed = false;
  private readonly owner = new VisualOwner();
  private readonly stone = this.owner.material(earthMaterial());
  private readonly geometries = [3, 7, 11, 19].map(s => this.owner.geometry(earthGeometry(s, 1)));
  private readonly detailed = [3, 7, 11, 19].map(s => this.owner.geometry(earthGeometry(s, 2)));
  private readonly slabs: Mesh[] = [];
  private readonly boulders: Mesh[] = [];
  private readonly aura = new Group();
  private readonly auraStones: Mesh[] = [];
  private readonly auraRing: Mesh;
  private readonly meteor = new EarthMeteor(this.geometries, this.stone, this.detailed);
  private readonly impact = new EarthImpact(this.owner, this.geometries[1], this.stone);
  private readonly light = new PointLight('#ffb643', 0, 32, 2);
  private readonly hand = new Vector3();
  private readonly ripplePoint = new Vector3();
  private readonly milestones = new Set<number>();
  constructor(private readonly context: AbilityCastContext, private readonly target: Vector3) {
    this.owner.root.position.copy(target); context.scene.add(this.owner.root); this.owner.root.add(this.meteor.root, this.light); this.light.position.y = 12;
    for (let i = 0; i < 8; i++) { const m = new Mesh(this.geometries[i % 4], this.stone); this.slabs.push(m); this.owner.root.add(m); }
    for (let i = 0; i < 16; i++) { const m = new Mesh(this.geometries[(i + 1) % 4], this.stone); this.boulders.push(m); this.owner.root.add(m); }
    const glow = this.owner.material(new MeshBasicMaterial({ color: '#ffc56a', transparent: true, opacity: .8, depthWrite: false, blending: AdditiveBlending }));
    this.auraRing = new Mesh(this.owner.geometry(new TorusGeometry(.32, .012, 6, 40)), glow); this.aura.add(this.auraRing);
    for (let i = 0; i < 8; i++) { const m = new Mesh(this.geometries[i % 4], this.stone); m.scale.setScalar(.07 + hash(i) * .055); this.auraStones.push(m); this.aura.add(m); }
    context.scene.add(this.aura); this.update(0, context.time);
  }
  get particleCount(): number { return this.impact.dust.mesh.count + this.impact.sparks.mesh.count + this.impact.splash.mesh.count; }
  get instanceCount(): number { return this.particleCount + (this.impact.debris.visible ? this.impact.debris.count : 0); }
  update(delta: number, _elapsed: number): boolean {
    if (this.disposed) return false; this.age += Math.max(0, Number.isFinite(delta) ? delta : 0); const t = this.age;
    if (t >= EARTHBREAKER.lifetime) return false;
    const q = EARTH_QUALITY[this.context.quality.preset], fade = 1 - ease((t - 7.1) / .9);
    this.stone.uniforms.uDetail.value = this.context.quality.preset === 'LOW' ? 1 : this.context.quality.preset === 'MEDIUM' ? 2 : 3; this.stone.uniforms.uTime.value = t; this.stone.uniforms.uFade.value = fade; this.stone.uniforms.uEnergy.value = (.22 + ease((t - 3) / .7) * 1.4) * (1 - ease((t - 4.4) / 3));
    this.context.player.visual.getRightHandWorldPosition(this.hand); this.aura.position.copy(this.hand); this.aura.visible = t < .85; this.aura.scale.setScalar(Math.max(.001, Math.sin(Math.min(1, t / .85) * Math.PI)));
    this.auraRing.rotation.set(t * 3, t * 2, t * 4);
    this.auraStones.forEach((m, i) => { const a = i * Math.PI / 4 + t * 4; m.position.set(Math.cos(a) * .33, Math.sin(a * 2) * .17, Math.sin(a) * .33); m.rotation.set(t + i, t * 2, i); });
    for (let i = 0; i < this.slabs.length; i++) { const m = this.slabs[i], a = i * Math.PI * 2 / q.slabs, rise = ease((t - .3 - i * .07) / .6), crumble = ease((t - 5.8 - hash(i) * .8) / 1.4); m.visible = i < q.slabs && t >= .3 + i * .07; const r = 5.5 + hash(i + 9) * 2; m.position.set(Math.cos(a) * r, -4 + rise * (5 + hash(i + 28) * 2) - crumble * 6, Math.sin(a) * r); m.rotation.set(.15 + hash(i) * .35 + crumble * .6, a + t * .03, (hash(i + 12) - .5) * .4); m.scale.set(1.5 + hash(i), 3 + hash(i + 8) * 1.5, 1.2); }
    const convergence = ease((t - 1.8) / 1.2);
    for (let i = 0; i < this.boulders.length; i++) { const m = this.boulders[i], a = i * 2.39996 + t * .22, rise = ease((t - .8 - i * .025) / 1.25), r = (9 + hash(i + 7) * 4) * (1 - convergence); m.visible = i < q.boulders && t >= .8 && t < 3; m.position.set(Math.cos(a) * r, -2 + rise * (7 + hash(i + 31) * 5) + convergence * 4, Math.sin(a) * r); const size = (1 + hash(i + 81) * 1.3) * (1 - convergence * .65); m.scale.set(size, size * .8, size * 1.1); m.rotation.set(t * .3 + i, t * .4 + i * 2, i * .7); }
    this.meteor.update(t, fade, this.context.quality.preset === 'MAX'); this.impact.update(t, q.fragments, q.dust, fade, this.context.camera);
    this.light.visible = q.lights && t < 6.5; this.light.position.y = t < 4.3 ? this.meteor.root.position.y : 2; this.light.intensity = this.light.visible ? (t < 4.3 ? ease((t - 2) / 1.7) * 16 : Math.max(0, 1 - (t - 4.3) / 2.2) * 45) : 0;
    this.emitMilestones(t, q.slabs);
    return true;
  }
  private emitMilestones(t: number, slabs: number): void {
    for (let i = 0; i < 8; i++) if (t >= .3 + i * .07 && i < slabs && !this.milestones.has(i)) { this.milestones.add(i); const a = i * Math.PI * 2 / slabs; this.ripplePoint.copy(this.target); this.ripplePoint.x += Math.cos(a) * 6; this.ripplePoint.z += Math.sin(a) * 6; this.context.water?.addRipple({ position: this.ripplePoint, strength: .35, duration: 2, waveSpeed: 5, wavelength: .7 }, this); }
    for (let i = 0; i < 4; i++) if (t >= 5.5 + i * .22 && !this.milestones.has(30 + i)) { this.milestones.add(30 + i); const a = i * 2.39996; this.ripplePoint.copy(this.target); this.ripplePoint.x += Math.cos(a) * (11 + i * 2); this.ripplePoint.z += Math.sin(a) * (11 + i * 2); this.context.water?.addRipple({ position: this.ripplePoint, strength: .3, duration: 1.5, waveSpeed: 6, wavelength: .6 }, this); }
    for (let i = 0; i < 5; i++) { const threshold = [3.7, 4.3, 4.55, 5.1, 5.7][i], id = 20 + i; if (t >= threshold && !this.milestones.has(id)) { this.milestones.add(id); this.context.water?.addRipple({ position: this.target, strength: i === 1 ? 1.1 : .45, duration: Math.min(3.4, 8 - threshold), waveSpeed: i === 0 ? 4 : 13 + i * 2, wavelength: 1.1, radius: 2.5 }, this); if (i === 1) this.context.cameraFeedback?.(.008, .3); } }
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.context.water?.removeOwner(this); this.aura.removeFromParent(); this.aura.clear(); this.owner.dispose(); }
}
