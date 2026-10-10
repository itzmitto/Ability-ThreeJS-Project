import { test,expect } from '@playwright/test';
import { Box3, BufferGeometry, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { armorLibrary,createRunebladeGeometry,createKingFragment } from '../src/abilities/drownedKing/DrownedKingGeometry';
import { KING_DEFAULTS,kingQuality,kingPhase,validateKingConfig } from '../src/abilities/drownedKing/DrownedKingConfig';
import { DrownedKing,drownedKingTarget } from '../src/abilities/drownedKing/DrownedKing';
import { DrownedKingEffect } from '../src/abilities/drownedKing/DrownedKingEffect';
import { DrownedKingRig } from '../src/abilities/drownedKing/DrownedKingRig';
import { DrownedKingSword } from '../src/abilities/drownedKing/DrownedKingSword';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { Player } from '../src/player/Player';
import { EffectManager } from '../src/effects/EffectManager';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { sampleSplitHeight } from '../src/world/water/WaterWaveField';
import { matchesSpell,spellCategory } from '../src/ui/SpellCatalog';

function solid(g:BufferGeometry):void{
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),a=new Vector3(),b=new Vector3(),c=new Vector3(),d=new Vector3(),cross=new Vector3(),edges=new Map<string,number>();let volume=0,minArea=Infinity,minN=Infinity,maxN=0;
  const key=(v:Vector3)=>v.toArray().map(x=>x.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);cross.subVectors(b,a).cross(d.subVectors(c,a));minArea=Math.min(minArea,cross.length());volume+=a.dot(d.copy(b).cross(c))/6;
    for(const [x,y] of [[a,b],[b,c],[c,a]]){const k=[key(x),key(y)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}}
  for(let i=0;i<n.count;i++){const length=d.fromBufferAttribute(n,i).length();minN=Math.min(minN,length);maxN=Math.max(maxN,length);}
  expect(minArea).toBeGreaterThan(1e-8);expect(volume).toBeGreaterThan(0);expect(minN).toBeCloseTo(1,5);expect(maxN).toBeCloseTo(1,5);expect([...edges.values()].every(n=>n===2)).toBe(true);expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(g.boundingSphere!.radius).toBeGreaterThan(.1);
}
test('Armor, gauntlet and helmet shells are closed outward solids with finite hard normals',()=>{const gs=armorLibrary();gs.forEach(g=>{solid(g);g.dispose();});for(let i=0;i<4;i++){const g=createKingFragment(i);solid(g);g.dispose();}});
test('Runeblade is a closed 65-metre diamond-section weapon with a thick spine and thin tapered tip',()=>{const g=createRunebladeGeometry();solid(g);expect(g.boundingBox!.max.y-g.boundingBox!.min.y).toBe(65);expect(g.boundingBox!.max.z-g.boundingBox!.min.z).toBeGreaterThan(2);expect(g.boundingBox!.max.x).toBeGreaterThan(2.7);g.dispose();});
test('Physical king silhouette stays colossal without excessive armor triangles',()=>{
  const rig=new DrownedKingRig();rig.update(4,KING_DEFAULTS,0,0);
  const bounds=new Box3().setFromObject(rig.root),height=bounds.max.y-bounds.min.y;
  const triangles=rig.batches.reduce((sum,b)=>sum+b.count*b.geometry.getAttribute('position').count/3,0);
  expect(height).toBeGreaterThan(80);expect(height).toBeLessThan(95);expect(triangles).toBeLessThan(10000);
  console.log('KING GEOMETRY',JSON.stringify({height,armorInstances:rig.pieces.length,armorTriangles:triangles}));rig.dispose();
});
test('Both gauntlet attachment pivots follow the same sword frame throughout wind-up and strike',()=>{
  const rig=new DrownedKingRig(),sword=new DrownedKingSword(),target=new Vector3(),actual=new Vector3();rig.torso.add(sword.root);
  for(const t of [5.8,6,6.5,7,7.8,8,8.5,9]){sword.pose(t,KING_DEFAULTS);for(let side=0;side<2;side++){sword.handTarget(side,target);rig.reach(side,target,sword.orientation,1);}rig.update(t,KING_DEFAULTS,0,1);
    for(let side=0;side<2;side++){sword.handTarget(side,target);rig.arms[side].hand.getWorldPosition(actual);expect(actual.distanceTo(target)).toBeLessThan(.015);expect(rig.arms[side].shoulder.quaternion.toArray().every(Number.isFinite)).toBe(true);}}
  sword.dispose();rig.dispose();
});
function context(distance=55):AbilityCastContext{const scene=new Scene(),player=new Player(scene),target=new Vector3(0,0,-distance);return {scene,player,camera:new PerspectiveCamera(),origin:player.visual.getRightHandWorldPosition(),direction:new Vector3(0,0,-1),playerForward:new Vector3(0,0,-1),cameraForward:new Vector3(0,0,-1),groundTarget:target,targetPoint:target,quality:new GraphicsSettings(),targeting:new TargetingSystem(scene),effectManager:new EffectManager(),water:new WaterInteractionManager(),time:0};}
function cleanup(c:AbilityCastContext,a:DrownedKing){c.effectManager.dispose();a.dispose();c.player.dispose();c.targeting.dispose();c.water?.dispose();c.quality.dispose();}
test('Existing registry/catalog selection, safe targeting and 30-second cooldown are respected',()=>{
  const c=context(100),a=new DrownedKing(),m=new AbilityManager();expect(drownedKingTarget(c)!.z).toBeGreaterThanOrEqual(-70);expect(c.targetPoint.z).toBe(-100);m.registry.register(a);m.selectAbility(a.id);expect(m.slots[m.selectedIndex].code).toBe('');expect(m.cast(c)).toBe(true);expect(m.cast(c)).toBe(false);expect(a.cast(c)).toBe(false);expect(m.getCooldownById(a.id)).toBe(30);
  expect(spellCategory(a)).toBe('SHADOW / DARK');for(const term of ['drowned','king','thronebreaker','abyssal','knight'])expect(matchesSpell(a,term,'ALL')).toBe(true);
  c.origin.x=NaN;expect(drownedKingTarget(c)).toBeNull();m.dispose();cleanup(c,a);
});
test('Tuning and central quality limits are finite; all eight choreographed phases are ordered',()=>{
  expect(()=>validateKingConfig({kingHeight:NaN})).toThrow();expect(validateKingConfig({waterWallHeight:999}).waterWallHeight).toBe(23);
  const qs=Object.values(QUALITY_PRESETS).map(q=>kingQuality(q,KING_DEFAULTS));expect(qs.map(q=>q.fragments)).toEqual([48,120,240]);expect(qs.map(q=>q.particles)).toEqual([900,2400,5400]);
  expect([1,2.5,5,7,8.5,10,12,16,17].map(kingPhase)).toEqual(['awakening','emergence','forging','windup','execution','sea-split','collapse','aftermath','complete']);
});
test('Sword contact uses sampled animated water height rather than hardcoded zero',()=>{
  for(const patch of [{},{swordLength:58,kingHeight:92},{swordLength:70,kingHeight:75}]){
    const config=validateKingConfig(patch),c=context(),e=new DrownedKingEffect(c,config);c.water!.setHeightSampler((x,z)=>.3+Math.sin(x*.1+z*.1)*.15);e.activate(c,drownedKingTarget(c)!,config);e.update(9);
    expect(e.bladeContact.distanceTo(e.target)).toBeLessThan(.01);expect(e.phase).toBe('sea-split');expect(c.water!.splitShape[3]).toBe(2);expect(c.water!.activeCount).toBeGreaterThan(0);e.destroy();cleanup(c,new DrownedKing());
  }
});
test('Sequential leases and live quality changes remain bounded and release scene/water/subscriptions',()=>{
  const c=context(),a=new DrownedKing(),objects=c.scene.children.length,subscribers=c.quality.subscriberCount,geometries=new Set<BufferGeometry>();
  for(let cast=0;cast<4;cast++){c.quality.setPreset(cast%3===0?'LOW':cast%3===1?'MEDIUM':'MAX');expect(a.cast(c)).toBe(true);expect(()=>a.configure({runeBrightness:.5})).toThrow();
    for(let i=0;i<360;i++){c.effectManager.update(.05,i*.05);c.water!.update(i*.05);if(i===140)c.scene.traverse(o=>{if(o instanceof Mesh)geometries.add(o.geometry);if(o instanceof InstancedMesh){expect(o.count).toBeLessThanOrEqual(o.instanceMatrix.count);expect(Array.from(o.instanceMatrix.array).every(Number.isFinite)).toBe(true);}});}
    expect(c.scene.children.length).toBe(objects);expect(c.effectManager.activeCount).toBe(0);expect(c.water!.activeCount).toBe(0);expect(c.quality.subscriberCount).toBe(subscribers);}
  expect(geometries.size).toBeLessThanOrEqual(24);a.configure({rustStrength:.4});cleanup(c,a);
});
test('Finite four-slot signed-distance ocean splits depress the center, raise shoulders, decay and release ownership',()=>{
  const w=new WaterInteractionManager(),owner={},start=new Vector3(0,0,0),end=new Vector3(0,0,100);for(let i=0;i<8;i++)w.addSplit({start,end,width:9,depth:2,duration:4},owner);expect(w.activeCount).toBe(4);
  expect(sampleSplitHeight(0,50,2,w.splits,w.splitShape)).toBeLessThan(-1);expect(sampleSplitHeight(10,50,2,w.splits,w.splitShape)).toBeGreaterThan(1);expect(sampleSplitHeight(100,50,2,w.splits,w.splitShape)).toBeCloseTo(0);expect(sampleSplitHeight(0,50,4,w.splits,w.splitShape)).toBe(0);
  w.removeOwner(owner);expect(w.activeCount).toBe(0);expect(w.splitShape.every(x=>x===0||x===9||x===4)).toBe(true);w.dispose();
});
