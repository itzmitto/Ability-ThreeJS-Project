/** Human scale and bounded visual corrections. Gameplay speeds stay in GAME_CONFIG. */
export const CHARACTER_CONFIG = {
  height: 1.82, blendRate: 11, walkToRunStart: 2.4, walkToRunEnd: 4.2,
  breathing: .004, lean: .075, headYaw: .42, headPitch: .15,
  footCorrection: .10, plantCorrection: .07, contactBlend: 16,
  surfaceFollow: 12, castAttack: .11, castRecovery: .22,
} as const;
export type CastStyle = 'projectile' | 'strike' | 'heavy' | 'summon';
/** Animation metadata only. Authoritative spell timing/cooldowns are untouched. */
export function characterCastStyle(id: string): CastStyle {
  if (['abyssal-moonfall','drowned-king','tempest-cataclysm','kraken-crown','shadow-colossus'].includes(id)) return 'summon';
  if (['worldrend','megiddo','astral-chainstorm','sanguine-eclipse'].includes(id)) return 'heavy';
  if (['ember-comet','sand-reaper','tempest-break','frost-lance','dragonfire'].includes(id)) return 'projectile';
  return 'strike';
}
export function shortestHeadingDifference(target: number, current: number): number {
  return Math.atan2(Math.sin(target-current), Math.cos(target-current));
}
