import type { QualityPreset } from '../../quality/QualityPreset';
export const TIDAL = { cooldown: 6, range: 50, lifetime: 7, impact: 3.7 } as const;
export const TIDAL_QUALITY = {
  LOW: { blades: 3, spray: 80, mist: 20, segments: 24, rows: 20, detail: 1, lights: false },
  MEDIUM: { blades: 5, spray: 220, mist: 50, segments: 48, rows: 36, detail: 2, lights: true },
  MAX: { blades: 8, spray: 500, mist: 100, segments: 80, rows: 56, detail: 3, lights: true },
} satisfies Record<QualityPreset, { blades: number; spray: number; mist: number; segments: number; rows: number; detail: number; lights: boolean }>;
