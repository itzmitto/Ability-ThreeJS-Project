export const KRAKEN = { cooldown: 12, range: 60, lifetime: 11, radius: 10.5, finale: 7.85 } as const;
export const KRAKEN_QUALITY = {
  LOW: { arms: 5, whips: 2, rings: 24, sides: 8, noise: 2, snow: 65, spray: 100, ink: 24, impacts: 10 },
  MEDIUM: { arms: 9, whips: 4, rings: 36, sides: 12, noise: 3, snow: 150, spray: 260, ink: 56, impacts: 18 },
  MAX: { arms: 16, whips: 8, rings: 48, sides: 16, noise: 4, snow: 300, spray: 550, ink: 100, impacts: 28 },
} as const;
export type KrakenBudget = (typeof KRAKEN_QUALITY)[keyof typeof KRAKEN_QUALITY];
