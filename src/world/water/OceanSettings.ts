export const OCEAN_DEFAULTS = {
  amplitude: 1, wavelength: 1, steepness: .55, direction: 0, swellSpeed: 1, mediumSpeed: 1,
  microIntensity: .65, normalScale: 1, roughness: .22, reflectionIntensity: .9, fresnelStrength: 1, specularSharpness: 1,
  deepColor: '#050b12', surfaceColor: '#102637', reflectionTint: '#7895aa', foamColor: '#dceaf2',
  foamIntensity: .3, foamThreshold: .035, rippleStrength: 1, rippleSpeed: 1, rippleDecay: 1, splashDensity: 1,
  waveQuality: 5, normalQuality: 3, maxRipples: 32,
} as const;
export type OceanSettings = { -readonly [K in keyof typeof OCEAN_DEFAULTS]: typeof OCEAN_DEFAULTS[K] extends number ? number : string };
export const OCEAN_LIMITS: Record<Exclude<keyof OceanSettings, 'deepColor' | 'surfaceColor' | 'reflectionTint' | 'foamColor'>, readonly [number, number, number]> = {
  amplitude: [0, 1.8, .05], wavelength: [.5, 2.5, .05], steepness: [0, .9, .05], direction: [-180, 180, 5], swellSpeed: [.1, 2, .05], mediumSpeed: [.1, 2, .05],
  microIntensity: [0, 1.5, .05], normalScale: [.3, 2, .05], roughness: [.12, .5, .01], reflectionIntensity: [0, 1.5, .05], fresnelStrength: [.3, 1.5, .05], specularSharpness: [.5, 2, .05],
  foamIntensity: [0, 1, .05], foamThreshold: [.005, .15, .005], rippleStrength: [0, 2, .05], rippleSpeed: [.3, 2, .05], rippleDecay: [.3, 2, .05], splashDensity: [0, 2, .1],
  waveQuality: [2, 5, 1], normalQuality: [1, 3, 1], maxRipples: [1, 32, 1],
};
export function validateOcean(patch: Partial<OceanSettings>, current: Readonly<OceanSettings>): OceanSettings {
  const result = { ...current };
  for (const key of Object.keys(patch) as (keyof OceanSettings)[]) {
    if (!Object.hasOwn(current, key)) throw new RangeError(`Unknown ocean setting ${key}`);
    const value = patch[key]; if (typeof result[key] === 'string') {
      if (typeof value !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(value)) throw new RangeError(`Invalid ocean color ${key}`);
      Object.assign(result, { [key]: value });
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`Invalid ocean value ${key}`);
      const bounds = OCEAN_LIMITS[key as keyof typeof OCEAN_LIMITS];
      Object.assign(result, { [key]: Math.max(bounds[0], Math.min(bounds[1], value)) });
    }
  }
  result.waveQuality = Math.round(result.waveQuality); result.normalQuality = Math.round(result.normalQuality); result.maxRipples = Math.round(result.maxRipples);
  return result;
}
