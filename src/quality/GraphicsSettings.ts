import { QUALITY_PRESETS } from './QualityPreset';
import type { QualityConfig, QualityPreset } from './QualityPreset';

export class GraphicsSettings {
  private listeners = new Set<(config: Readonly<QualityConfig>) => void>();
  private current: QualityPreset = 'MEDIUM';
  mouseSensitivity = 1;
  constructor() {
    try {
      const saved = localStorage.getItem('elemental-quality');
      if (saved === 'LOW' || saved === 'MEDIUM' || saved === 'MAX') this.current = saved;
    } catch { /* Storage may be unavailable in private browsers. */ }
  }
  get preset(): QualityPreset { return this.current; }
  get config(): Readonly<QualityConfig> { return QUALITY_PRESETS[this.current]; }
  /** Read-only lifecycle diagnostic for acceptance tests and development tools. */
  get subscriberCount(): number { return this.listeners.size; }
  setPreset(preset: QualityPreset): void {
    if (this.current === preset) return;
    this.current = preset;
    try { localStorage.setItem('elemental-quality', preset); } catch { /* Optional persistence. */ }
    this.listeners.forEach(listener => listener(this.config));
  }
  subscribe(listener: (config: Readonly<QualityConfig>) => void): () => void {
    this.listeners.add(listener);
    listener(this.config);
    return () => this.listeners.delete(listener);
  }
  dispose(): void { this.listeners.clear(); }
}
