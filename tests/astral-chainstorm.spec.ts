import { test, expect } from '@playwright/test';
import { BufferGeometry, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createAstralChainLinkGeometry, createChainFragmentGeometry } from '../src/abilities/astralChainstorm/AstralChainGeometry';
import { AstralChainstorm, astralChainTarget } from '../src/abilities/astralChainstorm/AstralChainstorm';
import { CHAIN_DEFAULTS, chainQuality, validatedChainConfig } from '../src/abilities/astralChainstorm/AstralChainstormConfig';
import { AstralChainstormEffect } from '../src/abilities/astralChainstorm/AstralChainstormEffect';
import { AbilityManager } from '../src/abilities/AbilityManager';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { EffectManager } from '../src/effects/EffectManager';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { sampleOceanHeight } from '../src/world/water/WaterWaveField';
import { OCEAN_DEFAULTS } from '../src/world/water/OceanSettings';
import type { AbilityCastContext } from '../src/abilities/Ability';
function solid(g:BufferGeometry):void {
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),a=new Vector3(),b=new Vector3(),c=new Vector3(),cross=new Vector3(),edge=new Vector3(),normal=new Vector3(),edges=new Map<string,number>();let volume=0;
  const key=(v:Vector3)=>v.toArray().map(x=>x.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);cross.subVectors(b,a).cross(edge.subVectors(c,a));expect(cross.length()).toBeGreaterThan(1e-7);volume+=a.dot(edge.copy(b).cross(c))/6;
    for(const [v,w] of [[a,b],[b,c],[c,a]]){const k=[key(v),key(w)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
    for(let j=0;j<3;j++){normal.fromBufferAttribute(n,i+j);expect(normal.length()).toBeCloseTo(1,5);expect(normal.dot(cross.clone().normalize())).toBeCloseTo(1,5);}}
  expect(volume).toBeGreaterThan(0);expect([...edges.values()].every(v=>v===2)).toBe(true);expect(g.boundingSphere!.radius).toBeGreaterThan(.1);expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
}
test('All link LODs and steel fragments are closed, outward-wound, finite bevelled solids',()=>{
  for(const n of [20,32,44]){const g=createAstralChainLinkGeometry(CHAIN_DEFAULTS,n);solid(g);expect(g.boundingBox!.max.z-g.boundingBox!.min.z).toBeGreaterThan(.2);g.dispose();}
  for(const variant of [0,1]){const g=createChainFragmentGeometry(variant);solid(g);g.dispose();}
});
function context(distance=28):AbilityCastContext {const scene=new Scene(),player=new Player(scene),target=new Vector3(0,0,-distance);return {scene,player,camera:new PerspectiveCamera(),quality:new GraphicsSettings(),targeting:new TargetingSystem(scene),effectManager:new EffectManager(),water:new WaterInteractionManager(),origin:player.visual.getRightHandWorldPosition(),direction:new Vector3(0,0,-1),cameraForward:new Vector3(0,0,-1),playerForward:new Vector3(0,0,-1),targetPoint:target,groundTarget:target,time:0};}
function dispose(c:AbilityCastContext,a:AstralChainstorm):void{c.effectManager.dispose();a.dispose();c.player.dispose();c.targeting.dispose();c.water?.dispose();c.quality.dispose();}
test('Ability is registry-selectable without a shortcut, respects cooldown and snapshots a finite clamped target',()=>{
  const c=context(100),a=new AstralChainstorm(),m=new AbilityManager();m.registry.register(a);m.selectAbility(a.id);
  expect(m.selectedAbility).toBe(a);expect(m.slots[m.selectedIndex].code).toBe('');expect(m.cast(c)).toBe(true);expect(m.cast(c)).toBe(false);expect(m.getCooldownById(a.id)).toBe(8);
  const target=astralChainTarget(c)!;expect(Math.hypot(target.x-c.origin.x,target.z-c.origin.z)).toBeLessThanOrEqual(38);expect(c.targetPoint.z).toBe(-100);
  c.origin.x=NaN;expect(astralChainTarget(c)).toBeNull();c.effectManager.dispose();m.dispose();dispose(c,a);
});
test('Quality caps links, particles and fragments, validates live controls and guards shape rebuilds',()=>{
  expect(Object.values(QUALITY_PRESETS).map(q=>chainQuality(q,CHAIN_DEFAULTS).chains*chainQuality(q,CHAIN_DEFAULTS).links)).toEqual([78,136,200]);
  expect(validatedChainConfig({linksPerChain:10000}).linksPerChain).toBe(42);expect(()=>validatedChainConfig({launchSpeed:NaN})).toThrow();
  const c=context(),a=new AstralChainstorm();a.cast(c);a.configure({runeBrightness:.4});expect(a.config.runeBrightness).toBe(.4);expect(()=>a.configure({linkLength:1.3})).toThrow();dispose(c,a);
});
test('Sampled curves alternate link planes, keep matrices finite, and preserve arrival before impact',()=>{
  const c=context(38),e=new AstralChainstormEffect(c,{...CHAIN_DEFAULTS});e.activate(c,astralChainTarget(c)!);
  for(let t=0;t<1.25;t+=.025){e.update(.025);c.water!.update(t);}
  expect(e.phase).toBe('launch');expect(c.water!.emitted).toBe(0);
  const mesh=e.chains.mesh,m=new Matrix4(),positions:Vector3[]=[];
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);expect(m.elements.every(Number.isFinite)).toBe(true);positions.push(new Vector3().setFromMatrixPosition(m));}
  expect(mesh.count).toBeLessThanOrEqual(136);expect(positions[0].distanceTo(positions[1])).toBeGreaterThan(.6);
  mesh.getMatrixAt(0,m);const normalA=new Vector3().setFromMatrixColumn(m,2).normalize();mesh.getMatrixAt(1,m);const normalB=new Vector3().setFromMatrixColumn(m,2).normalize();expect(Math.abs(normalA.dot(normalB))).toBeLessThan(.2);
  e.destroy();dispose(c,new AstralChainstorm());
});
test('Twenty casts and quality transitions reuse resources, release lights/ripples/subscriptions and bound overlap',()=>{
  const c=context(),a=new AstralChainstorm(),baseline=c.scene.children.length,subscriptions=c.quality.subscriberCount;const geometries=new Set<BufferGeometry>();
  for(let cast=0;cast<20;cast++){c.quality.setPreset(cast%3===0?'LOW':cast%3===1?'MEDIUM':'MAX');expect(a.cast(c)).toBe(true);
    for(let t=0;t<6;t+=.025){c.effectManager.update(.025,t);c.water!.update(t);if(t>.8&&t<1)c.scene.traverse(o=>{if(o instanceof Mesh)geometries.add(o.geometry);if(o instanceof InstancedMesh){expect(o.count).toBeLessThanOrEqual(o.instanceMatrix.count);expect(Array.from(o.instanceMatrix.array).every(Number.isFinite)).toBe(true);}});}
    expect(c.effectManager.activeCount).toBe(0);expect(c.water!.activeCount).toBe(0);expect(c.scene.children.length).toBe(baseline);expect(c.quality.subscriberCount).toBe(subscriptions);}
  expect(geometries.size).toBeLessThanOrEqual(8);expect(a.cast(c)).toBe(true);expect(a.cast(c)).toBe(true);expect(a.cast(c)).toBe(false);dispose(c,a);
});
test('Ocean sampler tracks moving swells, contact flattening, bounded ripples and invalid coordinates',()=>{
  const empty=new Float32Array(128);const sample=(x:number,z:number,t:number)=>sampleOceanHeight(x,z,t,0,0,OCEAN_DEFAULTS,5,empty,empty,32);
  expect(sample(0,0,1)).toBe(0);expect(sample(12,18,1)).not.toBe(sample(12,18,2));expect(sample(Infinity,0,1)).toBe(0);
  for(let t=0;t<30;t+=.1)expect(Math.abs(sample(12,18,t))).toBeLessThan(.25);
});
