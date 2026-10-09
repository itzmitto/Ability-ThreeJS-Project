export const DRAGONFIRE={cooldown:5,range:32,lifetime:4.5,launch:.32,releaseEnd:2.2,speed:30,packets:44} as const;
export const DRAGONFIRE_QUALITY={
  LOW:{layers:3,flames:80,sparks:40,smoke:10,steam:24},
  MEDIUM:{layers:5,flames:160,sparks:70,smoke:20,steam:48},
  MAX:{layers:7,flames:280,sparks:110,smoke:32,steam:80},
} as const;
export type FireBudget=(typeof DRAGONFIRE_QUALITY)[keyof typeof DRAGONFIRE_QUALITY];
