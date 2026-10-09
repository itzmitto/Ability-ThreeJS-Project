export const PRISM_RAVENSTORM = { cooldown: 9, range: 62, lifetime: 8, pulse: 7.05 } as const;
export const RAVENSTORM_QUALITY = {
  LOW: { shots:120, variants:3, final:20, trails:1, impacts:32, dust:60 },
  MEDIUM: { shots:260, variants:4, final:28, trails:2, impacts:64, dust:140 },
  MAX: { shots:500, variants:5, final:40, trails:3, impacts:100, dust:240 },
} as const;
export type RavenstormBudget = (typeof RAVENSTORM_QUALITY)[keyof typeof RAVENSTORM_QUALITY];
