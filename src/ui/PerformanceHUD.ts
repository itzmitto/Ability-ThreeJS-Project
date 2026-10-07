import type { PerformanceStats } from '../game/PerformanceManager';

export class PerformanceHUD {
  readonly element = document.createElement('aside');
  private values: HTMLElement[];
  visible = true;
  constructor() {
    this.element.className = 'performance-panel';
    this.element.setAttribute('aria-label', 'Performance');
    this.element.innerHTML = `<div class="panel-heading"><span class="status-dot"></span> TELEMETRY <span class="panel-hint">P</span></div><dl>${['FPS', 'Frame time', 'Particles', 'Instances', 'Draw calls', 'Triangles'].map(name => `<div><dt>${name}</dt><dd>—</dd></div>`).join('')}</dl>`;
    this.values = Array.from(this.element.querySelectorAll('dd'));
  }
  update(stats: PerformanceStats): void {
    const values = [String(stats.fps), `${stats.frameTime.toFixed(1)} ms`, String(stats.particles), String(stats.instances), String(stats.calls), stats.triangles.toLocaleString()];
    this.values.forEach((element, index) => { element.textContent = values[index]; });
  }
  toggle(): void { this.visible = !this.visible; this.element.hidden = !this.visible; }
}
