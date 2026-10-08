import type { QualityConfig } from "../../quality/QualityPreset";
export interface WaterQuality {
  detail: number;
  rippleCapacity: number;
  lightCapacity: number;
  reflectionSize: number;
  reflectionInterval: number;
}
const tiers: readonly WaterQuality[] = [
  {
    detail: 1,
    rippleCapacity: 8,
    lightCapacity: 4,
    reflectionSize: 0,
    reflectionInterval: 0,
  },
  {
    detail: 2,
    rippleCapacity: 20,
    lightCapacity: 8,
    reflectionSize: 384,
    reflectionInterval: 3,
  },
  {
    detail: 3,
    rippleCapacity: 32,
    lightCapacity: 12,
    reflectionSize: 768,
    reflectionInterval: 2,
  },
];
export function waterQuality(c: Readonly<QualityConfig>): WaterQuality {
  return tiers[Math.max(0, Math.min(2, c.waterDetail - 1))];
}
