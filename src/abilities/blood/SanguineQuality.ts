import type { QualityConfig } from "../../quality/QualityPreset";
export interface BloodQuality {
  detail: number;
  streams: number;
  lances: number;
  ribbons: number;
  droplets: number;
  mist: number;
  lights: number;
}
const tiers: readonly BloodQuality[] = [
  {
    detail: 0,
    streams: 6,
    lances: 8,
    ribbons: 4,
    droplets: 240,
    mist: 8,
    lights: 1,
  },
  {
    detail: 1,
    streams: 10,
    lances: 16,
    ribbons: 8,
    droplets: 720,
    mist: 20,
    lights: 2,
  },
  {
    detail: 2,
    streams: 18,
    lances: 28,
    ribbons: 14,
    droplets: 1800,
    mist: 36,
    lights: 3,
  },
];
export function bloodQuality(c: Readonly<QualityConfig>): BloodQuality {
  return tiers[
    c.effectParticleBudget <= 150 ? 0 : c.effectParticleBudget <= 400 ? 1 : 2
  ];
}
