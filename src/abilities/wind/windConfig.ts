import type { QualityConfig } from "../../quality/QualityPreset";

export const TEMPEST = {
  range: 40,
  speed: 36,
  cooldown: 2,
  charge: 0.28,
  compression: 0.085,
  residual: 2.05,
} as const;
export interface WindQuality {
  ribbons: number;
  rings: number;
  flight: number;
  blast: number;
  vortex: number;
  mist: number;
  detail: number;
  light: number;
}
/** One implementation, scaled by the shared effect budget. */
export function windQuality(config: Readonly<QualityConfig>): WindQuality {
  if (config.effectParticleBudget <= 150)
    return {
      ribbons: 2,
      rings: 8,
      flight: 60,
      blast: 90,
      vortex: 2,
      mist: 4,
      detail: 0,
      light: 0,
    };
  if (config.effectParticleBudget <= 400)
    return {
      ribbons: 4,
      rings: 12,
      flight: 140,
      blast: 240,
      vortex: 4,
      mist: 10,
      detail: 1,
      light: 3,
    };
  return {
    ribbons: 6,
    rings: 20,
    flight: 260,
    blast: 480,
    vortex: 7,
    mist: 18,
    detail: 2,
    light: 5,
  };
}
export const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));
export const fade = (start: number, end: number, value: number): number => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
