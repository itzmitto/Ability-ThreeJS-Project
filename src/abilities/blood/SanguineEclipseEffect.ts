import { Quaternion, Vector3 } from "three";
import type { ManagedEffect } from "../../effects/EffectManager";
import type { AbilityCastContext } from "../Ability";
import { SANGUINE, pulse } from "./SanguineEclipseConfig";
import { SanguineTimeline } from "./SanguineTimeline";
import { bloodQuality } from "./SanguineQuality";
import type { BloodQuality } from "./SanguineQuality";
import type {
  BloodResourceManager,
  BloodVisuals,
} from "./BloodResourceManager";
import { BloodWaterInteraction } from "./BloodWaterInteraction";
export class SanguineEclipseEffect implements ManagedEffect {
  readonly timeline = new SanguineTimeline();
  readonly target = new Vector3();
  readonly hand = new Vector3();
  readonly water: BloodWaterInteraction;
  private readonly inverse = new Quaternion();
  private readonly worldPoint = new Vector3();
  private q!: BloodQuality;
  private disposed = false;
  private feedback = 0;
  private readonly unsubscribe: () => void;
  constructor(
    private readonly context: AbilityCastContext,
    private readonly resources: BloodResourceManager,
    readonly visuals: BloodVisuals,
    target: Vector3,
  ) {
    this.target.copy(target);
    const v = visuals;
    v.root.position.copy(target);
    v.root.rotation.set(
      0,
      Math.atan2(
        context.player.position.x - target.x,
        context.player.position.z - target.z,
      ),
      0,
    );
    this.inverse.copy(v.root.quaternion).invert();
    v.root.visible = true;
    context.scene.add(v.root);
    this.water = new BloodWaterInteraction(context.water, this.target);
    this.unsubscribe = context.quality.subscribe((c) => {
      this.q = bloodQuality(c);
    });
    this.update(0, context.time);
  }
  get age(): number {
    return this.timeline.age;
  }
  get particleCount(): number {
    return this.q.droplets;
  }
  get instanceCount(): number {
    return this.q.droplets + this.q.mist + this.q.lances;
  }
  private readonly impact = (index: number, point: Vector3): void => {
    this.worldPoint.copy(point).applyQuaternion(this.visuals.root.quaternion);
    this.water.lance(index, this.worldPoint);
    if (index === 0) this.context.cameraFeedback?.(0.0015, 0.1);
  };
  update(delta: number, _elapsed: number): boolean {
    if (this.disposed) return false;
    this.timeline.advance(delta);
    const tl = this.timeline,
      t = tl.age,
      v = this.visuals,
      q = this.q;
    if (t >= SANGUINE.lifetime) return false;
    this.context.player.visual.getRightHandWorldPosition(this.hand);
    this.hand.sub(this.target).applyQuaternion(this.inverse);
    v.aura.update(t, tl.hand, this.context.player, v.root, q.detail);
    v.field.update(t);
    v.ascension.update(t, tl.ascension, q.streams, q.detail);
    v.eclipse.update(tl, q.detail);
    v.surface.update(tl, q.detail);
    v.orbit.update(t, tl.eclipse, q.ribbons, q.detail, tl.compression);
    v.lance.update(t, q.lances, q.detail, this.impact);
    v.trails.update(t, q.lances, q.detail);
    v.lanceImpact.update(t, q.lances, q.detail);
    v.execution.update(t, q.detail);
    v.executionStreams.update(t, tl.execution, q.ribbons, q.detail);
    v.impact.update(t);
    v.sheets.update(t, q.detail === 0 ? 3 : q.detail === 1 ? 6 : 10, q.detail);
    v.splash.update(t, pulse(10.1, 10.45, 11.7, 13.2, t), q.streams, q.detail);
    v.tide.update(t, q.detail);
    v.droplets.update(t, q.droplets, q.detail, this.hand);
    v.mist.update(t, q.mist);
    v.aftermath.update(t, q.ribbons, q.detail);
    v.lights.update(t, v.root, q.lights, this.hand);
    this.water.update(t);
    const impulses = IMPULSES;
    while (this.feedback < impulses.length && t >= impulses[this.feedback]) {
      this.context.cameraFeedback?.(
        this.feedback === 1 ? 0.007 : 0.002,
        this.feedback === 1 ? 0.18 : 0.1,
      );
      this.feedback++;
    }
    return true;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.water.dispose();
    this.resources.pool.release(this.visuals);
  }
}

const IMPULSES = [4, 10.1, 10.5];
