import type { QualityConfig } from '../../quality/QualityPreset';
export const RIFT_CAST = { cooldown: 10, range: 55, speed: 55, release: .3, maximumActive: 2 } as const;
export const RIFT_DEFAULTS = {
  height: 18, width: 8, depth: 2.8, edgeThickness: .28, jaggedness: .28,
  edgeGlow: 1.2, voidBrightness: .32, noiseScale: .8, turbulence: .6,
  shardOrbitRadius: 1.8, slashLength: 10, slashWidth: 1.1, slashSpeed: 28,
  slashInterval: .55, rippleStrength: .85, impactIntensity: 1, aftermath: 1.6,
};
export type RiftConfig = typeof RIFT_DEFAULTS;
export function validateRiftConfig(patch: Partial<RiftConfig>, current: RiftConfig = RIFT_DEFAULTS): RiftConfig {
  const result = { ...current, ...patch };
  const bounds: Record<keyof RiftConfig, readonly [number, number]> = {
    height:[8,22],width:[3,10],depth:[1,5],edgeThickness:[.12,.6],jaggedness:[.05,.45],
    edgeGlow:[.1,2],voidBrightness:[.05,.6],noiseScale:[.1,3],turbulence:[0,1],
    shardOrbitRadius:[.3,3],slashLength:[5,14],slashWidth:[.4,2],slashSpeed:[20,45],
    slashInterval:[.4,.7],rippleStrength:[.1,1.5],impactIntensity:[.2,1.5],aftermath:[1.2,2],
  };
  for (const key of Object.keys(bounds) as (keyof RiftConfig)[]) {
    if (!Number.isFinite(result[key])) throw new Error(`Nonfinite Riftreaver ${key}`);
    result[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], result[key]));
  }
  return result;
}
export function riftQuality(q: Readonly<QualityConfig>) {
  const detail = q.waterDetail <= 1 ? 0 : q.waterDetail < 3 ? 1 : 2;
  return { detail, segments:[24,40,60][detail], shards:[30,60,105][detail], particles:[280,680,1300][detail], branches:[4,7,10][detail], light:detail>0 };
}
export type RiftQuality = ReturnType<typeof riftQuality>;
export const riftSeed = (n: number): number => { const x = Math.sin(n*127.1+71.7)*43758.5453; return x-Math.floor(x); };
export const riftEase = (t: number): number => { const x=Math.max(0,Math.min(1,t)); return x*x*(3-2*x); };
export function riftPhase(age:number, arrival:number, c:RiftConfig): string {
  const t=age-arrival;
  if(age<RIFT_CAST.release)return 'incision'; if(t<0)return 'travel';
  if(t<.65)return 'opening';if(t<1.5)return 'instability';
  if(t<1.5+2*c.slashInterval+.8)return 'slashes';if(t<3.8)return 'collapse';
  if(t<4.15)return 'implosion';return t<3.8+c.aftermath?'aftermath':'complete';
}
