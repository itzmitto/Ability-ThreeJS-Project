import type { QualityConfig } from "../../quality/QualityPreset";
export const ABYSSAL = {
  cooldown: 6,
  range: 42,
  lifetime: 8.6,
  eruption: 0.62,
  radius: 4.7,
} as const;
export interface FireQuality {
  detail: number;
  secondary: number;
  pockets: number;
  layers: number;
  smoke: number;
  embers: number;
  light: number;
}
export function fireQuality(c: Readonly<QualityConfig>): FireQuality {
  const d =
    c.effectParticleBudget <= 150 ? 0 : c.effectParticleBudget <= 400 ? 1 : 2;
  return {
    detail: d,
    secondary: [3, 6, 9][d],
    pockets: [10, 22, 38][d],
    layers: [2, 3, 4][d],
    smoke: [12, 28, 48][d],
    embers: [150, 400, 900][d],
    light: [100, 180, 260][d],
  };
}
export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Peripheral fuel runs out first; the center retains hot pockets and final flickers. */
export function burnStrength(age: number, radius = 0): number {
  return (
    smooth(0.45, 0.85, age) *
    (1 -
      smooth(
        4.5 + (1 - Math.min(1, radius / 4.7)) * 1.2,
        6.1 + (1 - Math.min(1, radius / 4.7)) * 1.6,
        age,
      ))
  );
}
