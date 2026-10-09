import type { QualityPreset } from '../../quality/QualityPreset';
export const EARTHBREAKER = { cooldown: 7, range: 48, lifetime: 8, impact: 4.3 } as const;
export const EARTH_QUALITY = {
  LOW: { slabs: 4, boulders: 6, fragments: 20, dust: 80, lights: false },
  MEDIUM: { slabs: 6, boulders: 10, fragments: 60, dust: 220, lights: false },
  MAX: { slabs: 8, boulders: 16, fragments: 120, dust: 450, lights: true },
} satisfies Record<QualityPreset, { slabs: number; boulders: number; fragments: number; dust: number; lights: boolean }>;
