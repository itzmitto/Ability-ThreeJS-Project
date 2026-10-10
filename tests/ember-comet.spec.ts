import { test, expect } from '@playwright/test';
import { BufferGeometry, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { AbilityManager } from '../src/abilities/AbilityManager';
import { EmberComet, emberCometTarget } from '../src/abilities/emberComet/EmberComet';
import { COMET_DEFAULTS, COMET_CAST, cometQuality, validateCometConfig } from '../src/abilities/emberComet/EmberCometConfig';
import { createCometResources, disposeCometResources } from '../src/abilities/emberComet/EmberCometGeometry';
import { EmberCometEffect } from '../src/abilities/emberComet/EmberCometEffect';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { EffectManager } from '../src/effects/EffectManager';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { matchesSpell, spellCategory } from '../src/ui/SpellCatalog';

function context(range = 28): AbilityCastContext {
  const scene = new Scene(), player = new Player(scene), water = new WaterInteractionManager(); water.setHeightSampler((x,z) => .2 + Math.sin(x*.1+z*.2)*.1);
  const target = new Vector3(0, 0, -range);
  return { scene, player, water, camera: new PerspectiveCamera(), origin: new Vector3(0,1.4,0), direction: new Vector3(0,0,-1), playerForward: new Vector3(0,0,-1), cameraForward: new Vector3(0,0,-1), targetPoint: target, groundTarget: target, targeting: new TargetingSystem(scene), quality: new GraphicsSettings(), effectManager: new EffectManager(), time: 0 };
}
function cleanup(c: AbilityCastContext, a: EmberComet): void { c.effectManager.dispose(); a.dispose(); c.player.dispose(); c.targeting.dispose(); c.water?.dispose(); c.quality.dispose(); }
function checkGeometry(g: BufferGeometry, closed: boolean): void {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), a = new Vector3(), b = new Vector3(), c = new Vector3(), d = new Vector3(), edges = new Map<string, number>();
  const ids = g.index?.array ?? Array.from({length:p.count}, (_,i)=>i); let volume = 0;
  const key = (v:Vector3) => v.toArray().map(x => x.toFixed(5)).join(',');
  for (let i=0;i<ids.length;i+=3) {
    a.fromBufferAttribute(p,ids[i]); b.fromBufferAttribute(p,ids[i+1]); c.fromBufferAttribute(p,ids[i+2]);
    expect(d.subVectors(b,a).cross(c.clone().sub(a)).lengthSq()).toBeGreaterThan(1e-12); volume += a.dot(d.copy(b).cross(c))/6;
    for(const [v,w] of [[a,b],[b,c],[c,a]]){const k=[key(v),key(w)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
  }
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true); expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
  for(let i=0;i<n.count;i++)expect(d.fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);
  expect(g.boundingSphere!.radius).toBeGreaterThan(.1); expect(g.boundingBox!.isEmpty()).toBe(false);
  if(closed){expect([...edges.values()].every(n=>n===2)).toBe(true);expect(volume).toBeGreaterThan(0);}
}
test('Core, plates and fragments are finite nondegenerate closed volumes; tail has genuine thickness', () => {
  const r=createCometResources(); [...r.cores,...r.plates.flat(),...r.fragments].forEach(g=>checkGeometry(g,true));checkGeometry(r.tail,false);
  expect(r.plates[0][0].boundingBox!.max.z-r.plates[0][0].boundingBox!.min.z).toBeGreaterThan(.2);
  expect(r.tail.boundingBox!.max.x-r.tail.boundingBox!.min.x).toBeGreaterThan(1.8); disposeCometResources(r);
});
test('Typed tuning rejects nonfinite inputs and central quality budgets remain bounded',()=>{
  expect(()=>validateCometConfig({flightSpeed:NaN})).toThrow();expect(validateCometConfig({fragmentCount:999}).fragmentCount).toBe(60);
  const q=Object.values(QUALITY_PRESETS).map(p=>cometQuality(p,COMET_DEFAULTS));expect(q.map(v=>v.shell)).toEqual([6,8,10]);expect(q.map(v=>v.fragments)).toEqual([16,30,48]);
  expect(q.map(v=>v.glowParticles+v.vaporParticles)).toEqual([150,340,700]);
});
test('Registry selection is unbound; FIRE search metadata and authoritative four-second cooldown work',()=>{
  const c=context(),a=new EmberComet(),manager=new AbilityManager();manager.registry.register(a);manager.selectAbility(a.id);
  expect(manager.slots[manager.selectedIndex].code).toBe('');expect(spellCategory(a)).toBe('FIRE');
  for(const term of ['ember','comet','fire','infernal'])expect(matchesSpell(a,term,'FIRE')).toBe(true);
  expect(manager.cast(c)).toBe(true);expect(manager.getCooldownById(a.id)).toBe(4);expect(manager.cast(c)).toBe(false);
  manager.dispose();cleanup(c,a);
});
test('Target snapshots clamp 48 metres, sample moving water, reject invalid vectors and preserve source aim',()=>{
  const c=context(100),target=emberCometTarget(c)!;expect(target.distanceTo(c.origin)).toBeCloseTo(48);expect(c.targetPoint.z).toBe(-100);
  c.origin.x=NaN;expect(emberCometTarget(c)).toBeNull();cleanup(c,new EmberComet());
});
test('Hand tracking, actual travel speed, shell budgets and sampled impact contact are finite',()=>{
  const c=context(),resources=createCometResources(),effect=new EmberCometEffect(c,resources,COMET_DEFAULTS);
  effect.activate(c,emberCometTarget(c)!);effect.update(.2);expect(effect.position.distanceTo(c.player.visual.getRightHandWorldPosition())).toBeLessThan(1e-8);
  effect.update(.2);const start=effect.position.clone();effect.update(.1);expect(effect.position.distanceTo(start)).toBeCloseTo(4.4,3);expect(effect.phase).toBe('flight');
  expect(effect.shell.reduce((sum,m)=>sum+m.count,0)).toBe(8);
  for(let i=0;i<100&&effect.phase==='flight';i++)effect.update(.025);
  expect(effect.phase).toBe('impact');expect(effect.target.y).toBeCloseTo(c.water!.getSurfaceHeight(effect.target.x,effect.target.z));expect(c.water!.activeCount).toBe(3);
  effect.destroy();expect(c.water!.activeCount).toBe(0);disposeCometResources(resources);cleanup(c,new EmberComet());
});
test('Twenty sequential casts, preset changes and two bounded overlapping leases clean every owner',()=>{
  const c=context(48),a=new EmberComet(),base=c.scene.children.length,subs=c.quality.subscriberCount,geometries=new Set<BufferGeometry>(),baseGeometries=new Set<BufferGeometry>();
  c.scene.traverse(o=>{if(o instanceof Mesh)baseGeometries.add(o.geometry);});
  for(let cast=0;cast<20;cast++){
    c.quality.setPreset(cast%3===0?'LOW':cast%3===1?'MEDIUM':'MAX');expect(a.cast(c)).toBe(true);expect(()=>a.configure({coreGlow:1})).toThrow();
    for(let i=0;i<180;i++){c.effectManager.update(.025,i*.025);c.water!.update(i*.025);
      if(i===35)c.scene.traverse(o=>{if(o instanceof Mesh){if(!baseGeometries.has(o.geometry))geometries.add(o.geometry);if(o instanceof InstancedMesh){expect(o.count).toBeLessThanOrEqual(o.instanceMatrix.count);expect(Array.from(o.instanceMatrix.array).every(Number.isFinite)).toBe(true);}}});
      expect(c.effectManager.particleCount).toBeLessThanOrEqual(700);
    }
    expect(c.effectManager.activeCount).toBe(0);expect(c.water!.activeCount).toBe(0);expect(c.scene.children.length).toBe(base);expect(c.quality.subscriberCount).toBe(subs);
  }
  expect(geometries.size).toBeLessThanOrEqual(17);expect(a.cast(c)).toBe(true);expect(a.cast(c)).toBe(true);expect(a.cast(c)).toBe(false);expect(a.activeCount).toBe(COMET_CAST.maximumActive);
  c.effectManager.update(120,120);expect(a.activeCount).toBe(0);a.configure({coreGlow:1});cleanup(c,a);
});
