import { DynamicDrawUsage,Group,InstancedMesh,Object3D,Quaternion,Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { bendingTier,ease,seed } from '../bending/BendingSupport';
import { TITAN_CONFIG as C,TITAN_BUDGETS,FIST_PLATES } from './TitanFistConfig';
import { createTitanRock } from './TitanRockGeometry';
import { titanRockMaterial } from './TitanRockMaterial';
import { TitanDust } from './TitanDust';
export class TitanFistEffect implements ManagedEffect{
  readonly root=new Group();readonly fist=new Group();active=false;private ctx!:AbilityCastContext;
  private age=0;private tier=0;private impacted=false;private travel=0;private length=1;private releaseLease?:()=>void;private unsubscribe?:()=>void;
  private readonly rocks=[0,1,2].map(createTitanRock);private readonly stone=titanRockMaterial();private readonly dust=new TitanDust();
  private readonly plates=this.rocks.map(g=>new InstancedMesh(g,this.stone.material,Math.ceil(FIST_PLATES.length/3)));
  private readonly shards=this.rocks.map(g=>new InstancedMesh(g,this.stone.material,25));
  private readonly temp=new Object3D();private readonly inverse=new Quaternion();private readonly direction=new Vector3();
  readonly target=new Vector3();readonly launch=new Vector3();readonly position=new Vector3();private readonly localTarget=new Vector3();private readonly start=new Vector3();
  private readonly hand=new Vector3();private readonly shardOrigin=new Vector3();private readonly scratch=new Vector3();
  private readonly plateCounts=new Int32Array(3);private readonly shardCounts=new Int32Array(3);
  get arrival():number{return C.charge+this.travel;}
  get particleCount():number{return this.active?TITAN_BUDGETS[this.tier].particles:0;}
  get instanceCount():number{return this.active?(this.impacted?TITAN_BUDGETS[this.tier].fragments:FIST_PLATES.length):0;}
  constructor(){this.root.name='Titan Fist · assembled basalt punch';this.root.userData.bendingId='titan-fist';this.root.userData.castOrigin=this.launch;this.fist.name='Volumetric fist · four knuckles and thumb';this.root.add(this.fist,this.dust.mesh);this.plates.forEach(m=>this.fist.add(m));this.shards.forEach(m=>this.root.add(m));[...this.plates,...this.shards].forEach(m=>{m.instanceMatrix.setUsage(DynamicDrawUsage);m.frustumCulled=false;});}
  activate(c:AbilityCastContext,target:Vector3,release:()=>void):void{
    this.ctx=c;this.target.copy(target);this.releaseLease=release;this.age=0;this.active=true;this.impacted=false;this.root.position.copy(c.player.position);
    this.direction.subVectors(target,this.root.position);this.direction.y=0;this.length=this.direction.length();this.root.quaternion.setFromUnitVectors(new Vector3(0,0,-1),this.direction.normalize());this.inverse.copy(this.root.quaternion).invert();
    this.localTarget.copy(target).sub(this.root.position).applyQuaternion(this.inverse);this.localTarget.y+=.75;
    this.hand.copy(c.origin).sub(this.root.position).applyQuaternion(this.inverse);this.start.copy(this.hand).add(new Vector3(0,.3,-.8));this.travel=this.start.distanceTo(this.localTarget)/C.speed;
    this.unsubscribe=c.quality.subscribe(q=>{this.tier=bendingTier(q);this.stone.uniforms.uRockDetail.value=this.tier;});c.scene.add(this.root);
    c.water?.addRipple({position:c.player.position,strength:.24,duration:1,waveSpeed:2,radius:1},this);this.update(0,0);
  }
  update(dt:number,_time:number):boolean{
    if(!this.active)return false;this.age+=dt;const t=this.age-this.arrival;if(t>=C.aftermath)return false;
    const assembly=ease(this.age/C.charge),flight=Math.max(0,Math.min(1,(this.age-C.charge)/Math.max(.05,this.travel)));
    if(this.age<C.charge){this.ctx.player.visual.getRightHandWorldPosition(this.hand);this.hand.sub(this.root.position).applyQuaternion(this.inverse);this.start.copy(this.hand);this.start.y+=.28;this.start.z-=.9;this.launch.copy(this.hand).applyQuaternion(this.root.quaternion).add(this.root.position);}
    this.fist.position.copy(this.start).lerp(this.localTarget,flight);this.fist.position.y-=ease((flight-.72)/.28)*.42;this.position.copy(this.fist.position).applyQuaternion(this.root.quaternion).add(this.root.position);this.fist.rotation.set(-.1-.32*ease(flight),0,Math.sin(flight*Math.PI)*.09);this.fist.scale.setScalar(C.scale*(.26+.74*assembly));
    this.fist.visible=t<0;this.shards.forEach(m=>m.visible=t>=0);this.stone.uniforms.uRockAlpha.value=1-ease(Math.max(0,t-.7)/1.1);this.stone.uniforms.uRockTime.value=this.age;
    if(!this.impacted&&t>=0){this.impacted=true;this.shardOrigin.copy(this.localTarget);this.ctx.cameraFeedback?.(.065,.15);
      this.ctx.water?.addRipple({position:this.target,strength:1.4,duration:1.8,waveSpeed:5.8,radius:1,displacementScale:1.1,attenuation:.04},this);
      this.ctx.water?.addRipple({position:this.target,strength:.55,duration:1.4,waveSpeed:3.2,radius:1.7},this);}
    const counts=this.plateCounts;counts.fill(0);const surface=(this.ctx.water?.getSurfaceHeight(this.root.position.x,this.root.position.z)??0)-this.root.position.y;
    for(let i=0;i<FIST_PLATES.length;i++){
      const plate=FIST_PLATES[i],variant=i%3,a=i*2.399;
      this.temp.position.set(Math.cos(a)*2,(surface+.04-this.fist.position.y)/this.fist.scale.y,Math.sin(a)*1.4).lerp(this.scratch.set(...plate.position),assembly);
      this.temp.rotation.set((1-assembly)*(seed(i)*4-2),0,plate.bank+(1-assembly)*a);
      this.temp.scale.set(...plate.scale);this.temp.scale.multiplyScalar(.35+.65*assembly);this.temp.updateMatrix();this.plates[variant].setMatrixAt(counts[variant]++,this.temp.matrix);
    }
    this.plates.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;});
    const debris=TITAN_BUDGETS[this.tier].fragments,shardCounts=this.shardCounts;shardCounts.fill(0);
    if(t>=0)for(let i=0;i<debris;i++){
      const a=seed(i*3)*Math.PI*2,velocity=C.fragmentSpeed*(.35+seed(i*3+1)),drag=(1-Math.exp(-Math.max(0,t)*1.8))/1.8;
      this.temp.position.copy(this.shardOrigin).add(this.scratch.set(Math.cos(a)*velocity*drag,(2+seed(i*5)*6)*t-7*t*t,Math.sin(a)*velocity*drag-velocity*drag*.45));
      this.temp.rotation.set(i+t*(seed(i)*7-3),i*.7+t*2, i*.3-t*3);this.temp.scale.setScalar((.13+seed(i*7)*.48)*(1-ease(Math.max(0,t-.9)/.9)));this.temp.scale.y*=1.45;this.temp.updateMatrix();this.shards[i%3].setMatrixAt(shardCounts[i%3]++,this.temp.matrix);
    }
    this.shards.forEach((m,i)=>{m.count=shardCounts[i];m.instanceMatrix.needsUpdate=true;});
    this.dust.update(this.age,t,this.length,this.particleCount,ease(this.age/.2)*(1-ease(Math.max(0,t)/C.aftermath)));
    this.root.userData.phase=this.age<.22?'gather':this.age<C.charge?'assemble':t<0?'punch':t<.3?'impact':'collapse';this.root.userData.contacts=this.impacted?1:0;return true;
  }
  dispose():void{if(!this.active)return;this.active=false;this.unsubscribe?.();this.unsubscribe=undefined;this.ctx.water?.removeOwner(this);this.root.removeFromParent();this.releaseLease?.();this.releaseLease=undefined;}
  destroy():void{this.dispose();[...this.plates,...this.shards].forEach(m=>m.dispose());this.rocks.forEach(g=>g.dispose());this.stone.material.dispose();this.dust.dispose();}
}
