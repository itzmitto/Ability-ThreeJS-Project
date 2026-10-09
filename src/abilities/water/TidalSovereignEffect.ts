import { Group, Mesh, MeshBasicMaterial, PointLight, SphereGeometry, Vector3 } from 'three';
import type { ManagedEffect } from '../../effects/EffectManager';
import type { AbilityCastContext } from '../Ability';
import { VisualOwner, ease, hash } from '../elemental/ElementalVisuals';
import { TIDAL, TIDAL_QUALITY } from './TidalSovereignConfig';
import { TidalWave, waterShell } from './TidalWave';
import { WaterBladeBarrage } from './WaterBlade';
import { WaterImpact } from './WaterImpact';
import { waterMagicMaterial } from './WaterMagicMaterials';
export class TidalSovereignEffect implements ManagedEffect {
  private age = 0;
  private disposed = false;
  private readonly owner = new VisualOwner();
  private readonly wave = new TidalWave(this.owner);
  private readonly barrage = new WaterBladeBarrage(this.owner);
  private readonly impact = new WaterImpact(this.owner);
  private readonly aura = new Group();
  private readonly auraMaterial = this.owner.material(waterMagicMaterial(2));
  private readonly droplets: Mesh[] = [];
  private readonly streams: Mesh[] = [];
  private readonly bulge: Mesh;
  private readonly light = new PointLight('#72e2ff', 0, 35, 2);
  private readonly hand = new Vector3();
  private readonly ripplePoint = new Vector3();
  private readonly milestones = new Set<number>();
  constructor(private readonly context: AbilityCastContext, private readonly target: Vector3) {
    this.owner.root.position.copy(target); const direction = new Vector3().subVectors(target, context.player.position); this.owner.root.rotation.y = Math.atan2(direction.x, direction.z); context.scene.add(this.owner.root); this.owner.root.add(this.light); this.light.position.y = 4;
    const drop = this.owner.geometry(new SphereGeometry(1, 12, 8)), dropMat = this.owner.material(new MeshBasicMaterial({ color: '#9de7f4', transparent: true, opacity: .7, depthWrite: false }));
    for (let i = 0; i < 12; i++) { const m = new Mesh(drop, dropMat); this.droplets.push(m); this.aura.add(m); }
    const ribbon = this.owner.geometry(waterShell(40, 4));
    for (let i = 0; i < 3; i++) { const m = new Mesh(ribbon, this.auraMaterial); m.rotation.set(i * Math.PI / 3, i * .8, i); this.aura.add(m); }
    const core = new Mesh(drop, dropMat); core.scale.setScalar(.12); this.aura.add(core); context.scene.add(this.aura);
    this.bulge = new Mesh(this.owner.geometry(waterShell(48, 16)), this.owner.material(waterMagicMaterial(4))); this.bulge.frustumCulled = false; this.owner.root.add(this.bulge);
    const streamGeometry = this.owner.geometry(waterShell(30, 5));
    const streamMat = this.owner.material(waterMagicMaterial(1));
    for (let i = 0; i < 5; i++) { const m = new Mesh(streamGeometry, streamMat); const a = i * Math.PI * 2 / 5; m.position.set(Math.cos(a) * 5, 1.2, Math.sin(a) * 5); m.rotation.set(.4, a, Math.PI / 2); this.streams.push(m); this.owner.root.add(m); }
    this.update(0, context.time);
  }
  get particleCount(): number { return this.impact.spray.mesh.count + this.impact.mist.mesh.count + this.barrage.trails.count; }
  get instanceCount(): number { return this.particleCount; }
  update(delta: number, _elapsed: number): boolean {
    if (this.disposed) return false; this.age += Math.max(0, Number.isFinite(delta) ? delta : 0); const t = this.age;
    if (t >= TIDAL.lifetime) return false;
    const preset = this.context.quality.preset, q = TIDAL_QUALITY[preset], fade = 1 - ease((t - 5.8) / 1.2);
    this.context.player.visual.getRightHandWorldPosition(this.hand); this.aura.position.copy(this.hand); this.aura.visible = t < 1.1; this.aura.scale.setScalar(Math.max(.001, ease(t / .2) * (1 - ease((t - .7) / .4)))); this.aura.rotation.set(t * .8, t * 1.2, t * .4); this.auraMaterial.uniforms.uTime.value = t; this.auraMaterial.uniforms.uFade.value = 1;
    this.droplets.forEach((m, i) => { const a = i * 2.39996 + t * 4, r = .22 + hash(i) * .15; m.position.set(Math.cos(a) * r, Math.sin(a * .8) * .27, Math.sin(a) * r); const s = .025 + hash(i + 2) * .04; m.scale.set(s, s * 1.5, s); });
    this.wave.update(t, preset, fade); this.barrage.update(t, q.blades, fade); this.impact.update(t, q.spray, q.mist, q.detail, fade, this.context.camera);
    this.bulge.visible = t >= .3 && t < 1.9; const bulgeMat = this.bulge.material as ReturnType<typeof waterMagicMaterial>; bulgeMat.uniforms.uTime.value = t; bulgeMat.uniforms.uRise.value = ease((t - .3) / 1.1); bulgeMat.uniforms.uFade.value = ease((t - .3) / .5) * (1 - ease((t - 1.2) / .7)) * .55; this.bulge.scale.set(1, 1, 1);
    this.streams.forEach((m, i) => { m.visible = t >= .5 && t < 2; const s = ease((t - .5 - i * .05) / .5) * (1 - ease((t - 1.45) / .55)); m.scale.set(s * .55, s * 1.4, s * .7); (m.material as ReturnType<typeof waterMagicMaterial>).uniforms.uTime.value = t; });
    this.light.visible = q.lights && t < 6.3; this.light.intensity = this.light.visible ? (t < 3.7 ? ease((t - .3) / 1.4) * 7 : (1 - ease((t - 3.7) / 2.6)) * 24) * fade : 0;
    this.emitMilestones(t, q.blades); return true;
  }
  private emitMilestones(t: number, blades: number): void {
    for (let i = 0; i < blades; i++) { const id = 10 + i; if (t >= 2.27 + i * .095 && !this.milestones.has(id)) { this.milestones.add(id); this.ripplePoint.copy(this.target); this.ripplePoint.x += (hash(i + 4) - .5) * 4; this.ripplePoint.z += (hash(i + 17) - .5) * 4; this.context.water?.addRipple({ position: this.ripplePoint, strength: .35, duration: 1.3, waveSpeed: 8, wavelength: .35 }, this); } }
    const timings = [.3, .85, 1.5, 3.35, 3.7, 4.2, 4.8, 5.4, 6];
    for (let i = 0; i < timings.length; i++) if (t >= timings[i] && !this.milestones.has(i)) { this.milestones.add(i); this.context.water?.addRipple({ position: this.target, strength: i === 4 ? .95 : i > 5 ? -.22 : .35, duration: Math.min(2.8, 7 - timings[i]), waveSpeed: i > 5 ? 2.5 : i === 4 ? 17 : 5, wavelength: i === 4 ? 1.3 : .6, radius: i > 5 ? 5 : 1 }, this); if (i === 4) this.context.cameraFeedback?.(.0055, .22); }
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.context.water?.removeOwner(this); this.aura.removeFromParent(); this.aura.clear(); this.owner.dispose(); }
}
