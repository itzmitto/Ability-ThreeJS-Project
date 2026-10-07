import type { WebGLRenderer } from 'three';

export interface PerformanceStats { fps: number; frameTime: number; particles: number; instances: number; calls: number; triangles: number; }
export class PerformanceManager {
  readonly stats: PerformanceStats = { fps: 0, frameTime: 0, particles: 0, instances: 0, calls: 0, triangles: 0 };
  private frames = 0;
  private duration = 0;
  sample(delta: number, renderer: WebGLRenderer, particles: number, instances: number): boolean {
    this.frames++; this.duration += delta;
    if (this.duration < 0.5) return false;
    this.stats.fps = Math.round(this.frames / this.duration);
    this.stats.frameTime = this.duration * 1000 / this.frames;
    this.stats.particles = particles; this.stats.instances = instances;
    this.stats.calls = renderer.info.render.calls; this.stats.triangles = renderer.info.render.triangles;
    this.frames = 0; this.duration = 0; return true;
  }
  reset(): void { this.frames = 0; this.duration = 0; }
}
