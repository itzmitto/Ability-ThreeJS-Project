import { Group, PointLight } from 'three';
import type { Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { IceSpikeField } from './IceSpikeField';
import { FrostGroundEffect } from './FrostGroundEffect';
import { FrostTrail } from './FrostTrail';
import { IceShardEmitter } from './IceShardEmitter';
import { ColdMist } from './ColdMist';
import { FrostParticles } from './FrostParticles';
import { ImpactGlow } from './ImpactGlow';
import type { IceResources } from './IceResources';
import { GLACIAL_CONFIG, iceQuality, smooth } from './iceConfig';

export class GlacialEruptionEffect implements ManagedEffect {
  readonly root = new Group();
  readonly spikes: IceSpikeField;
  readonly shards: IceShardEmitter;
  readonly mist: ColdMist;
  readonly snow: FrostParticles;
  private readonly frost: FrostGroundEffect;
  private readonly trail: FrostTrail;
  private readonly glow: ImpactGlow;
  private readonly light = new PointLight('#83ddff', 0, 15, 2);
  private readonly unsubscribe: () => void;
  private time = 0;
  private lightStrength = 60;
  private shook = false;
  private disposed = false;
  constructor(private readonly context: AbilityCastContext, private readonly target: Vector3, resources: IceResources, seed: number) {
    this.root.name = 'Glacial Eruption'; this.root.position.copy(target); context.scene.add(this.root);
    this.spikes = new IceSpikeField(this.root, resources.crystal, seed);
    this.shards = new IceShardEmitter(this.root, resources.crystal, seed);
    this.frost = new FrostGroundEffect(this.root, resources.plane);
    this.trail = new FrostTrail(this.root, resources.plane, context.player, target);
    this.mist = new ColdMist(this.root, seed);
    this.snow = new FrostParticles(this.root, seed);
    this.glow = new ImpactGlow(this.root, resources.plane);
    this.light.position.y = 1.8; this.light.castShadow = false; this.root.add(this.light);
    this.unsubscribe = context.quality.subscribe(config => {
      const quality = iceQuality(config);
      this.spikes.setQuality(quality.spikes, quality.detail); this.shards.setQuality(quality.shards);
      this.mist.setQuality(quality.mist); this.snow.setQuality(quality.snow, Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, config.pixelRatio));
      this.frost.setQuality(quality.detail); this.glow.setQuality(quality.detail); this.lightStrength = quality.light;
    });
    this.update(0, context.time);
  }
  get particleCount(): number { return this.snow.points.visible ? this.snow.count : 0; }
  get instanceCount(): number { return (this.spikes.mesh.visible ? this.spikes.mesh.count : 0) + (this.shards.mesh.visible ? this.shards.mesh.count : 0) + (this.mist.mesh.visible ? this.mist.mesh.count : 0); }
  update(deltaTime: number, _elapsedTime: number): boolean {
    if (this.disposed) return false;
    this.time += deltaTime;
    if (this.time >= GLACIAL_CONFIG.lifetime) return false;
    this.spikes.update(this.time); this.shards.update(this.time); this.frost.update(this.time);
    this.trail.update(this.time, this.context.camera.quaternion, this.target);
    this.mist.update(this.time); this.snow.update(this.time); this.glow.update(this.time);
    this.light.intensity = this.lightStrength * smooth(0.44, 0.57, this.time) * Math.exp(-Math.max(0, this.time - 0.6) * 4.5);
    if (this.time > 1.8) this.light.removeFromParent();
    if (!this.shook && this.time >= 0.56) {
      this.shook = true;
      const distance = this.context.player.position.distanceTo(this.target);
      this.context.cameraFeedback?.(0.0025 * Math.max(0.15, 1 - distance / 45), 0.16);
    }
    return true;
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.unsubscribe();
    this.spikes.dispose(); this.shards.dispose(); this.frost.dispose(); this.trail.dispose();
    this.mist.dispose(); this.snow.dispose(); this.glow.dispose(); this.light.dispose(); this.root.clear(); this.root.removeFromParent();
  }
}
