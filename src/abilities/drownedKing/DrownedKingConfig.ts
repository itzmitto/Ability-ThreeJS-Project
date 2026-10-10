import type { QualityConfig } from '../../quality/QualityPreset';
export const KING_CAST={range:70,cooldown:30,forge:4,windup:6,strike:8,impact:9,collapse:11.5,aftermath:14.5,duration:17} as const;
export const KING_DEFAULTS={kingHeight:85,swordLength:65,swordThickness:1,armorRoughness:.44,rustStrength:.35,oxidationStrength:.3,runeBrightness:.6,runePulseSpeed:.65,eyeGlow:.7,crownScale:1,capeLength:1,capeTurbulence:1,splitLength:105,splitWidth:9,waterWallHeight:18,waterWallDuration:3.7,sprayDensity:1,fragmentCount:240};
export type KingConfig=typeof KING_DEFAULTS;
const limits:Record<keyof KingConfig,readonly[number,number]>={kingHeight:[75,92],swordLength:[58,70],swordThickness:[.7,1.4],armorRoughness:[.25,.75],rustStrength:[0,.7],oxidationStrength:[0,.6],runeBrightness:[0,1.2],runePulseSpeed:[.3,1.5],eyeGlow:[0,1.2],crownScale:[.8,1.2],capeLength:[.7,1.2],capeTurbulence:[.2,1.5],splitLength:[75,120],splitWidth:[6,13],waterWallHeight:[12,23],waterWallDuration:[3,4.5],sprayDensity:[.3,1.4],fragmentCount:[40,280]};
export function validateKingConfig(patch:Partial<KingConfig>,base:Readonly<KingConfig>=KING_DEFAULTS):KingConfig{
  const c={...base};for(const key of Object.keys(patch) as (keyof KingConfig)[]){const v=patch[key];if(!limits[key]||typeof v!=='number'||!Number.isFinite(v))throw new RangeError(`Invalid King control ${key}`);c[key]=Math.max(limits[key][0],Math.min(limits[key][1],v));}c.fragmentCount=Math.round(c.fragmentCount);return c;
}
export function kingQuality(q:Readonly<QualityConfig>,c:Readonly<KingConfig>){const tier=q.waterDetail-1;return {tier,particles:Math.min(6000,Math.round(q.effectParticleBudget*6*c.sprayDensity)),fragments:Math.min(c.fragmentCount,[48,120,240][tier]),wallSegments:[48,80,120][tier],lights:tier>0};}
export type KingQuality=ReturnType<typeof kingQuality>;
export type KingPhase='awakening'|'emergence'|'forging'|'windup'|'execution'|'sea-split'|'collapse'|'aftermath'|'complete';
export function kingPhase(t:number):KingPhase{return t<1.5?'awakening':t<4?'emergence':t<6?'forging':t<8?'windup':t<9?'execution':t<11.5?'sea-split':t<14.5?'collapse':t<17?'aftermath':'complete';}
export {seed,smooth,saturate} from '../abyssalMoonfall/AbyssalMoonfallConfig';
