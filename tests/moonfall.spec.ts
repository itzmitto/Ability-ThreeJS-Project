import { test, expect } from '@playwright/test';
import { BufferGeometry, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createAbyssalMoonGeometry, createLunarShard, createOrbitalSegment, moonSurfaceRadius } from '../src/abilities/abyssalMoonfall/MoonGeometry';
import { MOON_DEFAULTS, moonPhase, moonQuality, validateMoonConfig } from '../src/abilities/abyssalMoonfall/AbyssalMoonfallConfig';
import { AbyssalMoonfall, moonfallTarget } from '../src/abilities/abyssalMoonfall/AbyssalMoonfall';
import { AbyssalMoonfallEffect } from '../src/abilities/abyssalMoonfall/AbyssalMoonfallEffect';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { EffectManager } from '../src/effects/EffectManager';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { sampleOceanHeight } from '../src/world/water/WaterWaveField';
import { OCEAN_DEFAULTS } from '../src/world/water/OceanSettings';
import { matchesSpell, spellCategory } from '../src/ui/SpellCatalog';

function inspect(g:BufferGeometry):void {
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),a=new Vector3(),b=new Vector3(),c=new Vector3(),cross=new Vector3(),e=new Vector3();let volume=0,minArea=Infinity,minNormal=Infinity,maxNormal=0;
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);cross.subVectors(b,a).cross(e.subVectors(c,a));minArea=Math.min(minArea,cross.length());volume+=a.dot(e.copy(b).cross(c))/6;}
  for(let i=0;i<n.count;i++){const len=e.fromBufferAttribute(n,i).length();minNormal=Math.min(minNormal,len);maxNormal=Math.max(maxNormal,len);}
  expect(minArea).toBeGreaterThan(1e-7);expect(volume).toBeGreaterThan(0);expect(minNormal).toBeCloseTo(1,5);expect(maxNormal).toBeCloseTo(1,5);
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(g.boundingBox!.min.toArray().every(Number.isFinite)).toBe(true);expect(g.boundingSphere!.radius).toBeGreaterThan(.5);
}
test('All three cratered moon LODs are finite outward volumetric shell sections with bounded triangles',()=>{
  const counts:number[]=[];
  for(const n of [10,18,26]){const g=createAbyssalMoonGeometry(MOON_DEFAULTS,n);inspect(g);counts.push(g.getAttribute('position').count/3);expect(new Set(g.getAttribute('aIdentity').array).size).toBe(20);g.dispose();}
  expect(counts).toEqual([2600,7560,15080]);
  const radii=Array.from({length:200},(_,i)=>moonSurfaceRadius(new Vector3(Math.cos(i)*.7,Math.sin(i)*.7,.3).normalize(),MOON_DEFAULTS));
  expect(Math.max(...radii)-Math.min(...radii)).toBeGreaterThan(.1);
});
test('Each lunar section closes its perimeter without accidental holes',()=>{
  const g=createAbyssalMoonGeometry(MOON_DEFAULTS,10),p=g.getAttribute('position'),id=g.getAttribute('aIdentity'),v=new Vector3(),edges=new Map<string,number>();
  const key=(i:number)=>v.fromBufferAttribute(p,i).toArray().map(x=>x.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=`${id.getX(i)}:`+[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
  expect([...edges.values()].every(v=>v===2)).toBe(true);g.dispose();
});
test('Four jagged debris variants and beveled orbital segments have real volume and hard normals',()=>{
  for(let i=0;i<4;i++){const g=createLunarShard(i);inspect(g);g.dispose();}const g=createOrbitalSegment();inspect(g);expect(g.boundingBox!.max.y-g.boundingBox!.min.y).toBeGreaterThan(.5);g.dispose();
});
function context(distance=38):AbilityCastContext {const scene=new Scene(),player=new Player(scene),target=new Vector3(0,0,-distance);return {scene,player,camera:new PerspectiveCamera(),quality:new GraphicsSettings(),targeting:new TargetingSystem(scene),effectManager:new EffectManager(),water:new WaterInteractionManager(),origin:player.visual.getRightHandWorldPosition(),direction:new Vector3(0,0,-1),cameraForward:new Vector3(0,0,-1),playerForward:new Vector3(0,0,-1),targetPoint:target,groundTarget:target,time:0};}
function cleanup(c:AbilityCastContext,a:AbyssalMoonfall){c.effectManager.dispose();a.dispose();c.player.dispose();c.targeting.dispose();c.quality.dispose();c.water?.dispose();}
test('Moonfall snapshots/clamps targets, rejects malformed values and integrates normal selection/cooldown/catalog',()=>{
  const c=context(100),a=new AbyssalMoonfall(),m=new AbilityManager();expect(moonfallTarget(c)!.z).toBeGreaterThanOrEqual(-65);expect(c.targetPoint.z).toBe(-100);
  m.registry.register(a);m.selectAbility(a.id);expect(m.slots[m.selectedIndex].code).toBe('');expect(m.cast(c)).toBe(true);expect(m.cast(c)).toBe(false);expect(a.cast(c)).toBe(false);expect(m.getCooldownById(a.id)).toBe(25);
  for(const search of ['moon','abyssal','celestial','void','shattered heaven'])expect(matchesSpell(a,search,'ALL')).toBe(true);expect(spellCategory(a)).toBe('CELESTIAL / VOID');
  c.origin.x=NaN;expect(moonfallTarget(c)).toBeNull();c.origin.set(0,1,0);c.targetPoint.set(Infinity,0,0);c.cameraForward.set(NaN,0,0);expect(moonfallTarget(c)).toBeNull();m.dispose();cleanup(c,a);
});
test('Config/quality budgets and ordered phase transitions remain finite and bounded',()=>{
  expect(()=>validateMoonConfig({moonRadius:NaN})).toThrow();expect(validateMoonConfig({moonRadius:100}).moonRadius).toBe(40);
  expect(validateMoonConfig({moonHeight:-100}).moonHeight).toBeGreaterThan(MOON_DEFAULTS.moonRadius);
  const q=Object.values(QUALITY_PRESETS).map(x=>moonQuality(x,MOON_DEFAULTS));expect(q.map(x=>x.satellites)).toEqual([18,34,60]);expect(q.map(x=>x.debris)).toEqual([32,72,130]);expect(q.map(x=>x.particles)).toEqual([900,2400,5400]);
  expect([.5,2,4,6,9,10.2,12,14].map(t=>moonPhase(t,MOON_DEFAULTS))).toEqual(['summoning','assembly','storm','fracture','descent','impact','aftermath','cleanup']);
});
test('Finite orbital/debris transforms, continuous descent, rising fractures and moving-surface contact',()=>{
  const c=context(),e=new AbyssalMoonfallEffect(c,MOON_DEFAULTS);c.water!.setHeightSampler(()=>.25);e.activate(c,moonfallTarget(c)!,MOON_DEFAULTS);
  let previousY=Infinity,observed=false;const phases=new Set<string>();
  for(let i=0;i<560;i++){e.update(.025);phases.add(e.phase);if(e.phase==='descent'){expect(e.center.y).toBeLessThanOrEqual(previousY);previousY=e.center.y;observed=true;}
    if(i%20===0)e.root.traverse(o=>{expect(o.position.toArray().every(Number.isFinite)).toBe(true);if(o instanceof InstancedMesh){expect(o.count).toBeLessThanOrEqual(o.instanceMatrix.count);expect(Array.from(o.instanceMatrix.array).every(Number.isFinite)).toBe(true);}});}
  expect(observed).toBe(true);expect(e.metal.uniforms.uFractureProgress.value).toBe(1);expect(e.ground.y).toBe(.25);expect(c.water!.emitted).toBe(7);expect(phases.size).toBe(8);e.destroy();cleanup(c,new AbyssalMoonfall());
});
test('Repeated sequential casts and preset transitions reuse a single lease and release owned ocean/scene/subscriptions',()=>{
  const c=context(),a=new AbyssalMoonfall(),objects=c.scene.children.length,subscriptions=c.quality.subscriberCount,geometries=new Set<BufferGeometry>();
  for(let cast=0;cast<4;cast++){
    c.quality.setPreset(cast%3===0?'LOW':cast%3===1?'MEDIUM':'MAX');expect(a.cast(c)).toBe(true);expect(()=>a.configure({moonRadius:32})).toThrow();
    for(let i=0;i<300;i++){c.effectManager.update(.05,i*.05);c.water!.update(i*.05);if(i===50)c.scene.traverse(o=>{if(o instanceof Mesh)geometries.add(o.geometry);});}
    expect(c.effectManager.activeCount).toBe(0);expect(c.scene.children.length).toBe(objects);expect(c.water!.activeCount).toBe(0);expect(c.quality.subscriberCount).toBe(subscriptions);
  }
  expect(geometries.size).toBe(14);a.configure({craterDepth:.2});expect(a.cast(c)).toBe(true);cleanup(c,a);
});
test('Special bounded ocean impulses amplify localized waves without altering ordinary ripples or owners',()=>{
  const w=new WaterInteractionManager(),owner={},p=new Vector3(20,0,20);w.addRipple({position:p,strength:.35,duration:3,waveSpeed:18,wavelength:3.5,displacementScale:100,attenuation:0},owner);
  expect(w.extent[0]).toBeCloseTo(2.4);expect(w.extent[1]).toBeCloseTo(.012);
  const args=[20,20,.1,0,0,OCEAN_DEFAULTS,5,w.data,w.shape,32] as const;
  const ordinary=sampleOceanHeight(...args),large=sampleOceanHeight(...args,w.extent);expect(Math.abs(large-ordinary)).toBeGreaterThan(.05);
  w.removeOwner(owner);expect(w.activeCount).toBe(0);expect(w.extent.every(x=>x===0)).toBe(true);w.dispose();
});
