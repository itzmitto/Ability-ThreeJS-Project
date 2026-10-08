export const SANGUINE = {
  cooldown: 14,
  range: 60,
  lifetime: 16,
  impact: 10.1,
  elevation: 12.5,
  diameter: 13,
  tidalRadius: 22,
} as const;
export function smooth(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function pulse(
  a: number,
  b: number,
  c: number,
  d: number,
  t: number,
): number {
  return smooth(a, b, t) * (1 - smooth(c, d, t));
}
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
