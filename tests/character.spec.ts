import { test,expect } from '@playwright/test';
import { Scene, Vector3 } from 'three';
import { characterFixture } from './character-fixture';
import { CHARACTER_CONFIG, characterCastStyle, shortestHeadingDifference } from '../src/player/CharacterConfig';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { Player } from '../src/player/Player';

test('Real Rocketbox anatomy, fingers and clips are preserved; fitted garments have valid weighted geometry',async()=>{
 const f=await characterFixture();expect(f.rig.bones.size).toBe(80);expect(f.rig.bone('R_Finger42')).toBeTruthy();expect(f.rig.bone('Head')).toBeTruthy();expect(f.clips.map(c=>c.name)).toEqual(['Idle','Walk','Run']);expect(f.clothing.accessories.length).toBeGreaterThanOrEqual(5);
 for(const mesh of f.clothing.accessories){const g=mesh.geometry,p=g.getAttribute('position'),w=g.getAttribute('skinWeight');expect(g.boundingSphere?.radius).toBeGreaterThan(0);for(let i=0;i<p.count;i++){expect([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)).toBeTruthy();expect(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)).toBeCloseTo(1,5);}}
 f.dispose();
});
test('Velocity-based Idle/Walk/Run/Sprint blending stays normalized and cadence follows real stance calibration',async()=>{
 const f=await characterFixture();for(const [speed,sprint,state]of [[0,false,'IDLE'],[1.8,false,'WALK'],[4.8,false,'RUN'],[8.5,true,'SPRINT'],[0,false,'IDLE']] as const){for(let i=0;i<90;i++){f.tick(speed,1/60,sprint);const weights=Object.values(f.animation.weights);expect(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1)).toBeTruthy();expect(weights.reduce((a,b)=>a+b)).toBeCloseTo(1,12);}expect(f.animation.state).toBe(state);}
 expect(f.animation.sourceSpeeds.Walk).toBeGreaterThan(1);expect(f.animation.sourceSpeeds.Run).toBeGreaterThan(f.animation.sourceSpeeds.Walk);expect(f.animation.phase).toBeGreaterThanOrEqual(0);expect(f.animation.phase).toBeLessThan(1);f.dispose();
});
test('Shortest heading crosses the wrap correctly and additive bone passes do not accumulate drift',async()=>{
 expect(shortestHeadingDifference(.02,Math.PI*2-.02)).toBeCloseTo(.04,10);const f=await characterFixture();let finite=true,error=0,scale=0;for(let i=0;i<600;i++){f.root.rotation.y=Math.sin(i*.04)*2.8;f.motion.setAim(new Vector3(Math.sin(i*.1),.1,-Math.cos(i*.1)));f.tick(i%120<60?4.8:0);for(const bone of f.rig.bones.values()){finite&&=[...bone.position.toArray(),...bone.quaternion.toArray(),...bone.scale.toArray()].every(Number.isFinite);error=Math.max(error,Math.abs(1-bone.quaternion.length()));scale=Math.max(scale,bone.scale.y);}}
 expect(finite).toBeTruthy();expect(error).toBeLessThan(.00005);expect(scale).toBeLessThan(1.01);
 f.dispose();
});
test('Upper-body projectile/summon casts preserve locomotion legs, hand transforms and smooth recovery',async()=>{
 const f=await characterFixture();f.motion.ability('ember-comet',new Vector3(0,0,-1));expect(f.motion.castStyle).toBe('projectile');for(let i=0;i<20;i++)f.tick(4.8);
 const thigh=f.rig.bone('R_Thigh')!.quaternion.clone(),calf=f.rig.bone('R_Calf')!.quaternion.clone();f.motion.update(1/60,4.8,false);expect(f.rig.bone('R_Thigh')!.quaternion.angleTo(thigh)).toBeLessThan(1e-7);expect(f.rig.bone('R_Calf')!.quaternion.angleTo(calf)).toBeLessThan(1e-7);
 const hand=f.rig.bone('R_Hand')!.getWorldPosition(new Vector3());expect(hand.toArray().every(Number.isFinite)).toBeTruthy();expect(hand.y).toBeGreaterThan(.9);expect(hand.distanceTo(f.rig.bone('R_UpperArm')!.getWorldPosition(new Vector3()))).toBeLessThan(.58);
 for(let i=0;i<120;i++)f.tick(4.8);expect(f.motion.castPhase).toBe('READY');expect(f.animation.activeClip).toBe('Run');expect(characterCastStyle('drowned-king')).toBe('summon');f.motion.ability('drowned-king',new Vector3(0,.1,-1));f.tick(0);expect(f.motion.castPhase).toBe('CAST');
 f.motion.begin(1.4,1.1);f.motion.ability('ember-comet',new Vector3(0,0,-1));for(let i=0;i<40;i++)f.tick(0);expect(f.motion.castPhase).toBe('CAST');f.motion.ability('glacial-eruption',new Vector3(0,0,-1));for(let i=0;i<60;i++)f.tick(0);expect(f.motion.castPhase).toBe('READY');f.dispose();
});
test('Restrained two-bone contact correction stays within reach across changing wave heights',async()=>{
 const f=await characterFixture(),before=new Vector3(),after=new Vector3();for(let i=0;i<120;i++){f.tick(i<60?0:1.8);const foot=f.rig.bone('L_Foot')!;foot.getWorldPosition(before);f.feet.update(1/60,i<60?0:1.8,()=>Math.sin(i*.05)*.025,0);foot.getWorldPosition(after);expect(before.distanceTo(after)).toBeLessThan(CHARACTER_CONFIG.footCorrection+.035);for(const bone of f.rig.bones.values())expect(bone.quaternion.toArray().every(Number.isFinite)).toBeTruthy();}
 expect(f.feet.contacts.left).toBeGreaterThanOrEqual(0);expect(f.feet.contacts.left).toBeLessThanOrEqual(1);f.feet.enabled=false;for(let i=0;i<120;i++){f.tick(0);f.feet.update(1/60,0,()=>0,0);}expect(f.feet.contacts.left).toBeLessThan(.001);f.dispose();
});
test('Character quality subscriptions and teardown are bounded and idempotent even before async loading',()=>{
 const settings=new GraphicsSettings(),player=new Player(new Scene());player.visual.configureEnvironment(settings,()=>.1);expect(settings.subscriberCount).toBe(1);player.visual.configureEnvironment(settings,()=>.2);expect(settings.subscriberCount).toBe(1);player.dispose();player.dispose();expect(settings.subscriberCount).toBe(0);settings.dispose();
});

test('Riftreaver diagonal cutting gesture uses real hand bones while leaving locomotion legs untouched and recovering',async()=>{
 const f=await characterFixture();for(let i=0;i<90;i++)f.tick(4.8);
 f.motion.ability('riftreaver',new Vector3(.2,0,-1));const positions:Vector3[]=[];
 for(let i=0;i<18;i++){
   f.rig.restore();f.animation.update(1/60,4.8,false);f.rig.capture();f.root.updateWorldMatrix(true,true);
   const thigh=f.rig.bone('R_Thigh')!.quaternion.clone(),calf=f.rig.bone('R_Calf')!.quaternion.clone();
   f.motion.update(1/60,4.8,false);expect(f.rig.bone('R_Thigh')!.quaternion.angleTo(thigh)).toBeLessThan(1e-7);expect(f.rig.bone('R_Calf')!.quaternion.angleTo(calf)).toBeLessThan(1e-7);
   positions.push(f.rig.bone('R_Hand')!.getWorldPosition(new Vector3()));
 }
 expect(positions.every(v=>v.toArray().every(Number.isFinite))).toBe(true);expect(positions[5].distanceTo(positions[16])).toBeGreaterThan(.04);
 for(let i=0;i<90;i++)f.tick(4.8);expect(f.motion.castPhase).toBe('READY');expect(f.animation.activeClip).toBe('Run');f.dispose();
});
