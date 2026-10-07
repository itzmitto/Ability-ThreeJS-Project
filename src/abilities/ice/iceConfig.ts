import type { QualityConfig } from '../../quality/QualityPreset';

export const GLACIAL_CONFIG = { range: 32, cooldown: 2.5, lifetime: 5, radius: 3.4 } as const;
export interface IceQuality { spikes: number; shards: number; snow: number; mist: number; detail: number; light: number; }
/** One implementation derives its live settings from the existing shared VFX budget. */
export function iceQuality(config: Readonly<QualityConfig>): IceQuality {
  const max = config.effectParticleBudget >= 900; const medium = config.effectParticleBudget >= 400;
  return { spikes: max ? 16 : medium ? 10 : 6, shards: max ? 84 : medium ? 42 : 20, snow: max ? 420 : medium ? 210 : 80, mist: max ? 20 : medium ? 12 : 5, detail: max ? 3 : medium ? 2 : 1, light: max ? 90 : medium ? 60 : 28 };
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}
export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
export function smooth(start: number, end: number, value: number): number { const x = clamp01((value - start) / (end - start)); return x * x * (3 - 2 * x); }
