import type { QualityConfig } from '../../quality/QualityPreset';

export const COMET_CAST = { range: 48, cooldown: 4, release: .4, residual: 2.6, maximumActive: 2 } as const;
export const COMET_DEFAULTS = {
  projectileRadius: .82, shellPieceCount: 10, coreGlow: 1.35, shellCrackGlow: 1.1,
  trailLength: 6.2, trailWidth: .62, emberRate: 210, sparkRate: 95,
  fragmentCount: 48, impactFlash: 1.1, impactRadius: 3.8,
  waterRippleStrength: .19, steamAmount: 1, flightSpeed: 44,
};
export type CometConfig = typeof COMET_DEFAULTS;
const limits: Record<keyof CometConfig, readonly [number, number]> = {
  projectileRadius: [.55, 1.2], shellPieceCount: [4, 12], coreGlow: [.5, 2], shellCrackGlow: [.2, 2],
  trailLength: [3, 9], trailWidth: [.25, .9], emberRate: [60, 320], sparkRate: [20, 180],
  fragmentCount: [12, 60], impactFlash: [.4, 1.8], impactRadius: [2.2, 5],
  waterRippleStrength: [.08, .3], steamAmount: [.3, 1.4], flightSpeed: [30, 60],
};
export function validateCometConfig(patch: Partial<CometConfig>, base: Readonly<CometConfig> = COMET_DEFAULTS): CometConfig {
  const next = { ...base };
  for (const key of Object.keys(patch) as (keyof CometConfig)[]) {
    const value = patch[key];
    if (!limits[key] || typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`Invalid Ember Comet control: ${key}`);
    next[key] = Math.max(limits[key][0], Math.min(limits[key][1], value));
  }
  next.shellPieceCount = Math.round(next.shellPieceCount); next.fragmentCount = Math.round(next.fragmentCount);
  return next;
}
export function cometQuality(q: Readonly<QualityConfig>, c: Readonly<CometConfig>) {
  const detail = q.waterDetail - 1;
  return { detail, shell: Math.min(c.shellPieceCount, [6, 8, 12][detail]),
    fragments: Math.min(c.fragmentCount, [16, 30, 60][detail]),
    glowParticles: [108, 260, 520][detail], vaporParticles: [42, 80, 180][detail],
    tailLayers: [2, 3, 4][detail], light: detail > 0 };
}
export type CometQuality = ReturnType<typeof cometQuality>;
export const cometSeed = (n: number): number => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export const cometEase = (n: number): number => { const x = Math.max(0, Math.min(1, n)); return x * x * (3 - 2 * x); };
